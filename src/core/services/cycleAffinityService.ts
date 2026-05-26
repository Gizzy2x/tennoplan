/**
 * cycleAffinityService — pure mapping between world cycles and bounty worlds,
 * plus hand-authored context notes for cycle-gated content.
 *
 * Game knowledge lives here, not in the UI. Drops data from the API does NOT
 * expose which rewards are gated by night vs day etc.; this module encodes
 * what the community knows (Eidolons spawn at night, Exploiter Orb requires
 * warm, Fass/Vome alter resource tables, …).
 *
 * Pure: no React, no Dexie, no fetch.
 */

import type { CycleId, CycleState } from '@/core/domain/cycles';
import type { BountyLocation } from '@/core/domain/drops';

/**
 * Which bounty world corresponds to each live cycle. Earth/Duviri have no
 * open-world bounty table in drops.warframestat.us, so they map to null —
 * the enrichment service then skips drop matching.
 */
export const CYCLE_TO_BOUNTY_LOCATION: Record<CycleId, BountyLocation | null> = {
  cetus:   'Cetus',
  vallis:  'Solaris',
  cambion: 'Deimos',
  zariman: 'Zariman',
  earth:   null,
  duviri:  null,
};

/**
 * Short cycle-context note to render above the bounty board.
 * Returns null when the cycle state has no special gating.
 */
export function getCycleNote(id: CycleId, state: CycleState): string | null {
  // Cetus — Eidolons only at night
  if (id === 'cetus' && state === 'night') {
    return 'Eidolon Teralyst Hunts available — night cycle only.';
  }
  if (id === 'cetus' && state === 'day') {
    return 'Eidolon Hunts unavailable — return at night for Arcanes.';
  }

  // Orb Vallis — Exploiter Orb requires warm cycle
  if (id === 'vallis' && state === 'warm') {
    return 'Exploiter Orb fight available — warm cycle only.';
  }
  if (id === 'vallis' && state === 'cold') {
    return 'Exploiter Orb requires the warm cycle.';
  }

  // Cambion Drift — Fass/Vome alter resource + Isolation Vault rotations
  if (id === 'cambion' && state === 'fass') {
    return 'Fass cycle — Iradite/Thaumica emphasis; altered Residue drops.';
  }
  if (id === 'cambion' && state === 'vome') {
    return 'Vome cycle — Gyromag/Pustulite emphasis; altered Residue drops.';
  }

  // Zariman — Corpus/Grineer incursions differ in enemy tables but not bounty rewards
  if (id === 'zariman') {
    return state === 'corpus'
      ? 'Corpus incursion — Crewmen, Amalgam Swarms.'
      : 'Grineer incursion — Grustrag, Manics.';
  }

  return null;
}
