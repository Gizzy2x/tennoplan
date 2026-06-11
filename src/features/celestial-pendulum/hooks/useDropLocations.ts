/**
 * useBountyDropLocations — live Dexie subscription for one world's bounty rows.
 *
 * Reads the real WFCD bounty reward tables from `db.dropLocations` (type
 * 'Bounty'), populated by DropDataService from drops.warframestat.us. These
 * are the accurate, per-rotation (A/B/C) tables the game shows — NOT the live
 * worldstate job rewardPool (which warframestat leaves empty) and NOT the codex
 * (which carries no open-world bounty data).
 *
 * Each reward gets its codex `uniqueName` resolved here via the codex-backed
 * DropResolver (the same deterministic rule cascade proven in CI), so reward
 * tiles deep-link to the exact codex entry. This covers patterned labels the
 * old items-map lookup missed: relics ("Meso X1 Relic"), blueprints, prime
 * part components, quantity prefixes, and synthetic currencies (Endo / Credits
 * / Kuva resolve to their /Tennoplan/* entries instead of dead tiles).
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db }              from '@/adapters/storage/db';
import { getDropResolver } from '@/adapters/items/dropResolverAdapter';
import type { BountyLocation, DropLocation } from '@/core/domain/drops';

export function useBountyDropLocations(
  bountyLocation: BountyLocation | null | undefined,
): DropLocation[] {
  const rows = useLiveQuery(
    async () => {
      if (!bountyLocation) return [] as DropLocation[];

      // Read codex (via the resolver) + bounty rows together so the query is
      // reactive to BOTH a drop-data sync and a codex sync.
      const [resolver, locs] = await Promise.all([
        getDropResolver(),
        db.dropLocations
          .where('[type+bountyLocation]')
          .equals(['Bounty', bountyLocation])
          .toArray(),
      ]);

      // Attach codex identity to each reward for deterministic deep-linking.
      return locs.map((loc) => ({
        ...loc,
        rewards: loc.rewards.map((r) => ({
          ...r,
          uniqueName: r.uniqueName ?? resolver.resolve(r.itemName)?.uniqueName,
        })),
      }));
    },
    [bountyLocation],
    [] as DropLocation[],
  );

  return rows ?? [];
}
