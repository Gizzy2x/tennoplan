import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAlerts,
  fetchInvasions,
  fetchDarvoDeals,
  fetchVoidTrader,
  fetchSteelPath,
  fetchPersistentEnemies,
  fetchNews,
  fetchSortieWS,
  fetchArchonHuntWS,
} from '@/adapters/api/railAdapter';
import {
  getWsCache,
  clearWsCache,
  WS_CACHE_KEYS,
} from '@/adapters/storage/worldstateCache';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import {
  computeAlertStatus,
  computeInvasionStatus,
  computeDarvoDealStatus,
  computeVoidTraderStatus,
  computeSteelPathStatus,
  computePersistentEnemyStatus,
  filterActiveAlerts,
  filterActiveEnemies,
  sortAlertsByExpiry,
  sortInvasionsByCompletion,
  sortAndTrimNews,
} from '@/core/services/railService';
import {
  computeSortieStatus,
  computeArchonHuntStatus,
} from '@/core/services/ascensionService';
import type { WSFetchResult } from '@/adapters/api/types';
import type {
  Alert,
  AlertStatus,
  DarvoDeal,
  DarvoDealStatus,
  Invasion,
  InvasionStatus,
  NewsItem,
  PersistentEnemy,
  PersistentEnemyStatus,
  SteelPath,
  SteelPathStatus,
  VoidTrader,
  VoidTraderStatus,
} from '@/core/domain/railFeed';
import type { SortieRaw, ArchonHuntRaw, SortieStatus, ArchonHuntStatus } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Pre-load state
// ---------------------------------------------------------------------------

interface PreloadState {
  alerts:            WSFetchResult<Alert[]>          | null;
  invasions:         WSFetchResult<Invasion[]>       | null;
  darvoDeals:        WSFetchResult<DarvoDeal[]>      | null;
  voidTrader:        WSFetchResult<VoidTrader>       | null;
  steelPath:         WSFetchResult<SteelPath>        | null;
  persistentEnemies: WSFetchResult<PersistentEnemy[]>| null;
  news:              WSFetchResult<NewsItem[]>       | null;
  sortie:            WSFetchResult<SortieRaw>        | null;
  archon:            WSFetchResult<ArchonHuntRaw>    | null;
  ready:             boolean;
}

function cacheToResult<T>(cached: Awaited<ReturnType<typeof getWsCache<T>>>): WSFetchResult<T> | null {
  if (!cached) return null;
  return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: cached.isExpired };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Composite hook for the Solar Rail Feed tab.
 * Covers 9 data streams: alerts, invasions, darvo, voidTrader, steelPath,
 * persistentEnemies, news, sortie, archonHunt.
 *
 * Offline-first: Dexie pre-load → TQ with initialData → 1s clock → derived state.
 */
