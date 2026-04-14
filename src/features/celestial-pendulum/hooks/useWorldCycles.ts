import { useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { SyncService } from '@/services/SyncService';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import { computeCycleStatus, extrapolateCycle } from '@/core/services/cycleService';
import type { WorldCycle, CycleId, CycleStatus } from '@/core/domain/cycles';
import { useHeartbeatStore } from '@/store/heartbeat';
import { useGameClock } from '@/hooks/useGameClock';

// ---------------------------------------------------------------------------
// Raw API shapes (kept local — not a domain concern)
// ---------------------------------------------------------------------------

interface RawCycle {
  expiry:     string;
  activation: string;
  state?:     string;   // cetusCycle, vallisCycle, zarimanCycle, earthCycle
  active?:    string;   // cambionCycle uses "active" instead of "state"
  mood?:      string;   // duviriCycle may use "mood"
}

const META: Record<CycleId, { name: string; location: string }> = {
  cetus:   { name: 'Plains of Eidolon', location: 'Cetus' },
  vallis:  { name: 'Orb Vallis',        location: 'Fortuna' },
  cambion: { name: 'Cambion Drift',     location: 'Necralisk' },
  zariman: { name: 'Zariman Ten Zero',  location: 'Chrysalith' },
  earth:   { name: 'Earth',            location: 'Earth Proxima' },
  duviri:  { name: 'Duviri',           location: 'Duviri Paradox' },
};

/** Worldstate packet key for each cycle id */
const WS_FIELD: Record<CycleId, string> = {
  cetus:   'cetusCycle',
  vallis:  'vallisCycle',
  cambion: 'cambionCycle',
  zariman: 'zarimanCycle',
  earth:   'earthCycle',
  duviri:  'duviriCycle',
};

const CYCLE_IDS: CycleId[] = ['cetus', 'vallis', 'cambion', 'zariman', 'earth', 'duviri'];

function normalizeState(id: CycleId, raw: RawCycle): string {
  if (id === 'cambion') return (raw.active ?? 'fass').toLowerCase();
  if (id === 'duviri')  return (raw.state  ?? raw.mood ?? 'joy').toLowerCase();
  return (raw.state ?? 'day').toLowerCase();
}

function rawToWorldCycle(id: CycleId, raw: RawCycle, fetchedAt: number): WorldCycle {
  return {
    id,
    ...META[id],
    state:        normalizeState(id, raw) as WorldCycle['state'],
    expiryMs:     new Date(raw.expiry).getTime(),
    activationMs: new Date(raw.activation).getTime(),
    fetchedAt,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to worldstate_master and extracts all six world cycles.
 * Expired cycles are extrapolated forward so the UI stays coherent between syncs.
 */
export function useWorldCycles() {
  const wsEntry = useLiveQuery(
    () => db.cache.get('worldstate_master').then(e => e ?? null),
    []
  );

  const isLoading = wsEntry === undefined;
  const ws        = (wsEntry?.data ?? null) as Record<string, unknown> | null;
  const cachedAt  = wsEntry?.updatedAt ?? 0;
  const isStale   = wsEntry ? wsEntry.expiresAt < Date.now() : false;

  // ── Force refresh ─────────────────────────────────────────────────────
  async function forceRefetch() {
    await SyncService.performSync(true);
  }

  // Keep a stable ref so the heartbeat store always calls the current version
  const refetchRef = useRef(forceRefetch);
  refetchRef.current = forceRefetch;

  useEffect(() => {
    const { registerRefetch } = useHeartbeatStore.getState();
    registerRefetch(() => refetchRef.current());
    return () => useHeartbeatStore.getState().registerRefetch(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Shared global clock (no per-hook setInterval) ─────────────────────
  const now = useGameClock();

  // ── Map + derive ──────────────────────────────────────────────────────
  const statuses = useMemo((): CycleStatus[] => {
    if (!ws) return [];

    return CYCLE_IDS
      .map(id => {
        const raw = ws[WS_FIELD[id]] as RawCycle | undefined;
        if (!raw?.expiry) return null;
        const cycle = rawToWorldCycle(id, raw, cachedAt);
        return computeCycleStatus(extrapolateCycle(cycle, now), now);
      })
      .filter((s): s is CycleStatus => s !== null);
  }, [ws, cachedAt, now]);

  // ── Sync heartbeat store ──────────────────────────────────────────────
  const hasData = ws !== null;
  useEffect(() => {
    const { setSync, status } = useHeartbeatStore.getState();
    if (status === 'syncing') return;
    if (!isLoading && !hasData) {
      setSync('offline');
    } else if (isStale && cachedAt) {
      setSync('cached', cachedAt);
    } else if (hasData) {
      setSync('live', cachedAt || Date.now());
    }
  }, [hasData, isLoading, isStale, cachedAt]);

  return {
    statuses,
    isLoading,
    isError:       !isLoading && wsEntry === null,
    isStale,
    cacheAgeMs:    getCacheAgeMs(cachedAt || now, now),
    hasEverLoaded: !isLoading,
    lastSync:      cachedAt,
    now,
    forceRefetch,
  };
}
