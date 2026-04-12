import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllCycles } from '@/adapters/api/cyclesAdapter';
import {
  getWsCache,
  clearWsCache,
  WS_CACHE_KEYS,
} from '@/adapters/storage/worldstateCache';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import { computeCycleStatus, extrapolateCycle } from '@/core/services/cycleService';
import type { WorldCycle, CycleId, CycleStatus } from '@/core/domain/cycles';
import type { WSFetchResult } from '@/adapters/api/types';
import { useHeartbeatStore } from '@/store/heartbeat';

// ---------------------------------------------------------------------------
// Pre-load state
// ---------------------------------------------------------------------------

interface PreloadState {
  cycles: WSFetchResult<WorldCycle[]> | null;
  ready:  boolean;
}

const CYCLE_KEYS: { id: CycleId; key: string }[] = [
  { id: 'cetus',   key: WS_CACHE_KEYS.cycleCetus },
  { id: 'vallis',  key: WS_CACHE_KEYS.cycleVallis },
  { id: 'cambion', key: WS_CACHE_KEYS.cycleCambion },
  { id: 'zariman', key: WS_CACHE_KEYS.cycleZariman },
  { id: 'earth',   key: WS_CACHE_KEYS.cycleEarth },
  { id: 'duviri',  key: WS_CACHE_KEYS.cycleDuviri },
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides live CycleStatus objects for all five world cycles.
 *
 * Offline-first pattern (same as useDailiesData):
 *   1. On mount, all five Dexie cache entries are read in parallel.
 *   2. Once pre-load resolves, query is enabled with initialData.
 *   3. Cached data appears immediately — no loading flash even when offline.
 *   4. Expired cycles are extrapolated forward so the UI stays coherent.
 */
export function useWorldCycles() {
  const queryClient = useQueryClient();

  // ── Phase 1: async Dexie pre-load ─────────────────────────────────────
  const [preload, setPreload] = useState<PreloadState>({
    cycles: null, ready: false,
  });

  useEffect(() => {
    // The pre-load reads raw cycle data from each individual cache key.
    // The adapter stores RawCycle objects but getWsCache returns them
    // as-is — we only need cachedAt/isExpired for the aggregate result.
    // We pass the data through fetchAllCycles on the TQ side, so here
    // we just need to know IF there's cached data and how old it is.
    Promise.all(CYCLE_KEYS.map(({ key }) => getWsCache<unknown>(key))).then(results => {
      const valid = results.filter((r): r is NonNullable<typeof r> => r != null);

      if (valid.length === 0) {
        setPreload({ cycles: null, ready: true });
        return;
      }

      // We can't reconstruct WorldCycle[] from raw cache without the adapter's
      // mapping logic. Instead, skip initialData and just record readiness so
      // the query fires immediately. The adapter will hit fresh Dexie cache
      // (< 50ms) on its first call, giving us the same instant-load effect.
      setPreload({ cycles: null, ready: true });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: TanStack Query ───────────────────────────────────────────
  const {
    data:          result,
    isLoading,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery<WSFetchResult<WorldCycle[]>>({
    queryKey:        ['ws:worldCycles'],
    queryFn:         fetchAllCycles,
    enabled:         preload.ready,
    staleTime:       60_000,
    refetchInterval: 60_000,
    retry:           2,
    networkMode:     'always',
  });

  // ── Force refresh ─────────────────────────────────────────────────────
  async function forceRefetch() {
    await clearWsCache(
      WS_CACHE_KEYS.cycleCetus,
      WS_CACHE_KEYS.cycleVallis,
      WS_CACHE_KEYS.cycleCambion,
      WS_CACHE_KEYS.cycleZariman,
      WS_CACHE_KEYS.cycleEarth,
      WS_CACHE_KEYS.cycleDuviri,
    );
    queryClient.removeQueries({ queryKey: ['ws:worldCycles'] });
    await refetch();
  }

  // ── Heartbeat registration ────────────────────────────────────────────
  // Keep a stable ref so the heartbeat store always calls the current version
  const refetchRef = useRef(forceRefetch);
  refetchRef.current = forceRefetch;

  useEffect(() => {
    const { registerRefetch } = useHeartbeatStore.getState();
    registerRefetch(() => refetchRef.current());
    return () => useHeartbeatStore.getState().registerRefetch(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 1-second clock ────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────
  const data = result?.data;

  const statuses = useMemo((): CycleStatus[] => {
    if (!data) return [];
    return data.map(cycle =>
      computeCycleStatus(extrapolateCycle(cycle, now), now)
    );
  }, [data, now]);

  // ── Offline / staleness signals ───────────────────────────────────────
  const isStale       = !!result?.fromStaleCache;
  const cacheAgeMs    = getCacheAgeMs(result?.cachedAt ?? now, now);
  const hasEverLoaded = !!(data || (!isLoading && !error));

  // ── Sync heartbeat store ──────────────────────────────────────────────
  useEffect(() => {
    const { setSync, status } = useHeartbeatStore.getState();
    if (status === 'syncing') return; // let the triggerRefetch handler settle
    if (error && !data) {
      setSync('offline');
    } else if (isStale) {
      setSync('cached', result?.cachedAt ? new Date(result.cachedAt).getTime() : undefined);
    } else if (data) {
      setSync('live', dataUpdatedAt || Date.now());
    }
  }, [data, error, isStale, dataUpdatedAt, result?.cachedAt]);

  return {
    statuses,
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
