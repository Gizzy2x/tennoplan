/**
 * consumerIndex — lazy reverse-join cache feeding ConsumersBlock.
 *
 * ConsumersBlock answers "what consumes this resource?" by walking
 * every item's `buildRequirements` looking for a match. The naive
 * implementation was a Dexie `.toArray()` (~8k rows) scan on every
 * resource page navigation — single-digit ms but multiplied by every
 * navigation, and growing linearly with the codex.
 *
 * This module builds the inverse index ONCE per codex sync:
 *
 *   { "Orokin Cell": [{ item: Ash, count: 1 }, { item: Saryn, count: 1 }, … ],
 *     "Plastids":    [{ item: Frost, count: 1 }, … ],
 *     … }
 *
 * Subsequent navigations are O(1) Map lookups. The cache invalidates
 * when the codex syncMetadata.lastSync changes, so a fresh codex blob
 * (every 6h via CI) triggers a single rebuild on next read.
 *
 * Not a Dexie multi-entry index because that requires a schema
 * migration + a derived array field on every row + a write-path
 * change in codexStore. This module-level cache covers the same need
 * without any of that surface — first hit pays the scan, every
 * navigation after is free until the next sync.
 */

import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';

export interface ResolvedConsumer {
  item:  TennoplanItem;
  count: number;
}

/**
 * Categories worth surfacing as "consumers" in the reverse-join.
 * Mirrors the set in ConsumersBlock — pure ingredient → ingredient
 * relationships ($ → $) don't add value, but crafted items do.
 */
const SURFACEABLE_CATEGORIES = new Set<TennoplanItem['category']>([
  'Warframe',
  'Weapon',
  'Companion',
  'Sentinel',
  'Blueprint',
  'Equipment',
  'Resource',
  'Key',
  'Arcane',
]);

type ConsumerIndex = Map<string, ResolvedConsumer[]>;

// Module-level cache. Resets when the codex sync timestamp changes.
let cachedIndex:     ConsumerIndex | null = null;
let cachedForSync:   number               = -1;
let pendingBuild:    Promise<ConsumerIndex> | null = null;

/**
 * Return consumers of `targetName`. Builds the inverse index lazily;
 * concurrent first-callers share the same in-flight promise so we
 * never run two scans in parallel.
 *
 * Pass the current codex `lastSync` timestamp so the cache can detect
 * a fresh blob and rebuild. -1 forces a rebuild (only used in tests).
 */
export async function getConsumersOf(
  targetName: string,
  syncedAt:   number,
): Promise<ResolvedConsumer[]> {
  if (!cachedIndex || cachedForSync !== syncedAt) {
    pendingBuild ??= buildIndex(syncedAt);
    cachedIndex     = await pendingBuild;
    cachedForSync   = syncedAt;
    pendingBuild    = null;
  }
  return cachedIndex.get(targetName) ?? [];
}

/**
 * Walk every item in Dexie once, accumulating an itemName → consumers
 * map. Skips items whose category isn't surfaceable and items with no
 * build requirements at all so the index stays tight.
 */
async function buildIndex(_syncedAt: number): Promise<ConsumerIndex> {
  const all   = await db.tennoplanItems.toArray();
  const index: ConsumerIndex = new Map();

  for (const item of all) {
    if (!SURFACEABLE_CATEGORIES.has(item.category)) continue;
    if (!item.buildRequirements?.length) continue;

    for (const req of item.buildRequirements) {
      if (req.count <= 0) continue;
      const arr = index.get(req.item);
      if (arr) {
        arr.push({ item, count: req.count });
      } else {
        index.set(req.item, [{ item, count: req.count }]);
      }
    }
  }

  return index;
}
