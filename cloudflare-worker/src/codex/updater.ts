// ---------------------------------------------------------------------------
// Codex updater — fires every 5 minutes via cron heartbeat.
//
// Smart sync state machine — actual syncs are infrequent:
//
//   normal   → sync every 24h (baseline; static data rarely changes)
//   patch    → sync every 6h for ~48h when new items are detected post-patch
//   hotfix   → sync every 6h for ~12h when data changed but no new items
//   retry    → sync every 6min, up to 3 attempts after any failure
//
// State transitions:
//   normal  + success, no version change  → normal
//   normal  + success, items increased    → patch  (PATCH_SYNCS remaining)
//   normal  + success, version changed    → hotfix (HOTFIX_SYNCS remaining)
//   patch   + success                     → patch (syncsLeft-1) or normal
//   hotfix  + success                     → hotfix(syncsLeft-1) or normal
//   any     + failure                     → retry  (retryCount+1)
//   retry   + failure ≥ MAX_RETRIES       → normal (reset, wait 24h)
//   retry   + success, aggressiveSyncsLeft > 0 → patch (resume)
//   retry   + success, aggressiveSyncsLeft = 0 → detect mode as normal does
//
// KV TTL is 48h — covers the 24h normal cycle with plenty of buffer.
// ---------------------------------------------------------------------------

import type { Env, SyncMetadata, DataSource, TennoplanItem, CodexSyncMode } from '../types';
import { config } from '../config';
import { logger } from '../logger';
import { writeCodex, getCodexMeta, kvPutJson } from '../storage/kv';
import { makeEtag, makeVersion } from '../storage/metadata';

import { fetchAllCodexSources } from './fetcher';
import { parseCodex } from './parser';
import { buildCodex } from './builder';
import { enrichCodex } from './enricher';
import { normalizeCodex } from './normalizer';
import { validateCodex } from './validator';

