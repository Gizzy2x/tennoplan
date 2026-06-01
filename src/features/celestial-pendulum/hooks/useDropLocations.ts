/**
 * useBountyDropLocations — live Dexie subscription for one world's bounty rows.
 *
 * Reads the real WFCD bounty reward tables from `db.dropLocations` (type
 * 'Bounty'), populated by DropDataService from drops.warframestat.us. These
 * are the accurate, per-rotation (A/B/C) tables the game shows — NOT the live
 * worldstate job rewardPool (which warframestat leaves empty) and NOT the codex
 * (which carries no open-world bounty data).
 *
 * Each reward also gets its codex `uniqueName` resolved here (the normalizer is
 * a pure core service and can't import the items adapter), so reward tiles
 * deep-link to the exact codex entry. Quantity-prefixed labels ("100X Oxium",
 * "1,500 Credits Cache") are stripped before resolution; pure currency rewards
 * resolve to nothing and render as accurate non-linkable tiles.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db }           from '@/adapters/storage/db';
import { findByName }   from '@/adapters/items/itemsAdapter';
import type { BountyLocation, DropLocation } from '@/core/domain/drops';

/**
 * Resolve a reward label to a codex uniqueName. Tries the raw name first, then
 * strips a leading quantity token ("100X ", "15X ", "3X 1,500 ", "50 ") and
 * retries. Returns undefined for non-item rewards (credits, endo, caches).
 */
function resolveRewardUniqueName(itemName: string): string | undefined {
  const direct = findByName(itemName);
  if (direct) return direct.uniqueName;

  const stripped = itemName.replace(/^(?:\d[\d,]*\s*[xX]?\s+)+/, '').trim();
  if (stripped && stripped !== itemName) {
    const f = findByName(stripped);
    if (f) return f.uniqueName;
  }
  return undefined;
}

export function useBountyDropLocations(
  bountyLocation: BountyLocation | null | undefined,
): DropLocation[] {
  const rows = useLiveQuery(
    async () => {
      if (!bountyLocation) return [] as DropLocation[];

      const locs = await db.dropLocations
        .where('[type+bountyLocation]')
        .equals(['Bounty', bountyLocation])
        .toArray();

      // Attach codex identity to each reward for deterministic deep-linking.
      return locs.map((loc) => ({
        ...loc,
        rewards: loc.rewards.map((r) => ({
          ...r,
          uniqueName: r.uniqueName ?? resolveRewardUniqueName(r.itemName),
        })),
      }));
    },
    [bountyLocation],
    [] as DropLocation[],
  );

  return rows ?? [];
}
