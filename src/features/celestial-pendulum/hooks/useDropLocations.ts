/**
 * useBountyDropLocations — live Dexie subscription for one world's bounty rows.
 *
 * Reads from db.tennoplanItems (V2 pipeline) and reconstructs the per-tier +
 * per-rotation DropLocation shape that bountyEnrichmentService expects.
 *
 * sourceName mapping (Worker uses different world names from old domain type):
 *   Cetus Bounty   → BountyLocation 'Cetus'
 *   Fortuna Bounty → BountyLocation 'Solaris'
 *   Cambion Bounty → BountyLocation 'Deimos'
 *   Zariman Bounty → BountyLocation 'Zariman'
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db }           from '@/adapters/storage/db';
import type { BountyLocation, DropLocation, RotationTier } from '@/core/domain/drops';

const BOUNTY_TO_SOURCE: Record<BountyLocation, string> = {
  Cetus:   'Cetus Bounty',
  Solaris: 'Fortuna Bounty',
  Deimos:  'Cambion Bounty',
  Zariman: 'Zariman Bounty',
};

const LEVEL_RX = /(\d+)\s*[-–—]\s*(\d+)/;

export function useBountyDropLocations(
  bountyLocation: BountyLocation | null | undefined,
): DropLocation[] {
  const rows = useLiveQuery(
    async () => {
      if (!bountyLocation) return [] as DropLocation[];
      const targetSource = BOUNTY_TO_SOURCE[bountyLocation];

      const all = await db.tennoplanItems.toArray();
      const locationMap = new Map<string, DropLocation>();

      for (const item of all) {
        for (const dl of item.dropLocations) {
          if (dl.sourceName !== targetSource) continue;

          const m = LEVEL_RX.exec(dl.location);
          const levelRange = m ? `Level ${m[1]} - ${m[2]}` : dl.location;
          const rotKey     = (dl.rotation ?? 'flat') as RotationTier | 'flat';
          const locationKey = `${bountyLocation}|${levelRange}|${rotKey}`;

          const reward = {
            itemName: item.name,
            chance:   dl.chance * 100,
            rarity:   (dl.rarity as string) ?? 'Unknown',
          };

          const existing = locationMap.get(locationKey);
          if (existing) {
            existing.rewards.push(reward);
          } else {
            locationMap.set(locationKey, {
              locationKey,
              type:          'Bounty',
              displayName:   `${levelRange} (${rotKey === 'flat' ? 'Pool' : `Rotation ${rotKey}`})`,
              rewards:       [reward],
              bountyLocation,
              bountyLevel:   levelRange,
              rotationTier:  rotKey === 'flat' ? undefined : (rotKey as RotationTier),
              fetchedAt:     Date.now(),
            });
          }
        }
      }

      return Array.from(locationMap.values());
    },
    [bountyLocation],
    [] as DropLocation[],
  );

  return rows ?? [];
}
