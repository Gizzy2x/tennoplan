/**
 * ⚠ FALLBACK ONLY — frozen bootstrap / long-tail data, NO LONGER REGENERATED.
 *
 * The codex (`db.tennoplanItems`, resolved via `codexCatalog`) is the
 * authoritative, current item source. This adapter wraps a FROZEN snapshot
 * (`fallback-items-map.json`) kept ONLY because it (a) gives instant icons on
 * first launch before the codex syncs, and (b) covers the cosmetic long tail
 * (Skins/Glyphs/Sigils/…) the codex doesn't carry. It is intentionally never
 * refreshed (the old `npm run generate-items` regeneration was retired in S1a).
 *
 * Do NOT add new consumers — resolve through `codexCatalog`, which already uses
 * this as its last-resort fallback. The only intended callers are `codexCatalog`
 * and the bulk icon pre-cache (`startupIconSync`).
 *
 * All lookups are O(1) by uniqueName or O(n) by name/category (iterated once,
 * results cached in Maps for repeated calls).
 */

import type { ItemCategory, WarframeItem } from '@/core/domain/items';
import rawMap from '@/lib/icons/fallback-items-map.json';

// The generated JSON is keyed by uniqueName — attach it as the key so
// WarframeItem is fully self-contained.
type RawEntry = { name: string; category: string; imageName: string };
const RAW = rawMap as Record<string, RawEntry>;

// Build a WarframeItem[] once and cache it.
let _items: WarframeItem[] | null = null;

function getItems(): WarframeItem[] {
  if (_items) return _items;
  _items = Object.entries(RAW).map(([uniqueName, entry]) => ({
    uniqueName,
    name: entry.name,
    category: entry.category as ItemCategory,
    imageName: entry.imageName,
  }));
  return _items;
}

// Secondary index: name (lowercase) → WarframeItem
let _byName: Map<string, WarframeItem> | null = null;

function getByNameIndex(): Map<string, WarframeItem> {
  if (_byName) return _byName;
  _byName = new Map(getItems().map((item) => [item.name.toLowerCase(), item]));
  return _byName;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Returns every item in the database (~17k entries). */
export function getAllItems(): WarframeItem[] {
  return getItems();
}

/** Returns all items belonging to a given category. */
export function findByCategory(category: ItemCategory): WarframeItem[] {
  return getItems().filter((item) => item.category === category);
}

/**
 * Looks up an item by its canonical uniqueName.
 * Returns `undefined` if not found.
 */
export function findByUniqueName(uniqueName: string): WarframeItem | undefined {
  const entry = RAW[uniqueName];
  if (!entry) return undefined;
  return { uniqueName, name: entry.name, category: entry.category as ItemCategory, imageName: entry.imageName };
}

/**
 * Looks up an item by display name (case-insensitive, exact match).
 * For fuzzy/partial search use `searchByName`.
 */
export function findByName(name: string): WarframeItem | undefined {
  return getByNameIndex().get(name.toLowerCase());
}

/**
 * Returns all items whose name contains the query string (case-insensitive).
 * Optionally filter to a specific category.
 */
export function searchByName(query: string, category?: ItemCategory): WarframeItem[] {
  const q = query.toLowerCase();
  const source = category ? findByCategory(category) : getItems();
  return source.filter((item) => item.name.toLowerCase().includes(q));
}
