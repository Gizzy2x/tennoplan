/**
 * useAllGiverBounties — the unified bounty source for the giver-organized board.
 *
 * Produces fully-enriched bounties for EVERY giver, decoupled from the orrery's
 * world selection:
 *   • Rotating givers (Konzu/Cetus, Eudico/Fortuna, Mother/Deimos, Quinn/Zariman)
 *     — from the live worldstate jobs, matched to their static drop tables.
 *   • Static givers (Fibonacci/Sanctum, Höllvania/1999) — straight from their
 *     drop tables (no live job; tiers ARE the table rows).
 *
 * Reward identity (uniqueName) is resolved here against the codex so tiles
 * deep-link deterministically.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { getDropResolver } from '@/adapters/items/dropResolverAdapter';
import { enrichBounty, buildStaticBounties } from '@/core/services/bountyEnrichmentService';
import { useSyndicateMissions } from './useSyndicateMissions';
import type { EnrichedBounty } from '@/core/domain/bounty';
import type { BountyLocation, DropLocation } from '@/core/domain/drops';

export interface GiverBounties {
  id:       BountyLocation;
  /** Bounty-giver NPC, e.g. "Konzu". */
  npc:      string;
  /** Region label, e.g. "Plains of Eidolon". */
  region:   string;
  /** Cycle id for accent theming (rotating givers only). */
  cycleId?: 'cetus' | 'vallis' | 'cambion' | 'zariman';
  bounties: EnrichedBounty[];
}

interface GiverDef {
  id:        BountyLocation;
  npc:       string;
  region:    string;
  syndicate?: string;   // present = rotating (live jobs)
  cycleId?:  GiverBounties['cycleId'];
}

const GIVERS: readonly GiverDef[] = [
  { id: 'Cetus',     npc: 'Konzu',     region: 'Plains of Eidolon', syndicate: 'Ostron',         cycleId: 'cetus' },
  { id: 'Solaris',   npc: 'Eudico',    region: 'Orb Vallis',        syndicate: 'Solaris United',  cycleId: 'vallis' },
  { id: 'Deimos',    npc: 'Mother',    region: 'Cambion Drift',     syndicate: 'Entrati',         cycleId: 'cambion' },
  { id: 'Zariman',   npc: 'Quinn',     region: 'Zariman Ten Zero',  syndicate: 'The Holdfasts',   cycleId: 'zariman' },
  { id: 'Sanctum',   npc: 'Fibonacci', region: 'Sanctum Anatomica' },
  { id: 'Hollvania', npc: 'The Hex',   region: 'Höllvania' },
];

const BOUNTY_IDS = GIVERS.map((g) => ['Bounty', g.id] as [string, string]);

export function useAllGiverBounties(): GiverBounties[] {
  const { missions } = useSyndicateMissions();

  // All bounty drop rows across every giver, codex-identity-stamped.
  const locations = useLiveQuery(
    async () => {
      const [resolver, locs] = await Promise.all([
        getDropResolver(),
        db.dropLocations.where('[type+bountyLocation]').anyOf(BOUNTY_IDS).toArray(),
      ]);
      return locs.map((loc) => ({
        ...loc,
        rewards: loc.rewards.map((r) => ({
          ...r,
          uniqueName: r.uniqueName ?? resolver.resolve(r.itemName)?.uniqueName,
        })),
      }));
    },
    [],
    [] as DropLocation[],
  );

  return useMemo(() => {
    const locs = locations ?? [];
    const out: GiverBounties[] = [];

    for (const g of GIVERS) {
      let bounties: EnrichedBounty[] = [];

      if (g.syndicate) {
        const mission = missions.find((m) => m.syndicate === g.syndicate);
        if (mission) {
          bounties = mission.jobs.map((job) =>
            enrichBounty({ job, bountyLocation: g.id, locations: locs, cycleNote: null }),
          );
        }
      } else {
        bounties = buildStaticBounties(locs, g.id, g.region);
      }

      if (bounties.length > 0) {
        const giver: GiverBounties = { id: g.id, npc: g.npc, region: g.region, bounties };
        if (g.cycleId) giver.cycleId = g.cycleId;
        out.push(giver);
      }
    }

    return out;
  }, [missions, locations]);
}
