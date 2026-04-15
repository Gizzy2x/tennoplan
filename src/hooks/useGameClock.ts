/**
 * useGameClock — shared 1-second precision clock.
 *
 * Strategy: single module-level requestAnimationFrame loop that fires
 * at most once per second. All hook subscribers receive the same `now`
 * value on the same render cycle — no per-component setInterval drift.
 *
 * Uses useSyncExternalStore so React batches all clock-driven re-renders
 * into one pass, eliminating N separate setState calls.
 *
 * The loop starts when the first subscriber mounts and stops when the last
 * one unmounts — zero overhead when no timers are on screen.
 */

import { useSyncExternalStore } from 'react';

// Module-level singleton state (not React state — never triggers re-render directly)
let _now       = Date.now();
let _rafId: number | null = null;
const _listeners = new Set<() => void>();

function tick() {
  const next = Date.now();
  // Only notify when at least 1 second has elapsed — keeps renders at 1 Hz
  if (next - _now >= 1000) {
    _now = next;
    _listeners.forEach(fn => fn());
  }
  _rafId = requestAnimationFrame(tick);
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  // Start the RAF loop on first subscriber
  if (_listeners.size === 1) {
    _rafId = requestAnimationFrame(tick);
  }
  return () => {
    _listeners.delete(listener);
    // Stop the loop when last subscriber unmounts
    if (_listeners.size === 0 && _rafId !== null) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  };
}

function getSnapshot(): number {
  return _now;
}

function getServerSnapshot(): number {
  return Date.now();
}

/**
 * Returns the current timestamp (ms), updated once per second.
 * All components calling this hook share the same loop — no drift.
 */
export function useGameClock(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
