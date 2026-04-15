/**
 * Core domain types for Warframe items.
 * These types are derived from the @wfcd/items dataset (generated at build time).
 * Zero dependencies on React, Dexie, or any adapter.
 */

/** Canonical item categories as defined by @wfcd/items */
export type ItemCategory =
  | 'Arcanes'
  | 'Arch-Gun'
  | 'Arch-Melee'
  | 'Archwing'
  | 'Enemy'
  | 'Fish'
  | 'Gear'
  | 'Glyphs'
  | 'Melee'
  | 'Misc'
  | 'Mods'
  | 'Node'
  | 'Pets'
  | 'Primary'
  | 'Quests'
  | 'Railjack'
  | 'Relics'
  | 'Resources'
  | 'Secondary'
  | 'Sentinels'
  | 'Sigils'
  | 'Skins'
  | 'Warframes'
  | (string & {}); // allow unknown future categories

/** Slim item record stored in the generated items-map.json */
export interface WarframeItem {
  /** Canonical item ID, e.g. "/Lotus/Powersuits/Ninja/Ninja" */
  uniqueName: string;
  /** Display name, e.g. "Ash" */
  name: string;
  /** Item category, e.g. "Warframes" */
  category: ItemCategory;
  /** CDN filename, e.g. "ash-f2c6f3ab3f.png". Used to build the icon URL. */
  imageName: string;
}
