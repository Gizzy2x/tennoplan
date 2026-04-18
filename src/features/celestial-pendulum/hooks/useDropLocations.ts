/**
 * useBountyDropLocations — live Dexie subscription for one world's bounty rows.
 *
 * Uses the compound index `[type+bountyLocation]` (db.ts v4) so the query is
 * O(rows-for-this-world), not a full-table scan. The table is wiped + refilled
 * by DropDataService.fetchAndSync(), and useLiveQuery re-runs the query
 * automatically after each rewrite.
 *
 * The hook lives in the feature folder (not in src/core/) because it imports
 * Dexie — that's the intended seam between pure logic and storage.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { BountyLocation, DropLocation } from '@/core/domain/drops';

/**
 * Returns all Bounty drop-location rows for the given world, or an empty
 * array while Dexie is loading / when no world is selected.
 */
export function useBountyDropLocations(
  bountyLocation: BountyLocation | null | undefined,
): DropLocation[] {
  const rows = useLiveQuery(
    async () => {
      if (!bountyLocation) return [] as DropLocation[];
      return db.dropLocations
        .where('[type+bountyLocation]')
        .equals(['Bounty', bountyLocation])
        .toArray();
    },
    [bountyLocation],
    [] as DropLocation[],
  );

  return rows ?? [];
}
