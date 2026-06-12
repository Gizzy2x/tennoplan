/**
 * useSyndicateMissions — open-world bounty rotations (Phase D.6).
 *
 * Reads ParsedWorldstate.syndicateMissions from the V2 worldstate store
 * via useWorldstate(). The Worker already filters to the four wanted
 * syndicates (Ostron / Solaris United / Entrati / The Holdfasts) and
 * canonicalises their labels, so the hook just maps timestamp shape and
 * de-duplicates by syndicate name (preferring the longest-lived entry).
 *
 * Migration notes:
 *   • Legacy hook subscribed to `db.cache.get('worldstate_master')`,
 *     parsed RawSyndicateMission ISO strings, applied alias lookups, and
 *     filtered the 9-syndicate upstream list down to four. All four steps
 *     now happen in the Worker — the frontend just renders.
 *   • V2 expiry is Unix-ms; legacy SyndicateMission keeps both `expiry`
 *     (ISO string for legacy display code) and `expiryMs` (the live one).
 *     We synthesise the ISO string from the Unix-ms field via toISOString.
 *
 * The return signature matches the legacy useSyndicateMissions exactly so
 * the Celestial Pendulum syndicate panel does not need any changes.
 */

import { useMemo } from 'react';
import type { SyndicateMission, SyndicateJob } from '@/core/domain/syndicates';
import type {
  SyndicateMissionInfo,
  SyndicateJob as ApiSyndicateJob,
} from '@/core/domain/tennoplanApi';
import { useWorldstate } from '@/hooks/useWorldstate';

// ---------------------------------------------------------------------------
// V2 → legacy adapter
// ---------------------------------------------------------------------------

function apiToJob(raw: ApiSyndicateJob): SyndicateJob {
  return {
    type:           raw.type,
    enemyLevels:    raw.enemyLevels,
    standingStages: raw.standingStages,
    rewardPool:     raw.rewardPool,
    ...(raw.minMR    !== undefined ? { minMR:    raw.minMR }    : {}),
    ...(raw.isVault   ? { isVault:   true } : {}),
    ...(raw.timeBound ? { timeBound: true } : {}),
    ...(raw.rotation  ? { rotation:  raw.rotation } : {}),
    ...(raw.rewardPoolDrops?.length ? { rewardPoolDrops: raw.rewardPoolDrops } : {}),
  };
}

function apiToMission(raw: SyndicateMissionInfo): SyndicateMission {
  return {
    id:       raw.id,
    syndicate: raw.syndicate,
    expiry:   raw.expiry > 0 ? new Date(raw.expiry).toISOString() : '',
    expiryMs: raw.expiry,
    jobs:     raw.jobs.map(apiToJob),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides the four open-world syndicate mission rotations from V2 worldstate.
 * Pure read-side: WorldstateSync is the only writer.
 */
export function useSyndicateMissions() {
  const { data: ws, lastSync, isLoading, isError, isStale, forceRefetch } =
    useWorldstate();

  const missions = useMemo((): SyndicateMission[] => {
    if (!ws?.syndicateMissions?.length) return [];

    // Worker already filtered + canonicalised; the only thing left is to
    // keep the longest-lived entry per syndicate when duplicates slip
    // through (the upstream parser occasionally emits stale + live pairs).
    const seen = new Map<string, SyndicateMission>();
    for (const raw of ws.syndicateMissions) {
      const mission  = apiToMission(raw);
      const existing = seen.get(mission.syndicate);
      if (!existing || mission.expiryMs > existing.expiryMs) {
        seen.set(mission.syndicate, mission);
      }
    }
    return Array.from(seen.values());
  }, [ws]);

  return {
    missions,
    isLoading,
    isError,
    isStale,
    cachedAt: lastSync,
    lastSync,
    forceRefetch,
  };
}
