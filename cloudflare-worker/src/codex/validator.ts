// ---------------------------------------------------------------------------
// Codex validator — final go/no-go check on the normalized output.
//
// Two outputs:
//   1. items[]  — the input filtered to rows the frontend can safely render.
//                 Items missing a uniqueName, name, or category are removed.
//                 Items with empty iconUrl get a placeholder kept (so the
//                 frontend can still display them with /lotus-placeholder.svg).
//   2. report   — overall quality assessment (high / medium / low) plus
//                 specific failure counts. updater.ts uses this to decide
//                 whether to commit to KV or keep the previous codex.
//
// "Never overwrite good data with bad" — if the report flags FATAL gaps
// (no items at all, or quality === 'low' AND fewer than the minimum item
// count), updater.ts is expected to abort the commit.
// ---------------------------------------------------------------------------

import { logger } from '../logger';
import type { TennoplanItem, DataQuality } from '../types';
import type { NormalizedCodex } from './normalizer';

const log = (msg: string, data?: unknown) => logger.info('codex-validator', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn('codex-validator', msg, data);
const fail = (msg: string, data?: unknown) => logger.error('codex-validator', msg, data);

// ─── Tunables ─────────────────────────────────────────────────────────────────

/** Below this absolute count we refuse to ship — treat as upstream collapse. */
const MIN_TOTAL_ITEMS = 500;

/** Above this fraction of dropped rows, downgrade quality. */
const TOLERATED_DROP_RATIO = 0.05;

/** Below this fraction of items with icons, downgrade quality. */
const MIN_ICON_RATIO = 0.5;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ValidationReport {
  inputCount:         number;
  acceptedCount:      number;
  rejectedCount:      number;
  rejectReasons:      Record<string, number>;
  iconCoverage:       number;    // 0–1
  dropCoverage:       number;    // 0–1
  bestFarmsCoverage:  number;    // 0–1
  primeWithDucats:    number;
  fatal:              boolean;   // updater should NOT commit when true
  quality:            DataQuality;
  notes:              string[];
}

export interface ValidationResult {
  items:  TennoplanItem[];
  report: ValidationReport;
}

// ─── Top-level entry point ────────────────────────────────────────────────────

export function validateCodex(normalized: NormalizedCodex): ValidationResult {
  const t0 = Date.now();

  const accepted: TennoplanItem[] = [];
  const rejectReasons: Record<string, number> = {};

  for (const item of normalized.items) {
    const rejection = rejectReason(item);
    if (rejection) {
      rejectReasons[rejection] = (rejectReasons[rejection] ?? 0) + 1;
      continue;
    }
    accepted.push(item);
  }

  const report = scoreReport(normalized, accepted, rejectReasons);

  log('validated codex', {
    ms:           Date.now() - t0,
    input:        report.inputCount,
    accepted:     report.acceptedCount,
    rejected:     report.rejectedCount,
    quality:      report.quality,
    fatal:        report.fatal,
    iconCoverage: report.iconCoverage.toFixed(3),
    dropCoverage: report.dropCoverage.toFixed(3),
  });

  if (report.fatal) {
    fail('codex validation FATAL — updater should not commit', { reasons: report.notes });
  } else if (report.quality === 'low') {
    warn('codex quality LOW — committing but with degraded flag', { notes: report.notes });
  }

  return { items: accepted, report };
}

// ─── Per-item rejection ───────────────────────────────────────────────────────

function rejectReason(item: TennoplanItem): string | null {
  if (!item.uniqueName)                   return 'missing-uniqueName';
  if (!item.name)                         return 'missing-name';
  if (!item.category)                     return 'missing-category';
  // We DO accept rows with empty iconUrl — frontend has a placeholder. We
  // also DO accept rows with no drops/recipe — many items genuinely have
  // none (cosmetics, quest keys).
  return null;
}

// ─── Report scoring ───────────────────────────────────────────────────────────

function scoreReport(
  normalized: NormalizedCodex,
  accepted: readonly TennoplanItem[],
  rejectReasons: Record<string, number>,
): ValidationReport {
  const inputCount    = normalized.items.length;
  const acceptedCount = accepted.length;
  const rejectedCount = inputCount - acceptedCount;

  let withIcons     = 0;
  let withDrops     = 0;
  let withBestFarms = 0;
  let primeDucats   = 0;

  for (const item of accepted) {
    if (item.iconUrl)                  withIcons++;
    if (item.dropLocations.length > 0) withDrops++;
    if (item.bestFarms?.length)        withBestFarms++;
    if (item.ducatValue !== undefined) primeDucats++;
  }

  const iconCoverage      = acceptedCount > 0 ? withIcons     / acceptedCount : 0;
  const dropCoverage      = acceptedCount > 0 ? withDrops     / acceptedCount : 0;
  const bestFarmsCoverage = acceptedCount > 0 ? withBestFarms / acceptedCount : 0;
  const dropRatio         = inputCount    > 0 ? rejectedCount / inputCount    : 1;

  const notes: string[] = [];
  let fatal = false;
  let quality: DataQuality = 'high';

  if (acceptedCount === 0) {
    fatal = true;
    notes.push('no items accepted');
  }

  if (acceptedCount < MIN_TOTAL_ITEMS) {
    fatal = true;
    notes.push(`accepted item count ${acceptedCount} below minimum ${MIN_TOTAL_ITEMS}`);
  }

  if (dropRatio > TOLERATED_DROP_RATIO) {
    quality = downgrade(quality);
    notes.push(`reject ratio ${(dropRatio * 100).toFixed(1)}% exceeds tolerated ${(TOLERATED_DROP_RATIO * 100).toFixed(0)}%`);
  }

  if (iconCoverage < MIN_ICON_RATIO) {
    quality = downgrade(quality);
    notes.push(`icon coverage ${(iconCoverage * 100).toFixed(1)}% below minimum ${(MIN_ICON_RATIO * 100).toFixed(0)}%`);
  }

  // Drop coverage hint — if zero items have drops, WFCD likely failed
  // upstream. Not fatal (calamity-only is still useful) but flag it.
  if (acceptedCount > 0 && dropCoverage === 0) {
    quality = downgrade(quality);
    notes.push('zero items with drops — WFCD pipeline likely degraded');
  }

  // Per-item quality drag: if the average item-quality from the normalizer
  // skews low, drag the codex score with it. Hint count > 1 per item is a
  // strong signal.
  const totalHints = sumHints(normalized.hintCounts);
  if (acceptedCount > 0 && totalHints / acceptedCount > 1.0) {
    quality = downgrade(quality);
    notes.push(`avg quality hints/item ${(totalHints / acceptedCount).toFixed(2)} > 1.0`);
  }

  return {
    inputCount,
    acceptedCount,
    rejectedCount,
    rejectReasons,
    iconCoverage,
    dropCoverage,
    bestFarmsCoverage,
    primeWithDucats: primeDucats,
    fatal,
    quality,
    notes,
  };
}

function downgrade(q: DataQuality): DataQuality {
  if (q === 'high')   return 'medium';
  if (q === 'medium') return 'low';
  return 'low';
}

function sumHints(counts: Record<string, number>): number {
  let total = 0;
  for (const v of Object.values(counts)) total += v;
  return total;
}
