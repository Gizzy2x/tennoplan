import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSyndicateMissions } from '@/adapters/api/syndicatesAdapter';
import {
  getWsCache,
  clearWsCache,
  WS_CACHE_KEYS,
} from '@/adapters/storage/worldstateCache';
import type { SyndicateMission } from '@/core/domain/syndicates';
import type { WSFetchResult } from '@/adapters/api/types';

/**
 * Provides live syndicate mission data for the four open-world syndicates
 * (Ostron, Solaris United, Entrati, The Holdfasts).
 *
 * Same offline-first pattern as useWorldCycles:
 *   1. Check Dexie cache on mount — enables query immediately
 *   2. TanStack Query fetches and caches with 5-min stale/refresh interval
 */
export function useSyndicateMissions() {
  const queryClient = useQueryClient();

  // Phase 1: Dexie preload — unblock query immediately if cache exists
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getWsCache<SyndicateMission[]>(WS_CACHE_KEYS.syndicateMissions)
      .then(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: TanStack Query
  const {
    data:          result,
    isLoading,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery<WSFetchResult<SyndicateMission[]>>({
    queryKey:        ['ws:syndicateMissions'],
    queryFn:         fetchSyndicateMissions,
    enabled:         ready,
    staleTime:       5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry:           2,
    networkMode:     'always',
  });

  async function forceRefetch() {
    await clearWsCache(WS_CACHE_KEYS.syndicateMissions);
    queryClient.removeQueries({ queryKey: ['ws:syndicateMissions'] });
    await refetch();
  }

  return {
    missions:  result?.data ?? [],
    isLoading: !ready || isLoading,
    isError:   !!error,
    isStale:   !!result?.fromStaleCache,
    cachedAt:  result?.cachedAt,
    lastSync:  dataUpdatedAt,
    forceRefetch,
  };
}
