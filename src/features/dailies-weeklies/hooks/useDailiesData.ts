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
} from '@/adapters/api/dailiesAdapter';
import type { NightwavePayload, WSFetchResult } from '@/adapters/api/dailiesAdapter';
import {
  computeChallengeStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import { getWeekStart } from '@/core/services/cycleService';
import type {
  ChallengeKind,
  ChallengeStatus,
  StandingSummary,
} from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Pre-load state — async Dexie reads before TanStack Query activates
// ---------------------------------------------------------------------------

interface PreloadState {
  nw:    WSFetchResult<NightwavePayload> | null;
  ready: boolean;
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
  const [preload, setPreload] = useState<PreloadState>({ nw: null, ready: false });

  useEffect(() => {
    getWsCache<NightwavePayload>(WS_CACHE_KEYS.nightwave).then(nw => {
      setPreload({
        nw: nw ? { data: nw.data, cachedAt: nw.cachedAt, fromStaleCache: nw.isExpired } : null,
        ready: true,
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
    await clearWsCache(WS_CACHE_KEYS.nightwave);
    queryClient.removeQueries({ queryKey: ['ws:nightwave'] });
    await refetchNW();
  }

  // ── 1-second clock ─────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────
  const nwData = nwResult?.data;

  const {
    grouped,
    standing,
    totalChallenges,
    completedCount,
  } = useMemo(() => {
    if (!nwData) {
      return {
        grouped:         { daily: [], weekly: [], elite: [] } as Record<ChallengeKind, ChallengeStatus[]>,
        standing:        { earned: 0, available: 0, pct: 0 } as StandingSummary,
        totalChallenges: 0,
        completedCount:  0,
      };
    }

    const statuses = (nwData.challenges ?? []).map(c =>
      computeChallengeStatus(c, completedIds, now)
    );

    return {
      grouped:         groupChallenges(statuses),
      standing:        computeStanding(statuses),
      totalChallenges: statuses.length,
      completedCount:  statuses.filter(s => s.completed).length,
    };
  }, [nwData, completedIds, now]);

  // ── Sortie / Archon completion toggles (time-keyed, no API needed) ────────
  const [sortieCompleted,  setSortieCompleted]  = useState(false);
  const [archonCompleted,  setArchonCompleted]  = useState(false);

  function todayKey(): string {
    return 'sortie:' + new Date().toISOString().slice(0, 10);
  }
  function archonKey(): string {
    return 'archon:' + getWeekStart(Date.now());
  }

  async function loadCompletionToggles() {
    const [sortieRow, archonRow] = await Promise.all([
      db.userMarks.where('[type+referenceId]').equals(['sortie', todayKey()]).first(),
      db.userMarks.where('[type+referenceId]').equals(['archon', archonKey()]).first(),
    ]);
    setSortieCompleted(!!sortieRow);
    setArchonCompleted(!!archonRow);
  }

  useEffect(() => { loadCompletionToggles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleSortieCompleted() {
    setSortieCompleted(prev => !prev);
    const key = todayKey();
    const existing = await db.userMarks.where('[type+referenceId]').equals(['sortie', key]).first();
    if (existing?.id != null) {
      await db.userMarks.delete(existing.id);
    } else {
      const ts = Date.now();
      await db.userMarks.add({ type: 'sortie', referenceId: key, status: 'completed', createdAt: ts, updatedAt: ts });
    }
    await loadCompletionToggles();
  }

  async function toggleArchonCompleted() {
    setArchonCompleted(prev => !prev);
    const key = archonKey();
    const existing = await db.userMarks.where('[type+referenceId]').equals(['archon', key]).first();
    if (existing?.id != null) {
      await db.userMarks.delete(existing.id);
    } else {
      const ts = Date.now();
      await db.userMarks.add({ type: 'archon', referenceId: key, status: 'completed', createdAt: ts, updatedAt: ts });
    }
    await loadCompletionToggles();
  }

  // ── Offline / staleness signals ─────────────────────────────────────────
  const isStale       = !!nwResult?.fromStaleCache;
  const cacheAgeMs    = getCacheAgeMs(nwResult?.cachedAt ?? now, now);
  const hasEverLoaded = !!(nwData || (!nwLoading && !nwError));
  const lastSync      = nwUpdatedAt || 0;

  return {
    grouped,
    standing,
    weeklyEarned,
    totalChallenges,
    completedCount,
    sortieCompleted,
    archonCompleted,
    season:    nwData?.season ?? 0,
    seasonTag: nwData?.tag    ?? '',
    isLoading:     !preload.ready || nwLoading,
    isError:       !!nwError,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    lastSync,
    now,
    toggleComplete,
    toggleSortieCompleted,
    toggleArchonCompleted,
    forceRefetch,
  };
}
