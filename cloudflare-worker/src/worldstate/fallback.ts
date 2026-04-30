// ---------------------------------------------------------------------------
// Worldstate fallback — when both upstream sources fail, project cycle
// timers forward from a cached snapshot using known cycle durations.
//
// Approach:
//   1. Take the last good ParsedWorldstate from KV (worldstate:previous).
//   2. For each predictable cycle, advance state if expiry has passed:
//        flip the binary state and add the new state's duration.
//      This works because cycle activation/expiry are absolute Unix ms
//      timestamps — we never need a "real" reference time, just the
//      cached one + duration constants.
//   3. Recompute timeLeft for every cycle.
//   4. Mark response: fallbackSource: true, isStale: true.
//   5. Leave non-predictable data (fissures, alerts, invasions, sortie)
//      from the cached snapshot — frontend shows them with a stale badge.
//
// Cycle durations are approximate. For a fallback that's clearly labelled
// "Estimated", "good enough" is good enough. The real-time accuracy
// returns the moment a successful sync lands.
// ---------------------------------------------------------------------------

import type { ParsedWorldstate, CycleInfo, DuviriCycleInfo } from '../types';

// ─── Cycle durations (ms) ─────────────────────────────────────────────────────

const CYCLE = {
  cetus:   { day:     6_000_000, night:  3_000_000 },   // 100m / 50m
  vallis:  { warm:      400_000, cold:   1_200_000 },   // 6m40s / 20m
  cambion: { fass:    6_000_000, vome:   3_000_000 },   // ~100m / ~50m
  zariman: { grineer: 9_000_000, corpus: 9_000_000 },   // 150m / 150m
  earth:   { day:    14_400_000, night: 14_400_000 },   // 4h / 4h
  duviri:  { full: 7_200_000 },                         // 2h spiral
} as const;

// ─── Public entry ─────────────────────────────────────────────────────────────

/**
 * Project all cycle timers forward from the cached snapshot to `now`,
 * flipping states as needed. Returns a new ParsedWorldstate marked as
 * fallback so the frontend can render an "estimated timers" badge.
 *
 * Non-cycle data (fissures, alerts, invasions, sortie) is preserved from
 * the cached snapshot — those have absolute expiries and the frontend
 * filters out anything that has expired.
 */
export function projectFromCache(cached: ParsedWorldstate, now: number = Date.now()): ParsedWorldstate {
  return {
    ...cached,
    cetusCycle:        advanceBinary(cached.cetusCycle,        CYCLE.cetus.day,    CYCLE.cetus.night,    'isDay',    'day',     'night',  now),
    orbVallisCycle:    advanceBinary(cached.orbVallisCycle,    CYCLE.vallis.warm,  CYCLE.vallis.cold,    'isWarm',   'warm',    'cold',   now),
    cambionDriftCycle: advanceBinary(cached.cambionDriftCycle, CYCLE.cambion.fass, CYCLE.cambion.vome,   undefined,  'fass',    'vome',   now),
    zarimanCycle:      advanceBinary(cached.zarimanCycle,      CYCLE.zariman.grineer, CYCLE.zariman.corpus, 'isCorpus', 'grineer', 'corpus', now),
    duviriCycle:       advanceDuviri(cached.duviriCycle, now),
    ...(cached.earthCycle
      ? { earthCycle: advanceBinary(cached.earthCycle, CYCLE.earth.day, CYCLE.earth.night, 'isDay', 'day', 'night', now) }
      : {}),
    cyclesRemaining: rebuildCyclesRemaining(cached, now),
    isStale:        true,
    fallbackSource: true,
  };
}

// ─── Cycle math ───────────────────────────────────────────────────────────────

/**
 * Advance a binary cycle (day/night, warm/cold, fass/vome, grineer/corpus).
 *
 * If `expiry > now`, the cycle is still in its current state — just compute
 * a fresh timeLeft.
 *
 * If `expiry <= now`, the cycle has flipped one or more times since the
 * snapshot. We walk forward in alternating-duration steps until we find
 * the window that contains `now`.
 *
 * `flagKey` lets us update the boolean shorthand fields (isDay, isWarm,
 * isCorpus). Cambion has no shorthand — pass `undefined`.
 */
