/**
 * useFissures — Void Reliquaries data subscriber (Phase D.4).
 *
 * Reads ParsedWorldstate from the V2 worldstate store via useWorldstate(),
 * filters/groups the typed Fissure[] into the legacy domain shape consumed
 * by VoidReliquariesPage and the fissureService helpers.
 *
 * Migration notes:
 *   • The legacy hook subscribed to `db.cache.get('worldstate_master')` and
 *     mapped raw warframestat.us records (ISO strings, isHard/isStorm flags)
 *     into the legacy Fissure domain shape. The V2 ParsedWorldstate.fissures
 *     are already typed and Unix-ms — the mapping here is a straight rename.
 *   • The V2 Fissure type does NOT carry `activation`. We synthesize a
 *     reasonable default (expiry − 1 h) so the progress fraction in
 *     computeFissureStatus stays in [0,1] without dividing by zero. This is
 *     approximate — fissure mission durations vary 60–120 min by mission
 *     type — but is good enough to drive the existing progress ring UI.
 *     A future enhancement on the Worker side can carry activation through.
 *   • `tierNum` is derived locally from TIER_NUM[tier]; the V2 type drops
 *     it because it's a pure derivation.
 *
 * The return signature matches the legacy useFissures exactly so the
 * Void Reliquaries page does not need any changes.
 */

import { useMemo, useEffect, useRef } from 'react';
import {
  computeFissureStatus,
  filterFissures,
  groupByTier,
  countSteelPath,
  getNextToExpire,
  type FissureFilters,
} from '@/core/services/fissureService';
import type { Fissure, FissureEnemy, FissureTier, FissureStatus } from '@/core/domain/relics';
import { TIER_NUM } from '@/core/domain/relics';
import { useGameClock } from '@/hooks/useGameClock';
import { useWorldstate } from '@/hooks/useWorldstate';
import type { Fissure as ApiFissure } from '@/core/domain/tennoplanApi';

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export const DEFAULT_FILTERS: FissureFilters = {
  showNormal:    true,
  showStorm:     true,
  showSteelPath: false,
};

// ---------------------------------------------------------------------------
// V2 → legacy adapter
// ---------------------------------------------------------------------------

/** Synthesised activation when the Worker doesn't carry one through.
 *  60 min is the most common fissure duration; tier-specific math would be
 *  marginally better but not worth the lookup table for an estimated UI. */
const SYNTHETIC_ACTIVATION_OFFSET_MS = 60 * 60_000;

function apiToFissure(raw: ApiFissure, fetchedAt: number): Fissure {
  const expiryMs     = raw.expiry;
  const activationMs = expiryMs - SYNTHETIC_ACTIVATION_OFFSET_MS;
  const tier         = raw.tier as FissureTier;
  return {
    id:           raw.id,
    node:         raw.node,
    missionType:  raw.missionType,
    enemy:        raw.enemy as FissureEnemy,
    tier,
    tierNum:      TIER_NUM[tier] ?? 0,
    expiryMs,
    activationMs,
    fetchedAt,
    isStorm:      raw.isStorm ?? false,
    isHard:       raw.isHard  ?? false,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to ParsedWorldstate and projects the active fissures into
 * the grouped FissureStatus shape consumed by the Void Reliquaries UI.
 * Pure read-side: WorldstateSync is the only writer.
 */
export function useFissures(filters: FissureFilters = DEFAULT_FILTERS) {
  const { data: ws, lastSync, isLoading, isError, isStale, ageMs, forceRefetch, requestPassiveSync } =
    useWorldstate();

  // ── Shared global clock (no per-hook setInterval) ─────────────────────
  const now = useGameClock();

  // ── Map + derive ──────────────────────────────────────────────────────
  const { grouped, expiredStatuses, totalActive, steelPathCount, nextToExpire } =
    useMemo(() => {
      const empty = {
        grouped:         new Map<FissureTier, FissureStatus[]>(),
        expiredStatuses: [] as FissureStatus[],
        totalActive:     0,
        steelPathCount:  0,
        nextToExpire:    null as FissureStatus | null,
      };

      if (!ws) return empty;

      const fetchedAt = lastSync || now;
      const fissures  = (ws.fissures ?? []).map(r => apiToFissure(r, fetchedAt));
      const filtered  = filterFissures(fissures, filters);

      const active  = filtered.filter(f => computeFissureStatus(f, now).msRemaining > 0);
      const expired = filtered.filter(f => computeFissureStatus(f, now).msRemaining === 0);

      const byTier    = groupByTier(active);
      const statusMap = new Map<FissureTier, FissureStatus[]>();
      for (const [tier, fs] of byTier) {
        statusMap.set(tier, fs.map(f => computeFissureStatus(f, now)));
      }

      const nextRaw = getNextToExpire(active);

      return {
        grouped:         statusMap,
        expiredStatuses: expired.map(f => computeFissureStatus(f, now)),
        totalActive:     active.length,
        steelPathCount:  countSteelPath(active),
        nextToExpire:    nextRaw ? computeFissureStatus(nextRaw, now) : null,
      };
    }, [ws, lastSync, filters, now]);

  // ── Smart-trigger: passive sync when a fissure just expired ──────────
  // Track the baseline expired count so we only fire when the count *grows*
  // (i.e. a live fissure just hit zero), not on the initial stale-data load.
  const prevExpiredCountRef = useRef<number | null>(null);
  useEffect(() => {
    const current = expiredStatuses.length;
    if (prevExpiredCountRef.current === null) {
      // First render — set baseline without syncing (data may already be stale)
      prevExpiredCountRef.current = current;
      return;
    }
    if (current > prevExpiredCountRef.current) {
      // A fissure that was live just hit 00:00:00 — nudge the sync pipeline
      requestPassiveSync();
    }
    prevExpiredCountRef.current = current;
  }, [expiredStatuses.length, requestPassiveSync]);

  return {
    grouped,
    expiredStatuses,
    totalActive,
    steelPathCount,
    nextToExpire,
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
