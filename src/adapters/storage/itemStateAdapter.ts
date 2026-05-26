/**
 * itemStateAdapter — bridges static item metadata (itemsAdapter) with the
 * per-user dynamic state stored in Dexie's `itemStates` table.
 *
 * Design:
 *   - itemsAdapter remains the single source of truth for immutable metadata
 *     (name, category, imageName). It is pure & synchronous.
 *   - Dexie only stores rows for items the user has actually touched.
 *     A missing row means "default state" (owned = false), not "unknown item".
 *   - getEnrichedItem() merges both so UI code can read a single object.
 *
 * This file is an ADAPTER (touches Dexie) — business logic consuming it
 * should still live in src/core/ and accept EnrichedItem as plain data.
 */

import { findByUniqueName } from '@/adapters/items/itemsAdapter';
import { db } from '@/adapters/storage/db';
import type { EnrichedItem, ItemState } from '@/core/domain/itemState';

// ─── Reads ───────────────────────────────────────────────────────────────────

/** Returns the stored state row for an item, or null if the user never touched it. */
export async function getItemState(uniqueName: string): Promise<ItemState | null> {
  const row = await db.itemStates.get(uniqueName);
  return row ?? null;
}

/**
 * Returns static metadata + user state merged in one shot.
 * Returns null only if the uniqueName is absent from the static catalogue.
 */
export async function getEnrichedItem(
  uniqueName: string,
): Promise<EnrichedItem | null> {
  const meta = findByUniqueName(uniqueName);
  if (!meta) return null;
  const state = await db.itemStates.get(uniqueName);
  return {
    ...meta,
    owned: state?.owned ?? false,
    markedAt: state?.markedAt ?? null,
  };
}

/**
 * Batch variant — avoids N round-trips when enriching a list of items
 * (e.g. a bounty rewards panel). Missing uniqueNames are skipped silently.
 */
export async function getEnrichedItems(
  uniqueNames: string[],
): Promise<EnrichedItem[]> {
  if (uniqueNames.length === 0) return [];
  const states = await db.itemStates.bulkGet(uniqueNames);
  const out: EnrichedItem[] = [];
  for (let i = 0; i < uniqueNames.length; i++) {
    const uniqueName = uniqueNames[i];
    if (!uniqueName) continue;
    const meta = findByUniqueName(uniqueName);
    if (!meta) continue;
    const state = states[i];
    out.push({
      ...meta,
      owned: state?.owned ?? false,
      markedAt: state?.markedAt ?? null,
    });
  }
  return out;
}

/**
 * Returns every uniqueName the user has flagged as owned.
 * Note: `owned` is not indexed (see db.ts for rationale), so this filters
 * in-memory — but the table is sparse, so n is small.
 */
export async function getOwnedUniqueNames(): Promise<string[]> {
  const rows = await db.itemStates.filter((r) => r.owned).toArray();
  return rows.map((r) => r.uniqueName);
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/** Set ownership for an item. Creates the row if it does not yet exist. */
export async function setOwned(uniqueName: string, owned: boolean): Promise<void> {
  await db.itemStates.put({
    uniqueName,
    owned,
    markedAt: Date.now(),
  });
}

/** Delete the user's state row — the item reverts to its default state. */
export async function clearState(uniqueName: string): Promise<void> {
  await db.itemStates.delete(uniqueName);
}
