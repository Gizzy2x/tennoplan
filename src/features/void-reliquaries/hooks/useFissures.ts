import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFissures } from '@/adapters/api/fissureAdapter';
import {
  computeFissureStatus,
  filterFissures,
  groupByTier,
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

  // Apply filters, then compute statuses, then group by tier
  const grouped = useMemo((): Map<FissureTier, FissureStatus[]> => {
    if (!data) return new Map();
    const filtered   = filterFissures(data, filters);
    const byTier     = groupByTier(filtered);
    const statusMap  = new Map<FissureTier, FissureStatus[]>();
    for (const [tier, fissures] of byTier) {
      statusMap.set(tier, fissures.map(f => computeFissureStatus(f, now)));
    }
    return statusMap;
  }, [data, filters, now]);

  const totalActive = useMemo(
    () => (data ? filterFissures(data, filters).length : 0),
    [data, filters]
  );

  return {
    grouped,
    totalActive,
    isLoading,
    isError:  !!error,
    lastSync: dataUpdatedAt,
    now,
  };
}
