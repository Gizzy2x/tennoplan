import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/adapters/storage/db';
import {
  getWsCache,
  clearWsCache,
  WS_CACHE_KEYS,
} from '@/adapters/storage/worldstateCache';
import {
  fetchNightwaveWS,
  fetchSortieWS,
  fetchArchonHuntWS,
} from '@/adapters/api/dailiesAdapter';
import type { NightwavePayload, WSFetchResult } from '@/adapters/api/dailiesAdapter';
import {
  computeChallengeStatus,
  computeSortieStatus,
  computeArchonHuntStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import { getWeekStart } from '@/core/services/cycleService';
import type {
  ChallengeKind,
  ChallengeStatus,
  SortieRaw,
  ArchonHuntRaw,
  SortieStatus,
  ArchonHuntStatus,
  StandingSummary,
} from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Pre-load state — async Dexie reads before TanStack Query activates
// ---------------------------------------------------------------------------

interface PreloadState {
  nw:     WSFetchResult<NightwavePayload> | null;
  sortie: WSFetchResult<SortieRaw>        | null;
  archon: WSFetchResult<ArchonHuntRaw>    | null;
  ready:  boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Offline-first data hook for the Dailies & Weeklies tab.
 *
 * Offline-first pattern:
 *   1. On mount, all three Dexie cache entries are read in parallel.
 *   2. Once the pre-load resolves (always < 50 ms), queries are enabled.
 *   3. Cached data is passed as `initialData` + `initialDataUpdatedAt` so
 *      TanStack Query starts with real data immediately — no loading flash
 *      even when fully offline with stale cache.
 *   4. If `cachedAt` is older than `staleTime`, TQ background-refetches.
 *   5. If there is no cache AND no network, the query errors; `hasEverLoaded`
 *      will be false, triggering the first-sync onboarding card.
 */
export function useDailiesData() {
  const queryClient = useQueryClient();

  // ── Phase 1: async Dexie pre-load ─────────────────────────────────────
  const [preload, setPreload] = useState<PreloadState>({
    nw: null, sortie: null, archon: null, ready: false,
  });

  useEffect(() => {
    Promise.all([
      getWsCache<NightwavePayload>(WS_CACHE_KEYS.nightwave),
      getWsCache<SortieRaw>(WS_CACHE_KEYS.sortie),
      getWsCache<ArchonHuntRaw>(WS_CACHE_KEYS.archon),
    ]).then(([nw, sortie, archon]) => {
      setPreload({
        nw:     nw     ? { data: nw.data,     cachedAt: nw.cachedAt,     fromStaleCache: nw.isExpired     } : null,
        sortie: sortie ? { data: sortie.data, cachedAt: sortie.cachedAt, fromStaleCache: sortie.isExpired } : null,
        archon: archon ? { data: archon.data, cachedAt: archon.cachedAt, fromStaleCache: archon.isExpired } : null,
        ready:  true,
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: TanStack Query — enabled only after pre-load ─────────────

  const {
    data:          nwResult,
    isLoading:     nwLoading,
    error:         nwError,
    dataUpdatedAt: nwUpdatedAt,
    refetch:       refetchNW,
  } = useQuery<WSFetchResult<NightwavePayload>>({
    queryKey:             ['ws:nightwave'],
    queryFn:              fetchNightwaveWS,
    enabled:              preload.ready,
    initialData:          preload.nw ?? undefined,
    initialDataUpdatedAt: preload.nw?.cachedAt ?? 0,
    staleTime:            300_000,
    refetchInterval:      300_000,
    retry:                2,
    networkMode:          'always',
  });

  const {
    data:          sortieResult,
    isLoading:     sortieLoading,
    error:         sortieError,
    dataUpdatedAt: sortieUpdatedAt,
    refetch:       refetchSortie,
  } = useQuery<WSFetchResult<SortieRaw>>({
    queryKey:             ['ws:sortie'],
    queryFn:              fetchSortieWS,
    enabled:              preload.ready,
    initialData:          preload.sortie ?? undefined,
    initialDataUpdatedAt: preload.sortie?.cachedAt ?? 0,
    staleTime:            300_000,
    refetchInterval:      300_000,
    retry:                2,
    networkMode:          'always',
  });

  const {
    data:      archonResult,
    isLoading: archonLoading,
    error:     archonError,
    refetch:   refetchArchon,
  } = useQuery<WSFetchResult<ArchonHuntRaw>>({
    queryKey:             ['ws:archon'],
    queryFn:              fetchArchonHuntWS,
    enabled:              preload.ready,
    initialData:          preload.archon ?? undefined,
    initialDataUpdatedAt: preload.archon?.cachedAt ?? 0,
    staleTime:            3_600_000,
    refetchInterval:      3_600_000,
    retry:                2,
    networkMode:          'always',
  });

  // ── Completion state (identical to useDailiesWeeklies) ─────────────────
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [weeklyEarned, setWeeklyEarned] = useState(0);

  async function loadMarks() {
    const marks = await db.userMarks.where('type').equals('ascension').toArray();
    setCompletedIds(new Set(marks.map(m => m.referenceId)));

    const ws = getWeekStart(Date.now());
    const earned = marks.reduce((sum, m) => {
      const meta = m.metadata as { reputation?: number; weekStart?: number } | undefined;
      if (meta?.weekStart === ws) return sum + (meta.reputation ?? 0);
      return sum;
    }, 0);
    setWeeklyEarned(earned);
  }

  useEffect(() => { loadMarks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleComplete(challengeId: string, reputation: number) {
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.has(challengeId) ? next.delete(challengeId) : next.add(challengeId);
      return next;
    });

    const existing = await db.userMarks
      .where('[type+referenceId]')
      .equals(['ascension', challengeId])
      .first();

    if (existing?.id != null) {
      await db.userMarks.delete(existing.id);
    } else {
      const now = Date.now();
      await db.userMarks.add({
        type:        'ascension',
        referenceId: challengeId,
        status:      'completed',
        metadata:    { reputation, weekStart: getWeekStart(now) },
        createdAt:   now,
        updatedAt:   now,
      });
    }

    await loadMarks();
  }

  // ── Force refresh ──────────────────────────────────────────────────────
  async function forceRefetch() {
    await clearWsCache(
      WS_CACHE_KEYS.nightwave,
      WS_CACHE_KEYS.sortie,
      WS_CACHE_KEYS.archon,
    );
    queryClient.removeQueries({ queryKey: ['ws:nightwave'] });
    queryClient.removeQueries({ queryKey: ['ws:sortie'] });
    queryClient.removeQueries({ queryKey: ['ws:archon'] });
    await Promise.all([refetchNW(), refetchSortie(), refetchArchon()]);
  }

  // ── 1-second clock ─────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────
  const nwData     = nwResult?.data;
  const sortieData = sortieResult?.data;
  const archonData = archonResult?.data;

  const {
    grouped,
    sortieStatus,
    archonHuntStatus,
    standing,
    totalChallenges,
    completedCount,
  } = useMemo(() => {
    if (!nwData) {
      return {
        grouped:          { daily: [], weekly: [], elite: [] } as Record<ChallengeKind, ChallengeStatus[]>,
        sortieStatus:     null as SortieStatus | null,
        archonHuntStatus: null as ArchonHuntStatus | null,
        standing:         { earned: 0, available: 0, pct: 0 } as StandingSummary,
        totalChallenges:  0,
        completedCount:   0,
      };
    }

    const statuses = nwData.challenges.map(c =>
      computeChallengeStatus(c, completedIds, now)
    );

    return {
      grouped:          groupChallenges(statuses),
      sortieStatus:     sortieData ? computeSortieStatus(sortieData, now) : null,
      archonHuntStatus: archonData ? computeArchonHuntStatus(archonData, now) : null,
      standing:         computeStanding(statuses),
      totalChallenges:  statuses.length,
      completedCount:   statuses.filter(s => s.completed).length,
    };
  }, [nwData, sortieData, archonData, completedIds, now]);

  // ── Offline / staleness signals ─────────────────────────────────────────
  // isStale: at least one active query is serving expired Dexie data
  const isStale = !!(
    nwResult?.fromStaleCache ||
    sortieResult?.fromStaleCache ||
    archonResult?.fromStaleCache
  );

  // cacheAgeMs: age of the oldest cached item being shown (worst case)
  const cachedAts = [nwResult?.cachedAt, sortieResult?.cachedAt, archonResult?.cachedAt]
    .filter((t): t is number => t != null);
  const oldestCachedAt = cachedAts.length > 0 ? Math.min(...cachedAts) : now;
  const cacheAgeMs = getCacheAgeMs(oldestCachedAt, now);

  // hasEverLoaded: false only on true first launch (no cache, query still pending)
  const hasEverLoaded = !!(nwData || (!nwLoading && !nwError));

  const lastSync = nwUpdatedAt || sortieUpdatedAt || 0;

  return {
    grouped,
    sortieStatus,
    archonHuntStatus,
    archonHuntLoading: archonLoading,
    archonHuntError:   archonError,
    standing,
    weeklyEarned,
    totalChallenges,
    completedCount,
    season:        nwData?.season  ?? 0,
    seasonTag:     nwData?.tag     ?? '',
    isLoading:     !preload.ready || nwLoading || sortieLoading,
    isError:       !!nwError || !!sortieError,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    lastSync,
    now,
    toggleComplete,
    forceRefetch,
  };
}
