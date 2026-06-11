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
  let communityErr = '';
  let officialErr  = '';
  let mirrorErr    = '';

  // ── 1. COMMUNITY (warframestat) — the only source reachable from Cloudflare.
  //    DE 403-blocks Cloudflare egress IPs on both official hosts (verified
  //    2026-06-02), so we lead with community and keep official as a fallback
  //    for the day DE unblocks (or we front it with a proxy). ──
  try {
    const ws = await tryCommunity();
    await commit(env, ws, 'warframestat');
    log('updated from community', { ms: Date.now() - started });
    return;
  } catch (e) {
    communityErr = errMsg(e);
    warn('community source failed', { error: communityErr });
  }

  // ── 2. OFFICIAL (api.warframe.com) — currently 403 from Cloudflare egress ──
  try {
    const ws = await tryOfficial(config.worldstate.officialUrl);
    await commit(env, ws, 'official');
    log('updated from official', { ms: Date.now() - started });
    return;
  } catch (e) {
    officialErr = errMsg(e);
    warn('official source failed', { error: officialErr });
  }

  // ── 3. OFFICIAL MIRROR (content.warframe.com) — different host, same blob ──
  try {
    const ws = await tryOfficial(config.worldstate.officialMirrorUrl);
    await commit(env, ws, 'official');
    log('updated from official mirror', { ms: Date.now() - started });
    return;
  } catch (e) {
    mirrorErr = errMsg(e);
    fail('all sources failed — leaving KV intact', { communityErr, officialErr, mirrorErr });
  }

  // ── All failed: bump errorCount, leave current/previous alone (the 24h TTL
  //    keeps the last-good snapshot serving). Record per-source errors so
  //    /v1/health shows exactly what broke. ──
  const existing = await getWorldstateMeta(env);
  if (existing) {
    const updated: SyncMetadata = {
      ...existing,
      errorCount: existing.errorCount + 1,
      lastError:  `official: ${officialErr || '—'} | mirror: ${mirrorErr || '—'} | community: ${communityErr || '—'}`.slice(0, 300),
    };
    await kvPutJson(env, config.kv.worldstate.metadata, updated);
  }
}

// ─── Source attempts ──────────────────────────────────────────────────────────

async function tryOfficial(url: string): Promise<ParsedWorldstate> {
  const res = await fetchWithRetry(url, {
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
