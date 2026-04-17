/**
 * useEnrichedBounties — combines live SyndicateMission + Dexie DropLocations
 * + current world cycle into a fully-enriched array of bounty tiers.
 *
 * This hook is the single source of truth for what the BountyJobList renders.
 * All business logic lives in src/core/services (pure); this hook is the
 * thin React seam that wires Dexie → pure services → memoised output.
 */

import { useMemo } from 'react';
import type { SyndicateMission } from '@/core/domain/syndicates';
import type { CycleId, CycleState } from '@/core/domain/cycles';
import type { EnrichedBounty } from '@/core/domain/bounty';
import { enrichBounty } from '@/core/services/bountyEnrichmentService';
import {
  CYCLE_TO_BOUNTY_LOCATION,
  getCycleNote,
} from '@/core/services/cycleAffinityService';
import { useBountyDropLocations } from './useDropLocations';

export interface UseEnrichedBountiesResult {
  bounties: EnrichedBounty[];
  cycleNote: string | null;
  /** True when the world has no bounty table (earth, duviri). */
  worldSupportsBounties: boolean;
}

export function useEnrichedBounties(
  mission: SyndicateMission | null | undefined,
  cycleId: CycleId,
  cycleState: CycleState,
): UseEnrichedBountiesResult {
  const bountyLocation = CYCLE_TO_BOUNTY_LOCATION[cycleId];
  const locations      = useBountyDropLocations(bountyLocation);
  const cycleNote      = getCycleNote(cycleId, cycleState);

  const bounties = useMemo((): EnrichedBounty[] => {
    if (!mission || !bountyLocation) return [];
    return mission.jobs.map(job =>
      enrichBounty({ job, bountyLocation, locations, cycleNote }),
    );
  }, [mission, bountyLocation, locations, cycleNote]);

  return {
    bounties,
    cycleNote,
    worldSupportsBounties: bountyLocation !== null,
  };
}
