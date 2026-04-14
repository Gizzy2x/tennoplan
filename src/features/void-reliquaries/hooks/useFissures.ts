import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { SyncService } from '@/services/SyncService';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import {
  computeFissureStatus,
  filterFissures,
  groupByTier,
  countSteelPath,
  getNextToExpire,
  type FissureFilters,
} from '@/core/services/fissureService';
import type { Fissure, FissureEnemy, FissureTier, FissureStatus } from '@/core/domain/relics';

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export const DEFAULT_FILTERS: FissureFilters = {
  showNormal:    true,
  showStorm:     true,
  showSteelPath: false,
};

// ---------------------------------------------------------------------------
// Raw API shape (kept local — not a domain concern)
// ---------------------------------------------------------------------------

interface RawFissure {
  id:          string;
  node:        string;
  missionType: string;
  enemy:       string;
  tier:        string;
  tierNum:     number;
  expiry:      string;
  activation:  string;
  expired:     boolean;
  isStorm:     boolean;
  isHard:      boolean;
}

function rawToFissure(raw: RawFissure, fetchedAt: number): Fissure {
  return {
    id:           raw.id,
    node:         raw.node,
    missionType:  raw.missionType,
    enemy:        raw.enemy as FissureEnemy,
    tier:         raw.tier as FissureTier,
    tierNum:      raw.tierNum,
    expiryMs:     new Date(raw.expiry).getTime(),
    activationMs: new Date(raw.activation).getTime(),
    fetchedAt,
    isStorm:      raw.isStorm ?? false,
    isHard:       raw.isHard ?? false,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes directly to worldstate_master in Dexie via useLiveQuery.
 * SyncService is the only code that writes to that entry; this hook is
 * purely a read-side subscriber. No TanStack Query, no fetch calls.
 */
export function useFissures(filters: FissureFilters = DEFAULT_FILTERS) {
  // useLiveQuery returns:
  //   undefined → Dexie query still pending (< 5 ms on first load)
  //   null      → no worldstate_master entry yet (never synced)
  //   CacheEntry → live data
  const wsEntry = useLiveQuery(
    () => db.cache.get('worldstate_master').then(e => e ?? null),
    []
  );

  const isLoading  = wsEntry === undefined;
  const ws         = (wsEntry?.data ?? null) as Record<string, unknown> | null;
  const cachedAt   = wsEntry?.updatedAt ?? 0;
  const isStale    = wsEntry ? wsEntry.expiresAt < Date.now() : false;

  // ── 1-second clock ────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Map + derive ──────────────────────────────────────────────────────
  const { grouped, expiredStatuses, totalActive, steelPathCount, nextToExpire } =
    useMemo(() => {
      const empty = {
        grouped:         new Map<FissureTier, FissureStatus[]>(),
        expiredStatuses: [] as FissureStatus[],
        totalActive:     0,
        steelPathCount:  0,
        nextToExpire:    null as FissureStatus | null,
      };

      if (!ws) return empty;

      const raws    = (ws['fissures'] ?? []) as RawFissure[];
      const fissures = raws.filter(r => !r.expired).map(r => rawToFissure(r, cachedAt));
      const filtered = filterFissures(fissures, filters);

      const active  = filtered.filter(f => computeFissureStatus(f, now).msRemaining > 0);
      const expired = filtered.filter(f => computeFissureStatus(f, now).msRemaining === 0);

      const byTier    = groupByTier(active);
      const statusMap = new Map<FissureTier, FissureStatus[]>();
      for (const [tier, fs] of byTier) {
        statusMap.set(tier, fs.map(f => computeFissureStatus(f, now)));
      }

      const nextRaw   = getNextToExpire(active);

      return {
        grouped:         statusMap,
        expiredStatuses: expired.map(f => computeFissureStatus(f, now)),
        totalActive:     active.length,
        steelPathCount:  countSteelPath(active),
        nextToExpire:    nextRaw ? computeFissureStatus(nextRaw, now) : null,
      };
    }, [ws, cachedAt, filters, now]);

  // ── Force refresh ─────────────────────────────────────────────────────
  async function forceRefetch() {
    await SyncService.performSync(true);
  }

  return {
    grouped,
    expiredStatuses,
    totalActive,
    steelPathCount,
    nextToExpire,
    isLoading,
    isError:       !isLoading && wsEntry === null,
    isStale,
    cacheAgeMs:    getCacheAgeMs(cachedAt || now, now),
    hasEverLoaded: !isLoading,
    lastSync:      cachedAt,
    now,
    forceRefetch,
  };
}
