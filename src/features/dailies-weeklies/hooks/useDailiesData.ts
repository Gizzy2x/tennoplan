/**
 * useDailiesData — composite Dailies & Weeklies subscriber (Phase D.6).
 *
 * Reads ParsedWorldstate from the V2 worldstate store via useWorldstate(),
 * then maps Nightwave challenges, the daily Sortie, the weekly Archon Hunt,
 * and the active Deep Archimedea rotation onto the legacy domain shapes the
 * existing ascensionService compute functions consume.
 *
 * Also owns the user-side completion toggles (Nightwave per-challenge,
 * Sortie/Archon/EDA daily/weekly checkmarks) — these live in
 * db.userMarks and survive worldstate changes.
 *
 * Migration notes:
 *   • Legacy hook subscribed to `db.cache.get('worldstate_master')` and
 *     parsed RawCycle/SortieRaw/ArchonHuntRaw/ArchimedeaRaw directly. V2
 *     ParsedWorldstate exposes typed Unix-ms shapes; the worldstateAdapters
 *     module bridges them back to the `*Raw` shapes the compute helpers
 *     still expect.
 *   • Forced sync now flows through useWorldstate().forceRefetch() →
 *     WorldstateSync.sync(), not SyncService.performSync.
 *   • Cache age now comes straight from useWorldstate().ageMs.
 *
 * The return signature matches the legacy useDailiesData exactly.
 */

import { useMemo, useState, useEffect } from 'react';
import { db } from '@/adapters/storage/db';
import {
  computeChallengeStatus,
  computeSortieStatus,
  computeArchonHuntStatus,
  computeArchimedeaStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import { getWeekStart } from '@/core/services/cycleService';
import {
  apiToSortieRaw,
  apiToArchonHuntRaw,
  apiToArchimedeaRaw,
  apiToNightwaveChallengeRaw,
} from '@/core/services/worldstateAdapters';
import type {
  ArchimedeaStatus,
  SortieStatus,
  ArchonHuntStatus,
  ChallengeKind,
  ChallengeStatus,
  StandingSummary,
} from '@/core/domain/ascension';
import { useGameClock } from '@/hooks/useGameClock';
import { useWorldstate } from '@/hooks/useWorldstate';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailiesData() {
  const { data: ws, lastSync, ageMs, isLoading, isError, isStale, forceRefetch } =
    useWorldstate();

  // ── Shared global clock ──────────────────────────────────────────────
  const now = useGameClock();

  // ── Derived Nightwave (challenges + season) ──────────────────────────
  const nwChallenges = useMemo(() => {
    if (!ws?.nightwave) return null;
    return {
      challenges: ws.nightwave.challenges.map(apiToNightwaveChallengeRaw),
      season:     ws.nightwave.season,
      tag:        '', // V2 NightwaveInfo doesn't carry the seasonal tag string
    };
  }, [ws]);

  // ── Completion state ─────────────────────────────────────────────────
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

  // ── Sortie / Archon / Deep Archimedea completion toggles ─────────────
  const [sortieCompleted,  setSortieCompleted]  = useState(false);
  const [archonCompleted,  setArchonCompleted]  = useState(false);
  const [edaCompleted,     setEdaCompleted]     = useState(false);

  function todayKey():  string { return 'sortie:' + new Date().toISOString().slice(0, 10); }
  function archonKey(): string { return 'archon:' + getWeekStart(Date.now()); }
  function edaKey():    string { return 'eda:'    + getWeekStart(Date.now()); }

  async function loadCompletionToggles() {
    const [sortieRow, archonRow, edaRow] = await Promise.all([
      db.userMarks.where('[type+referenceId]').equals(['sortie', todayKey()]).first(),
      db.userMarks.where('[type+referenceId]').equals(['archon', archonKey()]).first(),
      db.userMarks.where('[type+referenceId]').equals(['eda',    edaKey()]).first(),
    ]);
    setSortieCompleted(!!sortieRow);
    setArchonCompleted(!!archonRow);
    setEdaCompleted(!!edaRow);
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

  async function toggleEdaCompleted() {
    setEdaCompleted(prev => !prev);
    const key = edaKey();
    const existing = await db.userMarks.where('[type+referenceId]').equals(['eda', key]).first();
    if (existing?.id != null) {
      await db.userMarks.delete(existing.id);
    } else {
      const ts = Date.now();
      await db.userMarks.add({ type: 'eda', referenceId: key, status: 'completed', createdAt: ts, updatedAt: ts });
    }
    await loadCompletionToggles();
  }

  // ── Derived state — Nightwave challenges ──────────────────────────────
  const { grouped, standing, totalChallenges, completedCount } = useMemo(() => {
    if (!nwChallenges) {
      return {
        grouped:         { daily: [], weekly: [], elite: [] } as Record<ChallengeKind, ChallengeStatus[]>,
        standing:        { earned: 0, available: 0, pct: 0 } as StandingSummary,
        totalChallenges: 0,
        completedCount:  0,
      };
    }

    const statuses = nwChallenges.challenges.map(c =>
      computeChallengeStatus(c, completedIds, now),
    );

    return {
      grouped:         groupChallenges(statuses),
      standing:        computeStanding(statuses),
      totalChallenges: statuses.length,
      completedCount:  statuses.filter(s => s.completed).length,
    };
  }, [nwChallenges, completedIds, now]);

  // ── Derived — Sortie + Archon Hunt + Deep Archimedea ─────────────────
  const { sortieStatus, archonHuntStatus, deepArchimedeaStatus } = useMemo((): {
    sortieStatus:          SortieStatus | null;
    archonHuntStatus:      ArchonHuntStatus | null;
    deepArchimedeaStatus:  ArchimedeaStatus | null;
  } => {
    if (!ws) return { sortieStatus: null, archonHuntStatus: null, deepArchimedeaStatus: null };

    const sortieRaw = ws.sortie     ? apiToSortieRaw(ws.sortie)         : null;
    const archonRaw = ws.archonHunt ? apiToArchonHuntRaw(ws.archonHunt) : null;
    // archimedeas is an array; take the first active entry
    const archInfo  = ws.archimedeas?.[0] ?? null;
    const archRaw   = archInfo ? apiToArchimedeaRaw(archInfo) : null;

    return {
      sortieStatus:         sortieRaw ? computeSortieStatus(sortieRaw, now)     : null,
      archonHuntStatus:     archonRaw ? computeArchonHuntStatus(archonRaw, now) : null,
      deepArchimedeaStatus: archRaw   ? computeArchimedeaStatus(archRaw, now)   : null,
    };
  }, [ws, now]);

  return {
    grouped,
    standing,
    weeklyEarned,
    totalChallenges,
    completedCount,
    sortieCompleted,
    archonCompleted,
    edaCompleted,
    sortieStatus,
    archonHuntStatus,
    deepArchimedeaStatus,
    season:    nwChallenges?.season ?? 0,
    seasonTag: nwChallenges?.tag    ?? '',
    isLoading,
    isError,
    isStale,
    cacheAgeMs:    Number.isFinite(ageMs) ? ageMs : 0,
    hasEverLoaded: !isLoading,
    lastSync,
    now,
    toggleComplete,
    toggleSortieCompleted,
    toggleArchonCompleted,
    toggleEdaCompleted,
    forceRefetch,
  };
}
