import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/adapters/storage/db';
import { fetchNightwave, fetchSortie, fetchArchonHunt } from '@/adapters/api/ascensionAdapter';
import {
  computeChallengeStatus,
  computeSortieStatus,
  computeArchonHuntStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import { getWeekStart } from '@/core/services/cycleService';
import type { ChallengeKind, ChallengeStatus, SortieStatus, ArchonHuntStatus, StandingSummary } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides live challenge statuses and Sortie for the Dailies & Weeklies tab.
 *
 * - React Query fetches Nightwave + Sortie (5 min poll), with Dexie fallback.
 * - Local completion state lives in userMarks (Dexie), loaded once on mount.
 *   Optimistic updates via setState so toggles feel instant.
 * - `weeklyEarned` sums metadata.reputation from all marks this UTC week,
 *   so standing stays correct even after daily challenges expire from the API.
 * - A 1-second interval ticks `now` for daily countdowns without re-fetching.
 */
export function useDailiesWeeklies() {
  const queryClient = useQueryClient();

  // ── Nightwave query ────────────────────────────────────────────────────
  const {
    data:          nwData,
    isLoading:     nwLoading,
    error:         nwError,
    dataUpdatedAt: nwUpdatedAt,
    refetch:       refetchNW,
  } = useQuery({
    queryKey:        ['nightwave'],
    queryFn:         fetchNightwave,
    staleTime:       300_000,
    refetchInterval: 300_000,
    retry:           2,
    networkMode:     'always',
  });

  // ── Sortie query ───────────────────────────────────────────────────────
  const {
    data:          sortieData,
    isLoading:     sortieLoading,
    error:         sortieError,
    dataUpdatedAt: sortieUpdatedAt,
    refetch:       refetchSortie,
  } = useQuery({
    queryKey:        ['sortie'],
    queryFn:         fetchSortie,
    staleTime:       300_000,
    refetchInterval: 300_000,
    retry:           2,
    networkMode:     'always',
  });

  // ── Archon Hunt query ──────────────────────────────────────────────────
  const {
    data:      archonHuntData,
    isLoading: archonHuntLoading,
    error:     archonHuntError,
    refetch:   refetchArchonHunt,
  } = useQuery({
    queryKey:        ['archonHunt'],
    queryFn:         fetchArchonHunt,
    staleTime:       3_600_000,
    refetchInterval: 3_600_000,
    retry:           2,
    networkMode:     'always',
  });

  // ── Local completion state ─────────────────────────────────────────────
  const [completedIds,  setCompletedIds]  = useState<Set<string>>(new Set());
  const [weeklyEarned,  setWeeklyEarned]  = useState(0);

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
    // Optimistic update first for instant UI response
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(challengeId)) {
        next.delete(challengeId);
      } else {
        next.add(challengeId);
      }
      return next;
    });

    // Persist to Dexie
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

    // Reload to keep weeklyEarned accurate
    await loadMarks();
  }

  // ── Force refresh — clears Dexie cache + React Query cache then refetches
  async function forceRefetch() {
    await Promise.all([
      db.cache.delete('nightwave:all'),
      db.cache.delete('sortie:daily'),
      db.cache.delete('archonHunt:weekly'),
    ]);
    queryClient.removeQueries({ queryKey: ['nightwave'] });
    queryClient.removeQueries({ queryKey: ['sortie'] });
    queryClient.removeQueries({ queryKey: ['archonHunt'] });
    await Promise.all([refetchNW(), refetchSortie(), refetchArchonHunt()]);
  }

  // ── 1-second clock ────────────────────────────────────────────────────
  // Drives daily countdown timers. Weekly/elite msRemaining is recomputed
  // each tick but their "Xd Yh" format only changes hourly — imperceptible.
  //
  // TODO: EE.log integration — Tauri FS plugin will let us tail EE.log for
  // "NightwaveChallengeCompleted" / "SortieCompleted" entries, auto-marking
  // challenges without manual toggle. userMarks (Dexie) stays source of truth.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────
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

    const sortieStatus = sortieData
      ? computeSortieStatus(sortieData, now)
      : null;

    const archonHuntStatus = archonHuntData
      ? computeArchonHuntStatus(archonHuntData, now)
      : null;

    return {
      grouped:         groupChallenges(statuses),
      sortieStatus,
      archonHuntStatus,
      standing:        computeStanding(statuses),
      totalChallenges: statuses.length,
      completedCount:  statuses.filter(s => s.completed).length,
    };
  }, [nwData, sortieData, archonHuntData, completedIds, now]);

  const lastSync = nwUpdatedAt || sortieUpdatedAt || 0;

  return {
    grouped,
    sortieStatus,
    archonHuntStatus,
    archonHuntLoading,
    archonHuntError,
    standing,
    weeklyEarned,
    totalChallenges,
    completedCount,
    season:       nwData?.season  ?? 0,
    seasonTag:    nwData?.tag     ?? '',
    isLoading:    nwLoading || sortieLoading,
    isError:      !!nwError || !!sortieError,
    lastSync,
    now,
    toggleComplete,
    forceRefetch,
  };
}
