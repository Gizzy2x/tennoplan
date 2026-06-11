/**
 * cycleForecast — pure projection of a world cycle's UPCOMING state windows.
 *
 * The hero shows the current window; this looks ahead. Given a cycle's
 * authoritative current window (activation/expiry from live worldstate), it
 * walks forward through the fixed state order using CYCLE_DURATIONS, emitting
 * each future window with absolute start/end timestamps + its activity label.
 *
 * Accuracy: Cetus is exact (100 min day / 50 min night → a stable 150 min
 * loop), so a multi-day Plains timetable is reliable. Slower/looser cycles
 * (Vallis, Cambion, Duviri) drift the further out you read — which is why the
 * UI frames this as a *projection*, anchored to the last live sync.
 *
 * Pure: no React, no clock side-effects. Callers pass `now`.
 */

import type { CycleState, WorldCycle } from '@/core/domain/cycles';
import { CYCLE_DURATIONS, nextCycleState } from '@/core/services/cycleService';
import { getActivity } from './cycleActivity';

export interface ForecastWindow {
  state:   CycleState;
  /** Activity headline for this state, e.g. "Eidolon Hunt". */
  label:   string;
  /** True for P0 prestige windows (Eidolon night, Exploiter warm, Fass). */
  isPrime: boolean;
  /** Absolute Unix-ms the window opens. */
  startMs: number;
  /** Absolute Unix-ms the window closes (= next window's start). */
  endMs:   number;
}

export interface ForecastOptions {
  /** How far ahead to project. Default 3 days. */
  horizonMs?:  number;
  /** Hard cap on emitted windows (keeps fast cycles from flooding). Default 48. */
  maxWindows?: number;
}

/**
 * Project the cycle forward from `now`, returning windows that OPEN at or
 * after `now` (the in-progress window is intentionally skipped — the hero
 * already owns it). Stops at the horizon or the window cap, whichever first.
 */
export function forecastCycle(cycle: WorldCycle, now: number, opts: ForecastOptions = {}): ForecastWindow[] {
  const horizonMs  = opts.horizonMs  ?? 3 * 24 * 60 * 60_000;
  const maxWindows = opts.maxWindows ?? 48;
  const durations  = CYCLE_DURATIONS[cycle.id];
  const limit      = now + horizonMs;

  let state   = cycle.state;
  let startMs = cycle.activationMs;
  let endMs   = cycle.expiryMs;

  // Fast-forward to the window currently in progress (ends after `now`).
  let guard = 0;
  while (endMs <= now && guard++ < 10_000) {
    state   = nextCycleState(cycle.id, state);
    startMs = endMs;
    const dur = durations[state];
    if (!dur) return [];
    endMs = startMs + dur;
  }

  // Emit every window that opens from `now` onward.
  const out: ForecastWindow[] = [];
  guard = 0;
  while (out.length < maxWindows && startMs < limit && guard++ < 10_000) {
    if (startMs >= now) {
      const act = getActivity(cycle.id, state);
      out.push({ state, label: act.label, isPrime: act.isPrime, startMs, endMs });
    }
    state   = nextCycleState(cycle.id, state);
    startMs = endMs;
    const dur = durations[state];
    if (!dur) break;
    endMs = startMs + dur;
  }

  return out;
}
