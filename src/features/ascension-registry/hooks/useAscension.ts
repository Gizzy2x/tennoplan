import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/adapters/storage/db';
import { fetchNightwave, fetchSortie } from '@/adapters/api/ascensionAdapter';
import {
  computeChallengeStatus,
  computeSortieStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import type { ChallengeKind, ChallengeStatus, SortieStatus, StandingSummary } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides live challenge statuses and Sortie for the Ascension Registry tab.
 *
 * - React Query fetches Nightwave + Sortie (5 min poll), with Dexie fallback.
 * - Local completion state lives in userMarks (Dexie), loaded once on mount.
 *   Optimistic updates via setState so toggles feel instant.
 * - A 1-second interval ticks `now` for daily countdowns without re-fetching.
 */
export function useAscension() {
  // ── Nightwave query ────────────────────────────────────────────────────
  const {
    data:          nwData,
    isLoading:     nwLoading,
    error:         nwError,
    dataUpdatedAt: nwUpdatedAt,
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
  } = useQuery({
    queryKey:        ['sortie'],
    queryFn:         fetchSortie,
    staleTime:       300_000,
    refetchInterval: 300_000,
    retry:           2,
    networkMode:     'always',
  });

  // ── Local completion state ─────────────────────────────────────────────
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    db.userMarks
      .where('type').equals('ascension')
      .toArray()
      .then(marks => setCompletedIds(new Set(marks.map(m => m.referenceId))));
  }, []);

  async function toggleComplete(challengeId: string) {
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
        createdAt:   now,
        updatedAt:   now,
      });
    }
  }

  // ── 1-second clock for daily countdowns ───────────────────────────────
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────
  const {
    grouped,
    sortieStatus,
    standing,
    totalChallenges,
    completedCount,
  } = useMemo(() => {
    if (!nwData) {
      return {
        grouped:          { daily: [], weekly: [], elite: [] } as Record<ChallengeKind, ChallengeStatus[]>,
        sortieStatus:     null as SortieStatus | null,
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

    return {
      grouped:         groupChallenges(statuses),
      sortieStatus,
      standing:        computeStanding(statuses),
      totalChallenges: statuses.length,
      completedCount:  statuses.filter(s => s.completed).length,
    };
  }, [nwData, sortieData, completedIds, now]);

  const lastSync = nwUpdatedAt || sortieUpdatedAt || 0;

  return {
    grouped,
    sortieStatus,
    standing,
    totalChallenges,
    completedCount,
    season:       nwData?.season  ?? 0,
    seasonTag:    nwData?.tag     ?? '',
    isLoading:    nwLoading || sortieLoading,
    isError:      !!nwError || !!sortieError,
    lastSync,
    now,
    toggleComplete,
  };
}