function advanceBinary(
  cached: CycleInfo,
  durationStateA: number,
  durationStateB: number,
  flagKey: keyof Pick<CycleInfo, 'isDay' | 'isWarm' | 'isCorpus'> | undefined,
  stateAName: string,
  stateBName: string,
  now: number,
): CycleInfo {
  if (!cached.expiry || !cached.activation) {
    return { ...cached, timeLeft: Math.max(0, (cached.expiry ?? 0) - now) };
  }

  // Still in the original window — easy case
  if (cached.expiry > now) {
    return {
      ...cached,
      timeLeft: cached.expiry - now,
    };
  }

  // The cycle has flipped at least once. Determine which state we started in
  // by checking the cached state field, then walk forward.
  const startedInA  = cached.state === stateAName
                   || (flagKey && cached[flagKey] === true);

  // Walk: each iteration advances activation = previous expiry, expiry +=
  // (next state's duration). We bound the walk to prevent infinite loops on
  // weird input — at most one full year of catch-up (way more than we'd ever
  // need; in practice 1–3 iterations is typical).
  let activation = cached.expiry;
  let expiry     = activation;
  let inA        = !startedInA;   // After first flip, we're in the OTHER state
  const maxIterations = 50_000;

  for (let i = 0; i < maxIterations; i++) {
    expiry = activation + (inA ? durationStateA : durationStateB);
    if (expiry > now) break;
    activation = expiry;
    inA = !inA;
  }

  const result: CycleInfo = {
    activation,
    expiry,
    timeLeft: Math.max(0, expiry - now),
    state: inA ? stateAName : stateBName,
  };
  if (flagKey === 'isDay')    result.isDay    = inA;
  if (flagKey === 'isWarm')   result.isWarm   = inA;
  if (flagKey === 'isCorpus') result.isCorpus = inA;
  return result;
}

/**
 * Duviri's mood cycle is more nuanced (5 moods rotating), and its choices
 * structure is harder to project safely. For fallback we just keep the
 * 2-hour outer cycle ticking; mood is dropped if uncertain so the frontend
 * shows "—" rather than misleading info.
 */
function advanceDuviri(cached: DuviriCycleInfo, now: number): DuviriCycleInfo {
  if (!cached.expiry || !cached.activation) {
    return { ...cached, timeLeft: Math.max(0, (cached.expiry ?? 0) - now) };
  }
  if (cached.expiry > now) {
    return { ...cached, timeLeft: cached.expiry - now };
  }

  // Walk forward in 2h chunks
  let activation = cached.expiry;
  let expiry     = activation + CYCLE.duviri.full;
  while (expiry <= now) {
    activation = expiry;
    expiry    += CYCLE.duviri.full;
  }
  return {
    activation,
    expiry,
    timeLeft: Math.max(0, expiry - now),
    // Drop mood — projecting it accurately requires the choices schedule
    // which we don't track. Frontend should treat undefined mood as "estimating".
  };
}

function rebuildCyclesRemaining(cached: ParsedWorldstate, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (cached.cetusCycle)        out['cetus']   = Math.max(0, cached.cetusCycle.expiry - now);
  if (cached.orbVallisCycle)    out['vallis']  = Math.max(0, cached.orbVallisCycle.expiry - now);
  if (cached.cambionDriftCycle) out['cambion'] = Math.max(0, cached.cambionDriftCycle.expiry - now);
  if (cached.zarimanCycle)      out['zariman'] = Math.max(0, cached.zarimanCycle.expiry - now);
  if (cached.duviriCycle)       out['duviri']  = Math.max(0, cached.duviriCycle.expiry - now);
  if (cached.earthCycle)        out['earth']   = Math.max(0, cached.earthCycle.expiry - now);
  return out;
}
