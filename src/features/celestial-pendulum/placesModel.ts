/**
 * placesModel — the Observatory's unifying abstraction.
 *
 * The page is not "world cycles" + "bounties" as two separate systems; it's a
 * set of PLACES you can go to. A place may have a live cycle (a clock that
 * changes what's available) AND/OR a bounty giver (a reward table). Cetus the
 * world cycle and Konzu's Cetus bounties are the SAME place — this module merges
 * them by `uniqueName`-of-place: the CycleId ↔ BountyLocation affinity map.
 *
 *   • Cycle worlds (cetus/vallis/cambion/zariman/duviri) carry the live clock.
 *   • Open-world givers (Konzu/Eudico/Mother/Quinn) fold into their world.
 *   • Static givers (Fibonacci/Sanctum, The Hex/Höllvania) have no cycle — they
 *     stand alone, always open.
 *
 * Pure: no React, no Dexie, no fetch. The page assembles places each render so
 * the live clock + freshly-loaded drop tables both flow through.
 */

import type { CycleId, CycleStatus } from '@/core/domain/cycles';
import type { BountyLocation } from '@/core/domain/drops';
import type { CycleUrgency } from './hooks/useWorldCycles';
import type { CycleActivity, WorldMeta } from './cycleActivity';
import type { GiverBounties } from './hooks/useAllGiverBounties';
import { getWorldMeta, getActivity } from './cycleActivity';
import { CYCLE_TO_BOUNTY_LOCATION } from '@/core/services/cycleAffinityService';

/** Rail key for the global "All worlds" overview (not a real place). */
export const OVERVIEW_KEY = 'overview';

export interface Place {
  /** Stable selection key: the CycleId for cycle worlds, else the giver id. */
  key:      string;
  cycleId?: CycleId;
  giverId?: BountyLocation;
  /** Short place name shown in the rail, e.g. "CETUS", "SANCTUM". */
  label:    string;
  /** Region / hub, e.g. "Plains of Eidolon", "Sanctum Anatomica". */
  region:   string;
  /** Bounty-giver NPC, e.g. "Konzu", "Fibonacci". */
  npc?:     string;
  /** Present when the place has a live cycle (clock + state). */
  meta?:     WorldMeta;
  status?:   CycleStatus;
  urgency?:  CycleUrgency;
  activity?: CycleActivity;
  /** Present when the place has a loaded bounty table. */
  giver?:    GiverBounties;
  /** Set-once editorial line for static (no-cycle) givers — drives their hero. */
  blurb?:    string;
}

/** Short display labels for static (no-cycle) givers. */
const STATIC_LABEL: Partial<Record<BountyLocation, string>> = {
  Sanctum:   'SANCTUM',
  Hollvania: 'HÖLLVANIA',
};

/**
 * Set-once editorial lines for the static givers' hero (low maintenance — these
 * reward pools don't rotate, so the copy stays put). One per BountyLocation.
 */
const STATIC_BLURB: Partial<Record<BountyLocation, string>> = {
  Sanctum:
    'Cavia standing bounties in the Sanctum Anatomica. Netracell keys, Melee Arcanes and Entrati Lanthorns — a single reward pool, no day/night rotation.',
  Hollvania:
    'Hex bounties in 1999 Höllvania. The mission type rotates, but the reward pool stays put — Arcanes, mods and Höllvanian rewards.',
};

/**
 * Merge live cycles and bounty givers into the ordered place list.
 *
 * @param worlds        cycle ids to render, already in curated order
 * @param byId          live cycle status keyed by id
 * @param urgency       per-cycle urgency (pre-heat / next state)
 * @param giverBounties every loaded bounty giver (cycle + static)
 */
export function buildPlaces(
  worlds:        CycleId[],
  byId:          Partial<Record<CycleId, CycleStatus>>,
  urgency:       Partial<Record<CycleId, CycleUrgency>>,
  giverBounties: GiverBounties[],
): Place[] {
  const giverByLoc = new Map<BountyLocation, GiverBounties>(
    giverBounties.map((g) => [g.id, g]),
  );
  const foldedIntoWorld = new Set<BountyLocation>();
  const places: Place[] = [];

  // 1) Cycle worlds (curated order), each merged with its open-world giver.
  for (const id of worlds) {
    const status = byId[id];
    if (!status) continue;
    const meta    = getWorldMeta(id);
    const giverId = CYCLE_TO_BOUNTY_LOCATION[id] ?? undefined;
    const giver   = giverId ? giverByLoc.get(giverId) : undefined;
    if (giverId) foldedIntoWorld.add(giverId);
    places.push({
      key:      id,
      cycleId:  id,
      giverId,
      label:    meta.label,
      region:   meta.region,
      npc:      giver?.npc,
      meta,
      status,
      urgency:  urgency[id],
      activity: getActivity(id, status.cycle.state),
      giver,
    });
  }

  // 2) Static givers — no cycle, always open. Appended after the cycle worlds.
  for (const g of giverBounties) {
    if (foldedIntoWorld.has(g.id)) continue;
    places.push({
      key:     g.id,
      giverId: g.id,
      label:   STATIC_LABEL[g.id] ?? g.id.toUpperCase(),
      region:  g.region,
      npc:     g.npc,
      giver:   g,
      blurb:   STATIC_BLURB[g.id],
    });
  }

  return places;
}
