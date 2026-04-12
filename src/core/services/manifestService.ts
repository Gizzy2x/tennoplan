/**
 * Manifest Service — pure functions, zero side-effects, zero I/O.
 *
 * Responsibilities:
 *  - Transform raw WFCD All.json items into AssetRecords
 *  - Classify priority tier per item
 *  - Build an in-memory O(1) lookup Map
 */

import type { AssetPriority, AssetRecord } from '@/core/domain/assets';
import { CATEGORY_PRIORITY, CORE_IMAGE_NAMES } from '@/core/domain/assets';

// ─── CDN ─────────────────────────────────────────────────────────────────────

/**
 * Primary CDN for icon downloads.
 * warframestat.us mirrors the official WF CDN and is more reliable for CORS.
 */
const WFCD_CDN = 'https://cdn.warframestat.us/img';

/** Build the CDN URL (= Cache API key) for a given imageName filename. */
export function buildCacheKey(imageName: string): string {
  return `${WFCD_CDN}/${imageName}`;
}

// ─── Raw manifest shape ───────────────────────────────────────────────────────

/**
 * Minimal fields we extract from WFCD All.json.
 * The full array is ~30 MB; we discard everything we don't need immediately.
 */
export interface RawManifestItem {
  uniqueName: string;
  name: string;
  imageName?: string;
  category?: string;
  rarity?: string;
}

// ─── Classification ───────────────────────────────────────────────────────────

/**
 * Determine the download priority for an item.
 *
 * Matching order:
 *   1. imageName basename is in CORE_IMAGE_NAMES → tier1
 *   2. category has an explicit mapping         → that tier
 *   3. default                                   → tier3
 */
export function classifyPriority(imageName: string, category: string): AssetPriority {
  if (!imageName) return 'tier3';
  // Normalise: strip any path prefix, lowercase
  const base = imageName.split('/').pop()?.toLowerCase() ?? imageName.toLowerCase();
  if (CORE_IMAGE_NAMES.has(base)) return 'tier1';
  return CATEGORY_PRIORITY[category] ?? 'tier3';
}

// ─── Transform ────────────────────────────────────────────────────────────────

/**
 * Map a raw manifest entry → AssetRecord.
 * Returns null for entries without a valid imageName (not displayable).
 */
export function toAssetRecord(raw: RawManifestItem): AssetRecord | null {
  if (!raw.uniqueName || !raw.imageName) return null;

  const category = raw.category ?? 'Misc';
  const priority = classifyPriority(raw.imageName, category);

  return {
    uniqueName: raw.uniqueName,
    imageName: raw.imageName,
    category,
    rarity: raw.rarity,
    displayName: raw.name,
    status: 'pending',
    cacheKey: buildCacheKey(raw.imageName),
    priority,
  };
}

// ─── Bulk processing ──────────────────────────────────────────────────────────

export interface ProcessedManifest {
  /** O(1) lookup by uniqueName. */
  lookup: Map<string, AssetRecord>;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  skippedCount: number;
}

/**
 * Transform the full raw manifest array into a lookup Map.
 * Called once after a fresh 200 response from the manifest endpoint.
 */
export function processManifest(items: RawManifestItem[]): ProcessedManifest {
  const lookup = new Map<string, AssetRecord>();
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  let skippedCount = 0;

  for (const raw of items) {
    const record = toAssetRecord(raw);
    if (!record) {
      skippedCount++;
      continue;
    }
    lookup.set(record.uniqueName, record);
    if (record.priority === 'tier1') tier1Count++;
    else if (record.priority === 'tier2') tier2Count++;
    else tier3Count++;
  }

  return { lookup, tier1Count, tier2Count, tier3Count, skippedCount };
}

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Filter a lookup Map to records of a specific priority.
 * Optionally exclude statuses that don't need downloading.
 */
export function filterByPriority(
  lookup: Map<string, AssetRecord>,
  priority: AssetPriority,
  excludeStatuses: ReadonlySet<AssetRecord['status']> = new Set(['cached', 'not-found']),
): AssetRecord[] {
  const results: AssetRecord[] = [];
  for (const record of lookup.values()) {
    if (record.priority === priority && !excludeStatuses.has(record.status)) {
      results.push(record);
    }
  }
  return results;
}
