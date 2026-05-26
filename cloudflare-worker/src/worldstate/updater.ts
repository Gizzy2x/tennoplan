// ---------------------------------------------------------------------------
// Worldstate updater — runs every minute via cron.
//
// Strategy:
//   1. Try OFFICIAL  (api.warframe.com)        + worldstate-parser
//   2. On failure → try COMMUNITY (warframestat.us, already parsed)
//   3. On both failures → leave KV alone, increment errorCount in metadata
//
// "Never overwrite good data with bad" — a fetch/parse failure leaves the
// existing worldstate:current intact. Stale data is better than no data.
// ---------------------------------------------------------------------------

import type { Env, ParsedWorldstate, SyncMetadata, DataSource } from '../types';
import { config } from '../config';
import { logger } from '../logger';
import { fetchWithRetry } from '../utils/http';
import { writeWorldstate, getWorldstateMeta, kvPutJson } from '../storage/kv';
import { makeEtag, makeVersion } from '../storage/metadata';
import { parseFromOfficial, parseFromCommunity } from './parser';

const log = (msg: string, data?: unknown) => logger.info('worldstate-updater', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn('worldstate-updater', msg, data);
const fail = (msg: string, data?: unknown) => logger.error('worldstate-updater', msg, data);

export async function runWorldstateUpdate(env: Env): Promise<void> {
  const started = Date.now();

  // ── Try OFFICIAL ──
  try {
    const ws = await tryOfficial();
    await commit(env, ws, 'official');
    log('updated from official', { ms: Date.now() - started });
    return;
  } catch (e) {
    warn('official source failed', { error: errMsg(e) });
  }

  // ── Fallback: COMMUNITY ──
  try {
    const ws = await tryCommunity();
    await commit(env, ws, 'warframestat');
    log('updated from community', { ms: Date.now() - started });
    return;
  } catch (e) {
    fail('both sources failed — leaving KV intact', { error: errMsg(e) });
  }

  // ── Both failed: bump errorCount in metadata, leave current/previous alone ──
  const existing = await getWorldstateMeta(env);
  if (existing) {
    const updated: SyncMetadata = {
      ...existing,
      errorCount: existing.errorCount + 1,
      lastError:  'Both upstream sources failed',
    };
    await kvPutJson(env, config.kv.worldstate.metadata, updated);
  }
}

// ─── Source attempts ──────────────────────────────────────────────────────────

async function tryOfficial(): Promise<ParsedWorldstate> {
  const res = await fetchWithRetry(config.worldstate.officialUrl, {
    timeoutMs: config.worldstate.fetchTimeoutMs,
    retries:   1,
  });
  return parseFromOfficial(res.text);
}

async function tryCommunity(): Promise<ParsedWorldstate> {
  const res = await fetchWithRetry(config.worldstate.primaryUrl, {
    timeoutMs: config.worldstate.fetchTimeoutMs,
    retries:   1,
  });
  return parseFromCommunity(res.text);
}

// ─── Commit to KV ─────────────────────────────────────────────────────────────

async function commit(env: Env, ws: ParsedWorldstate, source: DataSource): Promise<void> {
  const blob = JSON.stringify(ws);
  const etag = await makeEtag(blob);

  const meta: SyncMetadata = {
    lastSync:   Date.now(),
    etag,
    version:    makeVersion(source),
    source,
    quality:    'high',
    errorCount: 0,
  };

  await writeWorldstate(env, blob, meta);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