const log  = (msg: string, data?: unknown) => logger.info ('codex-updater', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn ('codex-updater', msg, data);
const fail = (msg: string, data?: unknown) => logger.error('codex-updater', msg, data);

// ─── Timing constants ─────────────────────────────────────────────────────────

const NORMAL_INTERVAL_MS     = 24 * 60 * 60 * 1000;  // 24h
const AGGRESSIVE_INTERVAL_MS =  6 * 60 * 60 * 1000;  // 6h
const RETRY_INTERVAL_MS      =  6 * 60 * 1000;        // 6min
const MAX_RETRIES             = 3;
const PATCH_SYNCS             = 8;   // 8 × 6h ≈ 48h of frequent syncing post-patch
const HOTFIX_SYNCS            = 2;   // 2 × 6h ≈ 12h post-hotfix

// ─── Top-level entry point ────────────────────────────────────────────────────

export async function runCodexUpdate(env: Env): Promise<void> {
  const meta = await getCodexMeta(env);
  const now  = Date.now();
  const mode: CodexSyncMode = meta?.syncMode ?? 'normal';

  if (!shouldSync(meta, mode, now)) {
    log('heartbeat — not due', {
      mode,
      nextInMs: nextRunMs(meta, mode, now),
    });
    return;
  }

  const started = Date.now();
  log('starting codex sync', { mode, retryCount: meta?.retryCount ?? 0 });

  try {
    // ── 1. FETCH ──
    const tFetch = Date.now();
    const blobs = await fetchAllCodexSources();
    log('fetch complete', { ms: Date.now() - tFetch, dropsSource: blobs.dropsSource ?? 'unavailable' });

    // ── 2. PARSE ──
    const tParse = Date.now();
    const parsed = parseCodex(blobs);
    log('parse complete', {
      ms: Date.now() - tParse,
      totalItems: parsed.stats.totalItems,
      perCategory: parsed.stats.perCategory,
      drops: parsed.stats.totalDrops,
    });

    // ── 3. BUILD ──
    const tBuild = Date.now();
    const built = buildCodex(parsed);
    log('build complete', {
      ms: Date.now() - tBuild,
      items: built.stats.totalItems,
      withDrops: built.stats.itemsWithDrops,
    });

    // ── 4. ENRICH ──
    const tEnrich = Date.now();
    const enriched = enrichCodex(built, parsed);
    log('enrich complete', {
      ms: Date.now() - tEnrich,
      withIcons: enriched.stats.itemsWithIcons,
      withBestFarms: enriched.stats.itemsWithBestFarms,
      primeVaulted: enriched.stats.primeItemsVaulted,
    });

    // ── 5. NORMALIZE ──
    // WFCD-only pipeline — always 'wfcd' source, drops absence doesn't change attribution.
    const source: DataSource = 'wfcd';
    const version = makeVersion(source);
    const generatedAt = Date.now();

    const tNorm = Date.now();
    const normalized = normalizeCodex(enriched, { version, generatedAt, source });
    log('normalize complete', { ms: Date.now() - tNorm });

    // ── 6. VALIDATE ──
    const tValidate = Date.now();
    const validation = validateCodex(normalized);
    log('validate complete', {
      ms: Date.now() - tValidate,
      accepted: validation.report.acceptedCount,
      rejected: validation.report.rejectedCount,
      quality: validation.report.quality,
      fatal: validation.report.fatal,
    });

    if (validation.report.fatal) {
      fail('codex validation FATAL — aborting commit', { notes: validation.report.notes });
      await handleFailure(env, meta, `validation fatal: ${validation.report.notes.join('; ')}`);
      return;
    }

    // ── 7. WRITE TO KV ──
    const tWrite = Date.now();
    const blob = JSON.stringify(validation.items);
    const etag = await makeEtag(blob);

    const nextMode = determineNextMode(meta, etag, validation.items.length);

    if (nextMode.mode === 'patch') {
      log('patch detected — entering aggressive sync mode', {
        newItemCount: validation.items.length,
        prevItemCount: meta?.itemCount,
        syncsLeft: nextMode.aggressiveSyncsLeft,
      });
    } else if (nextMode.mode === 'hotfix') {
      log('hotfix detected — entering short aggressive sync mode', {
        syncsLeft: nextMode.aggressiveSyncsLeft,
      });
    }

    const newMeta: SyncMetadata = {
      lastSync:   generatedAt,
      etag,
      version,
      source,
      quality:    validation.report.quality,
      errorCount: 0,
      itemCount:  validation.items.length,
      syncMode:   nextMode.mode,
      retryCount: 0,
      aggressiveSyncsLeft: nextMode.aggressiveSyncsLeft,
    };

    await writeCodex(env, blob, newMeta);
    log('codex committed to KV', {
      ms: Date.now() - tWrite,
      bytes: blob.length,
      itemCount: newMeta.itemCount,
    });

    log('codex update success', {
      totalMs: Date.now() - started,
      itemCount: newMeta.itemCount,
      source,
      quality: newMeta.quality,
      nextMode: nextMode.mode,
      aggressiveSyncsLeft: nextMode.aggressiveSyncsLeft,
    });
  } catch (e) {
    fail('codex update failed', { error: errMsg(e), totalMs: Date.now() - started });
    await handleFailure(env, meta, errMsg(e));
  }
}

// ─── Gate: should we sync on this heartbeat tick? ────────────────────────────

function shouldSync(meta: SyncMetadata | null, mode: CodexSyncMode, now: number): boolean {
  if (!meta) return true; // cold start — always run immediately

  switch (mode) {
    case 'retry': {
      const retries = meta.retryCount ?? 0;
      if (retries >= MAX_RETRIES) return false; // exhausted — wait for normal reset
      return (now - (meta.lastRetryAt ?? 0)) >= RETRY_INTERVAL_MS;
    }
    case 'patch':
    case 'hotfix':
      return (now - meta.lastSync) >= AGGRESSIVE_INTERVAL_MS;
    case 'normal':
    default:
      return (now - meta.lastSync) >= NORMAL_INTERVAL_MS;
  }
}

function nextRunMs(meta: SyncMetadata | null, mode: CodexSyncMode, now: number): number {
  if (!meta) return 0;
  switch (mode) {
    case 'retry':    return RETRY_INTERVAL_MS      - (now - (meta.lastRetryAt ?? 0));
    case 'patch':
    case 'hotfix':   return AGGRESSIVE_INTERVAL_MS - (now - meta.lastSync);
    default:         return NORMAL_INTERVAL_MS     - (now - meta.lastSync);
  }
}

// ─── State machine: determine next mode after a successful sync ───────────────

function determineNextMode(
  meta: SyncMetadata | null,
  newEtag: string,
  newItemCount: number,
): { mode: CodexSyncMode; aggressiveSyncsLeft: number } {
  const currentMode   = meta?.syncMode ?? 'normal';
  const savedSyncs    = meta?.aggressiveSyncsLeft ?? 0;

  // Returning from a retry that had saved aggressive syncs — resume the cycle
  if (currentMode === 'retry' && savedSyncs > 0) {
    const remaining = savedSyncs - 1;
    return remaining > 0
      ? { mode: 'patch', aggressiveSyncsLeft: remaining }
      : { mode: 'normal', aggressiveSyncsLeft: 0 };
  }

  // Continuing an active patch or hotfix countdown
  if (currentMode === 'patch' || currentMode === 'hotfix') {
    const remaining = savedSyncs - 1;
    return remaining > 0
      ? { mode: currentMode, aggressiveSyncsLeft: remaining }
      : { mode: 'normal', aggressiveSyncsLeft: 0 };
  }

  // Normal or retry-with-no-saved-syncs — detect version changes
  const versionChanged = meta != null && newEtag !== meta.etag;
  const itemsIncreased = (meta?.itemCount ?? 0) < newItemCount;

  if (versionChanged && itemsIncreased) {
    return { mode: 'patch',  aggressiveSyncsLeft: PATCH_SYNCS };
  }
  if (versionChanged) {
    return { mode: 'hotfix', aggressiveSyncsLeft: HOTFIX_SYNCS };
  }
  return { mode: 'normal', aggressiveSyncsLeft: 0 };
}

// ─── Failure handler ──────────────────────────────────────────────────────────

async function handleFailure(env: Env, meta: SyncMetadata | null, errorText: string): Promise<void> {
  const retryCount = (meta?.retryCount ?? 0) + 1;
  const exhausted  = retryCount >= MAX_RETRIES;

  const updated: SyncMetadata = meta
    ? {
        ...meta,
        errorCount:          meta.errorCount + 1,
        lastError:           errorText.slice(0, 200),
        syncMode:            exhausted ? 'normal' : 'retry',
        retryCount:          exhausted ? 0 : retryCount,
        lastRetryAt:         Date.now(),
        // Preserve aggressiveSyncsLeft so we can resume after retries
        aggressiveSyncsLeft: exhausted ? 0 : (meta.aggressiveSyncsLeft ?? 0),
      }
    : {
        lastSync:            0,
        etag:                '"none"',
        version:             'never-synced',
        source:              'enriched',
        quality:             'low',
        errorCount:          1,
        lastError:           errorText.slice(0, 200),
        itemCount:           0,
        syncMode:            'retry',
        retryCount:          1,
        lastRetryAt:         Date.now(),
        aggressiveSyncsLeft: 0,
      };

  if (exhausted) {
    warn(`codex retry limit (${MAX_RETRIES}) reached — reverting to normal 24h schedule`);
  } else {
    warn(`codex sync failed — retry ${retryCount}/${MAX_RETRIES} in ${RETRY_INTERVAL_MS / 60_000}min`);
  }

  await kvPutJson(env, config.kv.codex.metadata, updated);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
