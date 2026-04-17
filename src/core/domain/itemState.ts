/**
 * ItemState — per-user overlay for an item in the Warframe catalogue.
 *
 * The catalogue itself (name, category, imageName) lives in the static
 * items-map.json at build time and is served via itemsAdapter. ItemState
 * stores ONLY dynamic/user-owned data. A missing row means "default state"
 * (owned = false, never touched), NOT "item does not exist".
 *
 * Pure domain type — no runtime dependencies.
 */

import type { WarframeItem } from './items';

export interface ItemState {
  /** Primary key — matches WarframeItem.uniqueName from itemsAdapter. */
  uniqueName: string;
  /** Whether the user owns this item (toggled manually or via EE.log scan). */
  owned: boolean;
  /** Millisecond timestamp of the last state change. Null means never set. */
  markedAt: number | null;
}

/**
 * EnrichedItem — static metadata merged with user state.
 * Never stored; always derived on read.
 */
export interface EnrichedItem extends WarframeItem {
  owned: boolean;
  markedAt: number | null;
}
