/**
 * Items adapter — wraps the generated items-map.json.
 *
 * The map is produced at build time by `node scripts/generate-items-map.mjs`
 * using @wfcd/items (Node.js-only). The browser imports the resulting static
 * JSON: zero network calls, zero Node.js dependencies, works fully offline.
 *
 * All lookups are O(1) by uniqueName or O(n) by name/category (iterated once,
 * results cached in Maps for repeated calls).
 */

import type { ItemCategory, WarframeItem } from '@/core/domain/items';
import rawMap from '@/lib/icons/items-map.json';

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
