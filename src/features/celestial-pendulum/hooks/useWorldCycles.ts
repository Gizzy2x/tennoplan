/**
 * useWorldCycles — Celestial Pendulum data subscriber (Phase D.4).
 *
 * Reads ParsedWorldstate from the V2 worldstate store via useWorldstate(),
 * then maps the typed CycleInfo fields onto the legacy WorldCycle / CycleStatus
 * domain types so the existing rendering code (CelestialPendulumPage,
 * cycleService) continues to work unchanged.
 *
 * Migration notes:
 *   • The legacy hook subscribed to `db.cache.get('worldstate_master')` and
 *     parsed RawCycle (ISO date strings) into WorldCycle. The V2 ParsedWorldstate
 *     already exposes Unix-ms timestamps and lowercased state strings, so the
 *     mapping here is a straight field rename rather than a parse step.
 *   • Cycle states arrive lowercased from the Worker (state: 'day'|'night'|...).
 *     For Duviri, the mood field is also exposed; we lowercase it to match the
 *     domain DuviriState union.
 *   • The Worker emits boolean shorthands (isDay, isWarm) which we fall back to
 *     when the explicit `state` string is missing — defensive coding for partial
 *     payloads.
 *
 * The return signature matches the legacy useWorldCycles exactly so the
 * Celestial Pendulum page does not need any changes.
 */

import { useMemo } from 'react';
import { computeCycleStatus, extrapolateCycle, nextCycleState } from '@/core/services/cycleService';
import type { WorldCycle, CycleId, CycleState, CycleStatus } from '@/core/domain/cycles';
import { useGameClock } from '@/hooks/useGameClock';
import { useWorldstate } from '@/hooks/useWorldstate';
import { PRESTIGE_LEVEL, PRE_HEAT_MS } from '@/tokens/worldThemes';
import type { CycleInfo, DuviriCycleInfo, ParsedWorldstate } from '@/core/domain/tennoplanApi';

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const META: Record<CycleId, { name: string; location: string }> = {
  cetus:   { name: 'Plains of Eidolon', location: 'Cetus' },
  vallis:  { name: 'Orb Vallis',        location: 'Fortuna' },
  cambion: { name: 'Cambion Drift',     location: 'Necralisk' },
  zariman: { name: 'Zariman Ten Zero',  location: 'Chrysalith' },
  earth:   { name: 'Earth',            location: 'Earth Proxima' },
  duviri:  { name: 'Duviri',           location: 'Duviri Paradox' },
};

const CYCLE_IDS: CycleId[] = ['cetus', 'vallis', 'cambion', 'zariman', 'earth', 'duviri'];

// ---------------------------------------------------------------------------
// Urgency / prestige
// ---------------------------------------------------------------------------

export interface CycleUrgency {
  /** Prestige tier of the current phase */
  prestigeLevel: 'P0' | 'P1' | 'none';
  /**
   * true when: current phase is not P0, next phase IS P0,
   * and msRemaining ≤ PRE_HEAT_MS (15 min).
   * Drives the Master Header "Strategic Preparation" state.
   */
  isPreHeat: boolean;
  /** Next state key, e.g. 'cetus-night' — used by Master Header copy */
  nextStateKey: string;
}

function computeUrgency(status: CycleStatus): CycleUrgency {
  const { cycle, msRemaining } = status;
  const currentKey      = `${cycle.id}-${cycle.state}`;
  const nextState       = nextCycleState(cycle.id, cycle.state);
  const nextKey         = `${cycle.id}-${nextState}`;
  const currentPrestige = PRESTIGE_LEVEL[currentKey] ?? 'none';
  const nextPrestige    = PRESTIGE_LEVEL[nextKey]    ?? 'none';

  return {
    prestigeLevel: currentPrestige,
    isPreHeat:     currentPrestige === 'none' && nextPrestige === 'P0' && msRemaining <= PRE_HEAT_MS,
    nextStateKey:  nextKey,
  };
}

