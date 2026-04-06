import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFissures } from '@/adapters/api/fissureAdapter';
import {
  getWsCache,
  clearWsCache,
  WS_CACHE_KEYS,
} from '@/adapters/storage/worldstateCache';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import type { WSFetchResult } from '@/adapters/api/types';
import {
  computeFissureStatus,
  filterFissures,
  groupByTier,
  countSteelPath,
  getNextToExpire,
  type FissureFilters,
} from '@/core/services/fissureService';
import type { Fissure, FissureStatus, FissureTier } from '@/core/domain/relics';

export const DEFAULT_FILTERS: FissureFilters = {
  showNormal:    true,
  showStorm:     true,
  showSteelPath: false,
};

// ---------------------------------------------------------------------------
// Pre-load state
// ---------------------------------------------------------------------------

interface PreloadState {
  fissures: WSFetchResult<Fissure[]> | null;
  ready:    boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides live FissureStatus objects grouped by tier.
 *
 * Offline-first pattern (same as useDailiesData):
 *   1. On mount, Dexie cache is read via getWsCache.
 *   2. Once pre-load resolves, query is enabled with initialData.
 *   3. Cached data appears immediately — no loading flash even when offline.
 *   4. If cachedAt is older than staleTime, TQ background-refetches.
 *   5. If no cache AND no network, hasEverLoaded = false → first-sync card.
 */
export function useFissures(filters: FissureFilters = DEFAULT_FILTERS) {
  const queryClient = useQueryClient();

  // ── Phase 1: async Dexie pre-load ─────────────────────────────────────
  const [preload, setPreload] = useState<PreloadState>({
    fissures: null, ready: false,
  });

  useEffect(() => {
    getWsCache<Fissure[]>(WS_CACHE_KEYS.fissures).then(cached => {
      setPreload({
        fissures: cached
          ? { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: cached.isExpired }
          : null,
        ready: true,
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: TanStack Query ───────────────────────────────────────────
  const {
    data:          result,
    isLoading,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery<WSFetchResult<Fissure[]>>({
    queryKey:             ['ws:fissures'],
    queryFn:              fetchFissures,
    enabled:              preload.ready,
    initialData:          preload.fissures ?? undefined,
    initialDataUpdatedAt: preload.fissures?.cachedAt ?? 0,
    staleTime:            60_000,
    refetchInterval:      60_000,
    retry:                2,
    networkMode:          'always',
  });

  // ── Force refresh ─────────────────────────────────────────────────────
  async function forceRefetch() {
    await clearWsCache(WS_CACHE_KEYS.fissures);
    queryClient.removeQueries({ queryKey: ['ws:fissures'] });
    await refetch();
  }

  // ── 1-second clock ────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────
  const data = result?.data;

  const {
    grouped,
    expiredStatuses,
    totalActive,
    steelPathCount,
    nextToExpire,
  } = useMemo(() => {
    if (!data) {
      return {
        grouped:         new Map<FissureTier, FissureStatus[]>(),
        expiredStatuses: [] as FissureStatus[],
        totalActive:     0,
        steelPathCount:  0,
        nextToExpire:    null as FissureStatus | null,
      };
    }

    const filtered = filterFissures(data, filters);

    // Split locally-active vs locally-expired (between 60s API polls)
    const activeFissures  = filtered.filter(f => computeFissureStatus(f, now).msRemaining > 0);
    const expiredFissures = filtered.filter(f => computeFissureStatus(f, now).msRemaining === 0);

    // Group active by tier, compute status for each
    const byTier    = groupByTier(activeFissures);
    const statusMap = new Map<FissureTier, FissureStatus[]>();
    for (const [tier, fissures] of byTier) {
      statusMap.set(tier, fissures.map(f => computeFissureStatus(f, now)));
    }

    // Derived stats for page header
    const expiredStatuses = expiredFissures.map(f => computeFissureStatus(f, now));
    const steelPathCount  = countSteelPath(activeFissures);
    const nextFissure     = getNextToExpire(activeFissures);
    const nextToExpire    = nextFissure ? computeFissureStatus(nextFissure, now) : null;

    return {
      grouped:    statusMap,
      expiredStatuses,
      totalActive: activeFissures.length,
      steelPathCount,
      nextToExpire,
    };
  }, [data, filters, now]);

  // ── Offline / staleness signals ───────────────────────────────────────
  const isStale      = !!result?.fromStaleCache;
  const cacheAgeMs   = getCacheAgeMs(result?.cachedAt ?? now, now);
  const hasEverLoaded = !!(data || (!isLoading && !error));

  return {
    grouped,
    expiredStatuses,
    totalActive,
    steelPathCount,
    nextToExpire,
    isLoading: !preload.ready || isLoading,
    isError:   !!error,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    lastSync:  dataUpdatedAt,
    now,
    forceRefetch,
  };
}
