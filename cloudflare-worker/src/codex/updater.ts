// ---------------------------------------------------------------------------
// Codex updater — runs every 6 hours via cron.
//
// Pipeline:
//   fetcher → parser → merger → enricher → normalizer → validator → KV
//
// Each step is wrapped so a failure at any layer logs cleanly and bumps
// errorCount in metadata WITHOUT overwriting the previous codex. This is
// the "never overwrite good data with bad" rule that the worldstate
// updater follows — the codex equivalent.
//
// Validation gate:
//   • report.fatal === true   → ABORT, leave KV current/previous intact
//   • report.fatal === false  → COMMIT, with the report's quality grade
//                               carried into metadata.quality
//
// Source attribution:
//   • blobs.dropsSource set   → 'enriched'        (calamity + WFCD)
//   • blobs.dropsSource null  → 'calamity-plus'   (WFCD failed, calamity OK)
//
// Storage shape:
//   The blob written to codex:current is a plain TennoplanItem[] JSON,
//   not a CodexBundle wrapper. version / itemCount / generatedAt all live
//   in SyncMetadata. The handler can then string-concat the response
//   without re-parsing the multi-MB body.
// ---------------------------------------------------------------------------

import type { Env, SyncMetadata, DataSource, TennoplanItem } from '../types';
import { config } from '../config';
import { logger } from '../logger';
import { writeCodex, getCodexMeta, kvPutJson } from '../storage/kv';
import { makeEtag, makeVersion } from '../storage/metadata';

import { fetchAllCodexSources } from './fetcher';
import { parseCodex } from './parser';
import { mergeCodex } from './merger';
import { enrichCodex } from './enricher';
import { normalizeCodex } from './normalizer';
import { validateCodex } from './validator';

const log  = (msg: string, data?: unknown) => logger.info ('codex-updater', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn ('codex-updater', msg, data);
const fail = (msg: string, data?: unknown) => logger.error('codex-updater', msg, data);

// ─── Top-level entry point ────────────────────────────────────────────────────

export async function runCodexUpdate(env: Env): Promise<void> {
  const started = Date.now();

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
      calamityRows: parsed.stats.totalCalamityRows,
      drops: parsed.stats.totalDrops,
    });

    // ── 3. MERGE ──
    const tMerge = Date.now();
    const merged = mergeCodex(parsed);
    log('merge complete', {
      ms: Date.now() - tMerge,
      items: merged.stats.totalItems,
      withDrops: merged.stats.itemsWithDrops,
    });

    // ── 4. ENRICH ──
    const tEnrich = Date.now();
    const enriched = enrichCodex(merged, parsed);
    log('enrich complete', {
      ms: Date.now() - tEnrich,
      withIcons: enriched.stats.itemsWithIcons,
      withBestFarms: enriched.stats.itemsWithBestFarms,
      primeVaulted: enriched.stats.primeItemsVaulted,
    });

    // ── 5. NORMALIZE ──
    const source: DataSource = blobs.dropsSource ? 'enriched' : 'calamity-plus';
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

    // ── 7. GATE ──
    if (validation.report.fatal) {
      fail('codex validation FATAL — aborting commit', { notes: validation.report.notes });
      await bumpError(env, `validation fatal: ${validation.report.notes.join('; ')}`);
      return;
    }

    // ── 8. WRITE TO KV ──
    const tWrite = Date.now();
    const blob = JSON.stringify(validation.items);
    const etag = await makeEtag(blob);

    const meta: SyncMetadata = {
      lastSync:   generatedAt,
      etag,
      version,
      source,
      quality:    validation.report.quality,
      errorCount: 0,
      itemCount:  validation.items.length,
    };

    await writeCodex(env, blob, meta);
    log('codex committed to KV', {
      ms: Date.now() - tWrite,
      bytes: blob.length,
      itemCount: meta.itemCount,
    });

    log('codex update success', {
      totalMs: Date.now() - started,
      itemCount: meta.itemCount,
      source,
      quality: meta.quality,
    });
  } catch (e) {
    fail('codex update failed', { error: errMsg(e), totalMs: Date.now() - started });
    await bumpError(env, errMsg(e));
  }
}

// ─── Error tracking ───────────────────────────────────────────────────────────

/**
 * Increment errorCount + record lastError on the codex metadata record.
 * Never touches codex:current or codex:previous — those represent the last
 * good state and stay intact regardless.
 *
 * If no metadata exists yet (cold worker), we synthesize a minimal record
 * so the health endpoint can still show a useful errorCount > 0.
 */
async function bumpError(env: Env, errorText: string): Promise<void> {
  const existing = await getCodexMeta(env);

  const updated: SyncMetadata = existing
    ? {
        ...existing,
        errorCount: existing.errorCount + 1,
        lastError:  errorText.slice(0, 200),
      }
    : {
        lastSync:   0,
        etag:       '"none"',
        version:    'never-synced',
        source:     'enriched',
        quality:    'low',
        errorCount: 1,
        lastError:  errorText.slice(0, 200),
        itemCount:  0,
      };

  if (updated.errorCount >= 3) {
    warn('codex error streak ≥ 3 — surface in /v1/health', { count: updated.errorCount });
  }

  await kvPutJson(env, config.kv.codex.metadata, updated);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
