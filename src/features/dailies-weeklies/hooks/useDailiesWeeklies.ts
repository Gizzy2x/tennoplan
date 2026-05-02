/**
 * useDailiesWeeklies — composite Dailies & Weeklies subscriber (Phase D.6).
 *
 * Reads ParsedWorldstate from the V2 worldstate store via useWorldstate()
 * and projects Nightwave / Sortie / Archon Hunt onto the legacy domain
 * shapes the existing rendering helpers (groupChallenges, computeStanding,
 * computeSortieStatus, computeArchonHuntStatus) consume.
 *
 * Migration notes:
 *   • Legacy hook subscribed to `db.cache.get('worldstate_master')` and
 *     parsed RawNightwave/SortieRaw/ArchonHuntRaw directly. V2 emits
 *     normalised Unix-ms shapes; the worldstateAdapters module bridges
 *     them back to the `*Raw` shapes the compute helpers still expect.
 *   • Forced sync now flows through useWorldstate().forceRefetch() →
 *     WorldstateSync.sync(), not SyncService.performSync.
 *
 * The return signature matches the legacy useDailiesWeeklies exactly.
 */

import { useMemo, useState, useEffect } from 'react';
import { db } from '@/adapters/storage/db';
import {
  computeChallengeStatus,
  computeSortieStatus,
  computeArchonHuntStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import { getWeekStart } from '@/core/services/cycleService';
import {
  apiToSortieRaw,
  apiToArchonHuntRaw,
  apiToNightwaveChallengeRaw,
} from '@/core/services/worldstateAdapters';
import type {
  ChallengeKind,
  ChallengeStatus,
  SortieStatus,
  ArchonHuntStatus,
  StandingSummary,
} from '@/core/domain/ascension';
import { useGameClock } from '@/hooks/useGameClock';
import { useWorldstate } from '@/hooks/useWorldstate';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailiesWeeklies() {
  const { data: ws, lastSync, isLoading, isError, forceRefetch } =
    useWorldstate();

  // ── Local completion state ─────────────────────────────────────────────
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [weeklyEarned, setWeeklyEarned] = useState(0);

  async function loadMarks() {
    const marks = await db.userMarks.where('type').equals('ascension').toArray();
    setCompletedIds(new Set(marks.map(m => m.referenceId)));

    const weekStart = getWeekStart(Date.now());
    const earned = marks.reduce((sum, m) => {
      const meta = m.metadata as { reputation?: number; weekStart?: number } | undefined;
      if (meta?.weekStart === weekStart) return sum + (meta.reputation ?? 0);
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
      const ts = Date.now();
      await db.userMarks.add({
        type:        'ascension',
        referenceId: challengeId,
        status:      'completed',
        metadata:    { reputation, weekStart: getWeekStart(ts) },
        createdAt:   ts,
        updatedAt:   ts,
      });
    }

    await loadMarks();
  }

  // ── Shared global clock ──────────────────────────────────────────────
  const now = useGameClock();

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

    const challenges = (ws.nightwave?.challenges ?? []).map(apiToNightwaveChallengeRaw);
    const sortieRaw  = ws.sortie     ? apiToSortieRaw(ws.sortie)         : null;
    const archonRaw  = ws.archonHunt ? apiToArchonHuntRaw(ws.archonHunt) : null;

    const statuses = challenges.map(c =>
      computeChallengeStatus(c, completedIds, now),
    );

    return {
      grouped:          groupChallenges(statuses),
      sortieStatus:     sortieRaw ? computeSortieStatus(sortieRaw, now)     : null,
      archonHuntStatus: archonRaw ? computeArchonHuntStatus(archonRaw, now) : null,
      standing:         computeStanding(statuses),
      totalChallenges:  statuses.length,
      completedCount:   statuses.filter(s => s.completed).length,
      season:           ws.nightwave?.season ?? 0,
      seasonTag:        '', // V2 NightwaveInfo doesn't carry the seasonal tag
    };
  }, [ws, completedIds, now]);

  return {
    grouped,
    sortieStatus,
    archonHuntStatus,
    archonHuntLoading: isLoading,
    archonHuntError:   isError ? new Error('No data') : null,
    standing,
    weeklyEarned,
    totalChallenges,
    completedCount,
    season,
    seasonTag,
    isLoading,
    isError,
    lastSync,
    now,
    toggleComplete,
    forceRefetch,
  };
}
