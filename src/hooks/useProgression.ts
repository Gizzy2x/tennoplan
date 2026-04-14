/**
 * useProgression — reactive hook for the Ascension Registry.
 *
 * Uses useLiveQuery so the UI re-renders automatically whenever MasteryService
 * writes to db.progression — no polling, no manual invalidation.
 *
 * Single Pipe guarantee: this hook is READ-ONLY.
 * All writes go through MasteryService.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { ProgressionRecord } from '@/core/domain/progression';
import { ProgressionStatus } from '@/core/domain/progression';
import type { ItemCategory } from '@/core/domain/items';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseProgressionOptions {
  /** When provided, only rows matching this category are returned. */
  category?: ItemCategory;
  /** When provided, only rows matching this status are returned. */
  status?: ProgressionStatus;
}

export interface UseProgressionResult {
  /** Filtered progression rows. `undefined` while the first query is loading. */
  items:   ProgressionRecord[] | undefined;
  /** True on the initial load before any data has resolved. */
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a live, filtered view of the progression table.
 *
 * @example
 * // All items across all categories
 * const { items } = useProgression();
 *
 * @example
 * // Only Primary weapons
 * const { items } = useProgression({ category: 'Primary' });
 *
 * @example
 * // Only mastered Melee weapons
 * const { items } = useProgression({ category: 'Melee', status: ProgressionStatus.MASTERED });
 */
export function useProgression(options: UseProgressionOptions = {}): UseProgressionResult {
  const { category, status } = options;

  const items = useLiveQuery(async () => {
    // Build the query — sortBy returns Promise<T[]> so we branch by filter presence
    let rows: ProgressionRecord[];

    if (category !== undefined) {
      rows = await db.progression
        .where('category')
        .equals(category)
        .sortBy('itemName');
    } else {
      rows = await db.progression.orderBy('itemName').toArray();
    }

    // Apply optional status filter in JS (low cardinality, fast)
    if (status !== undefined) {
      rows = rows.filter(r => r.status === status);
    }

    return rows;
  }, [category, status]);

  return {
    items,
    loading: items === undefined,
  };
}

// Re-export enum so consumers don't need a second import
export { ProgressionStatus };
