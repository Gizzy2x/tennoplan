import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { SyncService } from '@/services/SyncService';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import {
  computeChallengeStatus,
  computeSortieStatus,
  computeArchonHuntStatus,
  computeArchimedeaStatus,
  groupChallenges,
  computeStanding,
} from '@/core/services/ascensionService';
import { getWeekStart } from '@/core/services/cycleService';
import type {
  NightwaveChallengeRaw,
  NightwaveRaw,
  SortieRaw,
  ArchonHuntRaw,
  ArchimedeaRaw,
  ArchimedeaStatus,
  SortieStatus,
  ArchonHuntStatus,
  ChallengeKind,
  ChallengeStatus,
  StandingSummary,
} from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Local type (mirrors what was in the legacy dailiesAdapter)
// ---------------------------------------------------------------------------

type NightwavePayload = {
  challenges: NightwaveChallengeRaw[];
  season:     number;
  tag:        string;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Offline-first data hook for the Dailies & Weeklies tab.
 * Reads worldstate_master via useLiveQuery — no fetch, no TanStack Query.
 */
export function useDailiesData() {
  const wsEntry = useLiveQuery(
    () => db.cache.get('worldstate_master').then(e => e ?? null),
    []
  );

  const isLoading = wsEntry === undefined;
  const ws        = (wsEntry?.data ?? null) as Record<string, unknown> | null;
  const cachedAt  = wsEntry?.updatedAt ?? 0;
  const isStale   = wsEntry ? wsEntry.expiresAt < Date.now() : false;

  // ── Parse Nightwave from worldstate ───────────────────────────────────
  const nwData = useMemo((): NightwavePayload | null => {
    if (!ws) return null;
    const raw = (ws['nightwave'] ?? {}) as NightwaveRaw;
    return {
      challenges: (raw.activeChallenges ?? []).map(c => ({
        ...c,
        reputation: Number(c.reputation) || 0,
      })),
      season: raw.season ?? 0,
      tag:    raw.tag    ?? '',
    };
  }, [ws]);

  // ── Completion state ───────────────────────────────────────────────────
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

  // ── Derived state — Nightwave challenges ──────────────────────────────
  const { grouped, standing, totalChallenges, completedCount } = useMemo(() => {
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

  // ── Derived state — Sortie + Archon Hunt + Archimedea ────────────────
  const { sortieStatus, archonHuntStatus, deepArchimedeaStatus } = useMemo((): {
    sortieStatus:          SortieStatus | null;
    archonHuntStatus:      ArchonHuntStatus | null;
    deepArchimedeaStatus:  ArchimedeaStatus | null;
  } => {
    if (!ws) return { sortieStatus: null, archonHuntStatus: null, deepArchimedeaStatus: null };
    const sortieRaw = ws['sortie']       as SortieRaw       | undefined;
    const archonRaw = ws['archonHunt']   as ArchonHuntRaw   | undefined;
    // archimedeas is an array; take the first active entry
    const archList  = ws['archimedeas']  as ArchimedeaRaw[] | undefined;
    const archRaw   = Array.isArray(archList) && archList.length > 0 ? archList[0] : undefined;
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
    season:    nwData?.season ?? 0,
    seasonTag: nwData?.tag    ?? '',
    isLoading,
    isError:       !isLoading && wsEntry === null,
    isStale,
    cacheAgeMs:    getCacheAgeMs(cachedAt || now, now),
    hasEverLoaded: !isLoading,
    lastSync:      cachedAt,
    now,
    toggleComplete,
    toggleSortieCompleted,
    toggleArchonCompleted,
    toggleEdaCompleted,
    forceRefetch,
  };
}