export function useSolarRailFeed() {
  const queryClient = useQueryClient();

  // ── Phase 1: async Dexie pre-load (all 9 in parallel) ────────────────────
  const [preload, setPreload] = useState<PreloadState>({
    alerts: null, invasions: null, darvoDeals: null, voidTrader: null,
    steelPath: null, persistentEnemies: null, news: null,
    sortie: null, archon: null, ready: false,
  });

  useEffect(() => {
    Promise.all([
      getWsCache<Alert[]>(WS_CACHE_KEYS.alerts),
      getWsCache<Invasion[]>(WS_CACHE_KEYS.invasions),
      getWsCache<DarvoDeal[]>(WS_CACHE_KEYS.darvoDeals),
      getWsCache<VoidTrader>(WS_CACHE_KEYS.voidTrader),
      getWsCache<SteelPath>(WS_CACHE_KEYS.steelPath),
      getWsCache<PersistentEnemy[]>(WS_CACHE_KEYS.persistentEnemies),
      getWsCache<NewsItem[]>(WS_CACHE_KEYS.news),
      getWsCache<SortieRaw>(WS_CACHE_KEYS.sortie),
      getWsCache<ArchonHuntRaw>(WS_CACHE_KEYS.archon),
    ]).then(([alerts, invasions, darvoDeals, voidTrader, steelPath, persistentEnemies, news, sortie, archon]) => {
      setPreload({
        alerts:            cacheToResult(alerts),
        invasions:         cacheToResult(invasions),
        darvoDeals:        cacheToResult(darvoDeals),
        voidTrader:        cacheToResult(voidTrader),
        steelPath:         cacheToResult(steelPath),
        persistentEnemies: cacheToResult(persistentEnemies),
        news:              cacheToResult(news),
        sortie:            cacheToResult(sortie),
        archon:            cacheToResult(archon),
        ready:             true,
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: TanStack Query — 9 queries ──────────────────────────────────

  const enabled = preload.ready;

  const { data: alertsResult,   isLoading: alertsLoading,   error: alertsError,   dataUpdatedAt: alertsUpdatedAt,   refetch: refetchAlerts   } =
    useQuery<WSFetchResult<Alert[]>>({
      queryKey: ['ws:alerts'], queryFn: fetchAlerts, enabled,
      initialData: preload.alerts ?? undefined, initialDataUpdatedAt: preload.alerts?.cachedAt ?? 0,
      staleTime: 30_000, refetchInterval: 30_000, retry: 2, networkMode: 'always',
    });

  const { data: invasionsResult, isLoading: invasionsLoading, error: invasionsError, refetch: refetchInvasions } =
    useQuery<WSFetchResult<Invasion[]>>({
      queryKey: ['ws:invasions'], queryFn: fetchInvasions, enabled,
      initialData: preload.invasions ?? undefined, initialDataUpdatedAt: preload.invasions?.cachedAt ?? 0,
      staleTime: 60_000, refetchInterval: 60_000, retry: 2, networkMode: 'always',
    });

  const { data: darvoResult, isLoading: darvoLoading, error: darvoError, refetch: refetchDarvo } =
    useQuery<WSFetchResult<DarvoDeal[]>>({
      queryKey: ['ws:darvoDeals'], queryFn: fetchDarvoDeals, enabled,
      initialData: preload.darvoDeals ?? undefined, initialDataUpdatedAt: preload.darvoDeals?.cachedAt ?? 0,
      staleTime: 300_000, refetchInterval: 300_000, retry: 2, networkMode: 'always',
    });

  const { data: voidTraderResult, isLoading: voidTraderLoading, error: voidTraderError, refetch: refetchVoidTrader } =
    useQuery<WSFetchResult<VoidTrader>>({
      queryKey: ['ws:voidTrader'], queryFn: fetchVoidTrader, enabled,
      initialData: preload.voidTrader ?? undefined, initialDataUpdatedAt: preload.voidTrader?.cachedAt ?? 0,
      staleTime: 60_000, refetchInterval: 60_000, retry: 2, networkMode: 'always',
    });

  const { data: steelPathResult, isLoading: steelPathLoading, error: steelPathError, refetch: refetchSteelPath } =
    useQuery<WSFetchResult<SteelPath>>({
      queryKey: ['ws:steelPath'], queryFn: fetchSteelPath, enabled,
      initialData: preload.steelPath ?? undefined, initialDataUpdatedAt: preload.steelPath?.cachedAt ?? 0,
      staleTime: 300_000, refetchInterval: 300_000, retry: 2, networkMode: 'always',
    });

  const { data: enemiesResult, isLoading: enemiesLoading, error: enemiesError, refetch: refetchEnemies } =
    useQuery<WSFetchResult<PersistentEnemy[]>>({
      queryKey: ['ws:persistentEnemies'], queryFn: fetchPersistentEnemies, enabled,
      initialData: preload.persistentEnemies ?? undefined, initialDataUpdatedAt: preload.persistentEnemies?.cachedAt ?? 0,
      staleTime: 60_000, refetchInterval: 60_000, retry: 2, networkMode: 'always',
    });

  const { data: newsResult, isLoading: newsLoading, error: newsError, refetch: refetchNews } =
    useQuery<WSFetchResult<NewsItem[]>>({
      queryKey: ['ws:news'], queryFn: fetchNews, enabled,
      initialData: preload.news ?? undefined, initialDataUpdatedAt: preload.news?.cachedAt ?? 0,
      staleTime: 300_000, refetchInterval: 300_000, retry: 2, networkMode: 'always',
    });

  const { data: sortieResult, isLoading: sortieLoading, error: sortieError, refetch: refetchSortie } =
    useQuery<WSFetchResult<SortieRaw>>({
      queryKey: ['ws:sortie'], queryFn: fetchSortieWS, enabled,
      initialData: preload.sortie ?? undefined, initialDataUpdatedAt: preload.sortie?.cachedAt ?? 0,
      staleTime: 300_000, refetchInterval: 300_000, retry: 2, networkMode: 'always',
    });

  const { data: archonResult, isLoading: archonLoading, error: archonError, refetch: refetchArchon } =
    useQuery<WSFetchResult<ArchonHuntRaw>>({
      queryKey: ['ws:archon'], queryFn: fetchArchonHuntWS, enabled,
      initialData: preload.archon ?? undefined, initialDataUpdatedAt: preload.archon?.cachedAt ?? 0,
      staleTime: 3_600_000, refetchInterval: 3_600_000, retry: 2, networkMode: 'always',
    });

  // ── Force refresh ─────────────────────────────────────────────────────────
  async function forceRefetch() {
    await clearWsCache(
      WS_CACHE_KEYS.alerts,
      WS_CACHE_KEYS.invasions,
      WS_CACHE_KEYS.darvoDeals,
      WS_CACHE_KEYS.voidTrader,
      WS_CACHE_KEYS.steelPath,
      WS_CACHE_KEYS.persistentEnemies,
      WS_CACHE_KEYS.news,
      WS_CACHE_KEYS.sortie,
      WS_CACHE_KEYS.archon,
    );
    queryClient.removeQueries({ queryKey: ['ws:alerts'] });
    queryClient.removeQueries({ queryKey: ['ws:invasions'] });
    queryClient.removeQueries({ queryKey: ['ws:darvoDeals'] });
    queryClient.removeQueries({ queryKey: ['ws:voidTrader'] });
    queryClient.removeQueries({ queryKey: ['ws:steelPath'] });
    queryClient.removeQueries({ queryKey: ['ws:persistentEnemies'] });
    queryClient.removeQueries({ queryKey: ['ws:news'] });
    queryClient.removeQueries({ queryKey: ['ws:sortie'] });
    queryClient.removeQueries({ queryKey: ['ws:archon'] });
    await Promise.all([
      refetchAlerts(), refetchInvasions(), refetchDarvo(), refetchVoidTrader(),
      refetchSteelPath(), refetchEnemies(), refetchNews(), refetchSortie(), refetchArchon(),
    ]);
  }

  // ── 1-second clock ────────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const {
    alertStatuses,
    invasionStatuses,
    darvoDealStatuses,
    voidTraderStatus,
    steelPathStatus,
    enemyStatuses,
    newsItems,
    sortieStatus,
    archonHuntStatus,
  } = useMemo(() => {
    const alertData    = alertsResult?.data    ?? [];
    const invasionData = invasionsResult?.data ?? [];
    const darvoData    = darvoResult?.data     ?? [];
    const enemyData    = enemiesResult?.data   ?? [];
    const newsData     = newsResult?.data      ?? [];

    const activeAlerts   = filterActiveAlerts(alertData, now);
    const activeEnemies  = filterActiveEnemies(enemyData);

    const alertStatuses: AlertStatus[] =
      sortAlertsByExpiry(activeAlerts).map(a => computeAlertStatus(a, now));

    const invasionStatuses: InvasionStatus[] =
      sortInvasionsByCompletion(invasionData).map(computeInvasionStatus);

    const darvoDealStatuses: DarvoDealStatus[] =
      darvoData.map(d => computeDarvoDealStatus(d, now));

    const voidTraderStatus: VoidTraderStatus | null =
      voidTraderResult?.data ? computeVoidTraderStatus(voidTraderResult.data, now) : null;

    const steelPathStatus: SteelPathStatus | null =
      steelPathResult?.data ? computeSteelPathStatus(steelPathResult.data, now) : null;

    const enemyStatuses: PersistentEnemyStatus[] =
      activeEnemies.map(computePersistentEnemyStatus);

    const newsItems: NewsItem[] = sortAndTrimNews(newsData);

    const sortieStatus: SortieStatus | null =
      sortieResult?.data ? computeSortieStatus(sortieResult.data, now) : null;

    const archonHuntStatus: ArchonHuntStatus | null =
      archonResult?.data ? computeArchonHuntStatus(archonResult.data, now) : null;

    return {
      alertStatuses, invasionStatuses, darvoDealStatuses,
      voidTraderStatus, steelPathStatus, enemyStatuses,
      newsItems, sortieStatus, archonHuntStatus,
    };
  }, [alertsResult, invasionsResult, darvoResult, voidTraderResult, steelPathResult, enemiesResult, newsResult, sortieResult, archonResult, now]);

  // ── Offline / staleness signals ───────────────────────────────────────────
  const allResults = [
    alertsResult, invasionsResult, darvoResult, voidTraderResult,
    steelPathResult, enemiesResult, newsResult, sortieResult, archonResult,
  ];

  const isStale = allResults.some(r => r?.fromStaleCache);

  // isError only if ALL queries errored (partial data is still useful)
  const allErrors = [
    alertsError, invasionsError, darvoError, voidTraderError,
    steelPathError, enemiesError, newsError, sortieError, archonError,
  ];
  const isError = allErrors.every(e => e != null) && allResults.every(r => !r);

  const anyLoading =
    alertsLoading || invasionsLoading || darvoLoading || voidTraderLoading ||
    steelPathLoading || enemiesLoading || newsLoading || sortieLoading || archonLoading;

  const isLoading = !preload.ready || anyLoading;

  const hasAnyData = allResults.some(r => r != null);
  const hasEverLoaded = hasAnyData || (!anyLoading && !isError);

  // Age of the oldest cached item being shown
  const cachedAts = allResults
    .map(r => r?.cachedAt)
    .filter((t): t is number => t != null);
  const oldestCachedAt = cachedAts.length > 0 ? Math.min(...cachedAts) : now;
  const cacheAgeMs = getCacheAgeMs(oldestCachedAt, now);

  const lastSync = alertsUpdatedAt || 0;

  return {
    alertStatuses,
    invasionStatuses,
    darvoDealStatuses,
    voidTraderStatus,
    steelPathStatus,
    enemyStatuses,
    newsItems,
    sortieStatus,
    archonHuntStatus,
    totalAlerts:    alertStatuses.length,
    totalInvasions: invasionStatuses.length,
    isLoading,
    isError,
    isStale,
    hasEverLoaded,
    cacheAgeMs,
    lastSync,
    now,
    forceRefetch,
  };
}