// ---------------------------------------------------------------------------
// V2 → legacy WorldCycle adapter
// ---------------------------------------------------------------------------

/**
 * Resolve the canonical lowercase state for a given cycle. Prefers the
 * explicit `state` field; falls back to the boolean shorthands the Worker
 * sets for predictable two-state cycles, then to the per-cycle default.
 */
function resolveState(id: CycleId, info: CycleInfo): CycleState {
  if (info.state) return info.state.toLowerCase() as CycleState;
  switch (id) {
    case 'cetus':
    case 'earth':
      return (info.isDay ? 'day' : 'night') as CycleState;
    case 'vallis':
      return (info.isWarm ? 'warm' : 'cold') as CycleState;
    case 'cambion':
      return 'fass';
    case 'zariman':
      return (info.isCorpus ? 'corpus' : 'grineer') as CycleState;
    default:
      return 'day' as CycleState;
  }
}

function resolveDuviriState(info: DuviriCycleInfo): CycleState {
  if (info.mood)  return info.mood.toLowerCase() as CycleState;
  if (info.state) return info.state.toLowerCase() as CycleState;
  return 'joy' as CycleState;
}

/**
 * Pick the matching CycleInfo from the typed ParsedWorldstate fields.
 * Returns null if the cycle isn't present (e.g. earthCycle is optional).
 */
function pickCycle(ws: ParsedWorldstate, id: CycleId): CycleInfo | null {
  switch (id) {
    case 'cetus':   return ws.cetusCycle ?? null;
    case 'vallis':  return ws.orbVallisCycle ?? null;
    case 'cambion': return ws.cambionDriftCycle ?? null;
    case 'zariman': return ws.zarimanCycle ?? null;
    case 'duviri':  return ws.duviriCycle ?? null;
    case 'earth':   return ws.earthCycle ?? null;
  }
}

function toWorldCycle(id: CycleId, info: CycleInfo, fetchedAt: number): WorldCycle {
  const state = id === 'duviri'
    ? resolveDuviriState(info as DuviriCycleInfo)
    : resolveState(id, info);
  return {
    id,
    ...META[id],
    state,
    expiryMs:     info.expiry,
    activationMs: info.activation,
    fetchedAt,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to ParsedWorldstate and extracts all six world cycles.
 * Expired cycles are extrapolated forward so the UI stays coherent between
 * live syncs. The Worker also runs cycle-math fallback server-side; this is
 * the client-side belt-and-braces for the gap between polls.
 */
export function useWorldCycles() {
  const { data: ws, lastSync, isLoading, isError, isStale, ageMs, forceRefetch } =
    useWorldstate();

  // ── Shared global clock (no per-hook setInterval) ─────────────────────
  const now = useGameClock();

  // ── Map + derive ──────────────────────────────────────────────────────
  const { statuses, urgency } = useMemo(() => {
    if (!ws) return { statuses: [] as CycleStatus[], urgency: {} as Partial<Record<CycleId, CycleUrgency>> };

    const pairs = CYCLE_IDS
      .map(id => {
        const info = pickCycle(ws, id);
        if (!info?.expiry) return null;
        const cycle  = toWorldCycle(id, info, lastSync || now);
        const status = computeCycleStatus(extrapolateCycle(cycle, now), now);
        return { status, urgency: computeUrgency(status) };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return {
      statuses: pairs.map(p => p.status),
      urgency:  Object.fromEntries(pairs.map(p => [p.status.cycle.id, p.urgency])) as Partial<Record<CycleId, CycleUrgency>>,
    };
  }, [ws, lastSync, now]);

  return {
    statuses,
    urgency,
    isLoading,
    isError,
    isStale,
    cacheAgeMs:    Number.isFinite(ageMs) ? ageMs : 0,
    hasEverLoaded: !isLoading,
    lastSync,
    now,
    forceRefetch,
  };
}
