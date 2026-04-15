import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { SyncService } from '@/services/SyncService';
import {
  computeChallengeStatus,
  computeSortieStatus,
  computeArchonHuntStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import { getWeekStart } from '@/core/services/cycleService';
import type {
  NightwaveRaw,
  SortieRaw,
  ArchonHuntRaw,
  ChallengeKind,
  ChallengeStatus,
  SortieStatus,
  ArchonHuntStatus,
  StandingSummary,
} from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Composite hook for the Dailies & Weeklies tab (legacy entry-point).
 * Rewritten to read worldstate_master via useLiveQuery — no fetch calls,
 * no TanStack Query. SyncService owns the single write path.
 */
export function useDailiesWeeklies() {
  const wsEntry = useLiveQuery(
    () => db.cache.get('worldstate_master').then(e => e ?? null),
    []
  );

  const isLoading = wsEntry === undefined;
  const ws        = (wsEntry?.data ?? null) as Record<string, unknown> | null;
  const cachedAt  = wsEntry?.updatedAt ?? 0;

  // ── Local completion state ─────────────────────────────────────────────
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
    await SyncService.performSync(true);
  }

  // ── 1-second clock ────────────────────────────────────────────────────
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
    season,
    seasonTag,
  } = useMemo(() => {
    const empty = {
      grouped:          { daily: [], weekly: [], elite: [] } as Record<ChallengeKind, ChallengeStatus[]>,
      sortieStatus:     null as SortieStatus | null,
      archonHuntStatus: null as ArchonHuntStatus | null,
      standing:         { earned: 0, available: 0, pct: 0 } as StandingSummary,
      totalChallenges:  0,
      completedCount:   0,
      season:           0,
      seasonTag:        '',
    };

    if (!ws) return empty;

    const nwRaw     = (ws['nightwave']  ?? {}) as NightwaveRaw;
    const sortieRaw = ws['sortie']             as SortieRaw | undefined;
    const archonRaw = ws['archonHunt']         as ArchonHuntRaw | undefined;

    const challenges = (nwRaw.activeChallenges ?? []).map(c => ({
      ...c,
      reputation: Number(c.reputation) || 0,
    }));

    const statuses = challenges.map(c =>
      computeChallengeStatus(c, completedIds, now)
    );

    return {
      grouped:          groupChallenges(statuses),
      sortieStatus:     sortieRaw ? computeSortieStatus(sortieRaw, now) : null,
      archonHuntStatus: archonRaw ? computeArchonHuntStatus(archonRaw, now) : null,
      standing:         computeStanding(statuses),
      totalChallenges:  statuses.length,
      completedCount:   statuses.filter(s => s.completed).length,
      season:           nwRaw.season ?? 0,
      seasonTag:        nwRaw.tag    ?? '',
    };
  }, [ws, completedIds, now]);

  return {
    grouped,
    sortieStatus,
    archonHuntStatus,
    archonHuntLoading: isLoading,
    archonHuntError:   !isLoading && wsEntry === null ? new Error('No data') : null,
    standing,
    weeklyEarned,
    totalChallenges,
    completedCount,
    season,
    seasonTag,
    isLoading,
    isError:   !isLoading && wsEntry === null,
    lastSync:  cachedAt,
    now,
    toggleComplete,
    forceRefetch,
  };
}
