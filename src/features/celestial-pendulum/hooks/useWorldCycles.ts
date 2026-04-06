import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllCycles } from '@/adapters/api/worldstateAdapter';
import { computeCycleStatus, extrapolateCycle } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';

/**
 * Provides live CycleStatus objects for all five world cycles.
 *
 * - React Query handles network fetching + Dexie cache (via the adapter).
 * - A 1-second interval ticks `now` so countdowns update every second without
 *   triggering re-fetches.
 * - Expired cycles are extrapolated forward using approximate durations so the
 *   UI stays coherent while offline.
 */
export function useWorldCycles() {
  const {
    data,
    isLoading,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['worldCycles'],
    queryFn:  fetchAllCycles,
    // Keep data fresh — most cycles are minutes long, so 60 s is a safe margin.
    staleTime:       60_000,
    refetchInterval: 60_000,
    retry:           2,
    // Run the queryFn even when the browser reports "offline"; our adapter
    // falls back to Dexie when the network call fails.
    networkMode: 'always',
  });

  // ---------------------------------------------------------------------------
  // 1-second clock — only updates `now`, never re-fetches
  // ---------------------------------------------------------------------------
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived statuses
  // ---------------------------------------------------------------------------
  const statuses = useMemo((): CycleStatus[] => {
    if (!data) return [];
    return data.map(cycle =>
      computeCycleStatus(extrapolateCycle(cycle, now), now)
    );
  }, [data, now]);

  return {
    statuses,
    isLoading,
    isError:  !!error,
    lastSync: dataUpdatedAt,
    now,
  };
}
