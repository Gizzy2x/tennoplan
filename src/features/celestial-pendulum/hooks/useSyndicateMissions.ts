import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { SyncService } from '@/services/SyncService';
import type { SyndicateMission, SyndicateJob } from '@/core/domain/syndicates';

// ---------------------------------------------------------------------------
// Raw API shapes (kept local)
// ---------------------------------------------------------------------------

interface RawSyndicateJob {
  type?:           string;
  enemyLevels?:    [number, number];
  standingStages?: number[];
  rewardPool?:     string[];
}

interface RawSyndicateMission {
  id?:        string;
  syndicate?: string;
  expiry?:    string;
  jobs?:      RawSyndicateJob[];
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const WANTED_SYNDICATES = new Set(['Ostron', 'Solaris United', 'Entrati', 'The Holdfasts']);

const SYNDICATE_ALIASES: Record<string, string> = {
  'ostron':         'Ostron',
  'solaris united': 'Solaris United',
  'entrati':        'Entrati',
  'the holdfasts':  'The Holdfasts',
  'holdfasts':      'The Holdfasts',
};

function canonicalizeName(raw: string): string {
  return SYNDICATE_ALIASES[raw.toLowerCase()] ?? raw;
}

function rawToJob(raw: RawSyndicateJob): SyndicateJob {
  return {
    type:           raw.type           ?? 'Unknown',
    enemyLevels:    raw.enemyLevels    ?? [0, 0],
    standingStages: raw.standingStages ?? [],
    rewardPool:     raw.rewardPool,
  };
}

function rawToMission(raw: RawSyndicateMission): SyndicateMission {
  const rawName   = raw.syndicate ?? '';
  const syndicate = canonicalizeName(rawName) || rawName || 'Unknown';
  const expiry    = raw.expiry ?? '';
  return {
    id:       raw.id      ?? syndicate,
    syndicate,
    expiry,
    expiryMs: expiry ? new Date(expiry).getTime() : 0,
    jobs:     (raw.jobs ?? []).map(rawToJob),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides the four open-world syndicate mission rotations from worldstate_master.
 * No fetch, no TanStack Query — useLiveQuery re-renders on SyncService write.
 */
export function useSyndicateMissions() {
  const wsEntry = useLiveQuery(
    () => db.cache.get('worldstate_master').then(e => e ?? null),
    []
  );

  const isLoading = wsEntry === undefined;
  const ws        = (wsEntry?.data ?? null) as Record<string, unknown> | null;
  const cachedAt  = wsEntry?.updatedAt ?? 0;
  const isStale   = wsEntry ? wsEntry.expiresAt < Date.now() : false;

  const missions = useMemo((): SyndicateMission[] => {
    if (!ws) return [];

    const rawAll = (ws['syndicateMissions'] ?? []) as RawSyndicateMission[];

    const seen = new Map<string, SyndicateMission>();
    for (const raw of rawAll) {
      const canonical = canonicalizeName(raw.syndicate ?? '');
      if (!WANTED_SYNDICATES.has(canonical)) continue;
      const mission  = rawToMission(raw);
      const existing = seen.get(canonical);
      if (!existing || mission.expiryMs > existing.expiryMs) {
        seen.set(canonical, mission);
      }
    }
    return Array.from(seen.values());
  }, [ws]);

  async function forceRefetch() {
    await SyncService.performSync(true);
  }

  return {
    missions,
    isLoading,
    isError:  !isLoading && wsEntry === null,
    isStale,
    cachedAt,
    lastSync: cachedAt,
    forceRefetch,
  };
}
