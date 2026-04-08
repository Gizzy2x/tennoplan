import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSimaris } from '@/adapters/api/simarisAdapter';
import {
  getWsCache,
  clearWsCache,
  WS_CACHE_KEYS,
} from '@/adapters/storage/worldstateCache';
import type { SimarisData } from '@/core/domain/simaris';
import type { WSFetchResult } from '@/adapters/api/types';

/**
 * Provides the active Simaris synthesis target.
 * Cached for 24 h — the target resets on the daily reset cycle.
 */
export function useSimaris() {
  const queryClient = useQueryClient();

  // Phase 1: Dexie preload
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getWsCache<SimarisData>(WS_CACHE_KEYS.simaris)
      .then(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: TanStack Query
  const {
    data:          result,
    isLoading,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery<WSFetchResult<SimarisData>>({
    queryKey:        ['ws:simaris'],
    queryFn:         fetchSimaris,
    enabled:         ready,
    staleTime:       60 * 60_000,    // 1 h
    refetchInterval: 60 * 60_000,
    retry:           2,
    networkMode:     'always',
  });

  async function forceRefetch() {
    await clearWsCache(WS_CACHE_KEYS.simaris);
    queryClient.removeQueries({ queryKey: ['ws:simaris'] });
    await refetch();
  }

  return {
    data:      result?.data ?? null,
    isLoading: !ready || isLoading,
    isError:   !!error,
    isStale:   !!result?.fromStaleCache,
    lastSync:  dataUpdatedAt,
    forceRefetch,
  };
}
