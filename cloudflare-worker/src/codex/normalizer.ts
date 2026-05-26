// ---------------------------------------------------------------------------
// Codex normalizer — finalize EnrichedItem[] into TennoplanItem[].
//
// At this point the heavy work is done: enricher has resolved icons, drop
// locations, bestFarms, relic rewards, vaulted flags, etc. The normalizer's
// job is the last-mile mechanical pass:
//
//   1. Strip pipeline-internal fields (`_qualityHints`)
//   2. Stamp every item with codex-wide metadata (dataVersion, lastUpdated)
//   3. Pick a per-item `source` attribution based on what data flowed in:
//        • drops attached + calamity row     → 'enriched'
//        • calamity row only (no WFCD drops) → 'calamity-plus'
//        • degraded rows (placeholder)       → 'wfcd' or 'official' (rare)
//   4. Set a per-item `quality` hint from the hint count:
//        • 0 hints                           → 'high'
//        • 1–2 hints                         → 'medium'
//        • 3+ hints                          → 'low'
//
// Validator runs after normalize and decides whether to keep, drop, or warn.
// We don't filter here — the normalizer ALWAYS produces one TennoplanItem
// per EnrichedItem so input/output cardinality is predictable.
// ---------------------------------------------------------------------------

import { logger } from '../logger';
import type { TennoplanItem, DataSource, DataQuality } from '../types';
import type { EnrichedCodex, EnrichedItem } from './enricher';

const log = (msg: string, data?: unknown) => logger.info('codex-normalizer', msg, data);

// ─── Public types ─────────────────────────────────────────────────────────────

export interface NormalizedCodex {
  items:        TennoplanItem[];
  generatedAt:  number;
  version:      string;
  /** Aggregate quality hint distribution carried over from the enricher. */
  hintCounts:   Record<string, number>;
}

export interface NormalizeOptions {
  /** Codex version string, e.g. "calamity-20260430". Stamped on every item. */
  version: string;
  /** Unix ms. Stamped on every item as `lastUpdated`. Defaults to Date.now(). */
  generatedAt?: number;
  /** Default upstream source attribution. Items with degraded data are
   *  downgraded individually. */
  source?: DataSource;
}

// ─── Top-level entry point ────────────────────────────────────────────────────

export function normalizeCodex(enriched: EnrichedCodex, opts: NormalizeOptions): NormalizedCodex {
  const t0 = Date.now();
  const generatedAt = opts.generatedAt ?? Date.now();
  const defaultSource = opts.source ?? 'enriched';

  const items: TennoplanItem[] = enriched.items.map(item =>
    finalize(item, opts.version, generatedAt, defaultSource),
  );

  log('normalized codex', {
    ms:    Date.now() - t0,
    items: items.length,
    version: opts.version,
  });

  return {
    items,
    generatedAt,
    version: opts.version,
    hintCounts: enriched.stats.qualityHintCounts,
  };
}

// ─── Per-item finalize ────────────────────────────────────────────────────────

function finalize(
  e: EnrichedItem,
  version: string,
  lastUpdated: number,
  defaultSource: DataSource,
): TennoplanItem {
  const hints = e._qualityHints ?? [];

  // Per-item source. If the item has drops, WFCD contributed; otherwise it
  // is calamity-only. Items missing both icon AND drops are downgraded.
  const source: DataSource = pickSource(e, defaultSource);
  const quality: DataQuality = pickQuality(hints.length);

  // Strip pipeline-internal hints. Spread first so we don't carry the
  // underscore-prefixed field through to KV.
  const out: TennoplanItem = {
    ...stripInternals(e),
    dataVersion: version,
    lastUpdated,
    source,
    quality,
  };

  return out;
}

function stripInternals(e: EnrichedItem): Omit<EnrichedItem, '_qualityHints'> {
  // Object spread strips the `_qualityHints` reference cleanly. We rebuild
  // explicitly rather than relying on a runtime delete to keep the output
  // shape predictable for KV's JSON.stringify pass.
  const { _qualityHints, ...rest } = e;
  void _qualityHints;
  return rest;
}

function pickSource(_e: EnrichedItem, defaultSource: DataSource): DataSource {
  // WFCD-only pipeline (post-2026-05-26 refactor) — every item carries the
  // same source attribution. Drops absence no longer signals a degraded path.
  return defaultSource;
}

function pickQuality(hintCount: number): DataQuality {
  if (hintCount === 0) return 'high';
  if (hintCount <= 2)  return 'medium';
  return 'low';
}
