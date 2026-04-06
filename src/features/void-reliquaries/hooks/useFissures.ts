import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFissures } from '@/adapters/api/fissureAdapter';
import {
  computeFissureStatus,
  filterFissures,
  groupByTier,
  countSteelPath,
  getNextToExpire,
  type FissureFilters,
} from '@/core/services/fissureService';
import type { FissureStatus, FissureTier } from '@/core/domain/relics';

export const DEFAULT_FILTERS: FissureFilters = {
  showNormal:    true,
  showStorm:     true,
  showSteelPath: false,
};

/**
 * Provides live FissureStatus objects grouped by tier.
 *
 * - React Query handles fetching + Dexie cache (via the adapter).
 * - A 1-second interval ticks `now` for countdowns without triggering re-fetches.
 * - `grouped` contains only active fissures (msRemaining > 0), keyed by tier.
 * - `expiredStatuses` is a flat list of locally-expired fissures (expired between polls).
 * - `steelPathCount` and `nextToExpire` power the page header summary stats.
 */
export function useFissures(filters: FissureFilters = DEFAULT_FILTERS) {
  const {
    data,
    isLoading,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey:        ['fissures'],
    queryFn:         fetchFissures,
    staleTime:       60_000,
    refetchInterval: 60_000,
    retry:           2,
    networkMode:     'always',
  });

  // 1-second clock — only updates `now`, never re-fetches
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  return {
    grouped,
    expiredStatuses,
    totalActive,
    steelPathCount,
    nextToExpire,
    isLoading,
    isError:  !!error,
    lastSync: dataUpdatedAt,
    now,
  };
}
