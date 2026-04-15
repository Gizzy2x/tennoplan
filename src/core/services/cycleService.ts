import type { WorldCycle, CycleStatus, CycleId, CycleState } from '../domain/cycles';

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

/**
 * Approximate state durations in milliseconds.
 * These are used ONLY for offline extrapolation when the stored expiry has
 * already passed. The API expiry timestamp is always authoritative.
 */
export const CYCLE_DURATIONS: Record<CycleId, Readonly<Record<string, number>>> = {
  cetus:   { day: 100 * 60_000, night:   50 * 60_000 },
  vallis:  { cold:  9 * 60_000, warm:     6 * 60_000 },
  cambion: { fass: 100 * 60_000, vome:  100 * 60_000 },
  zariman: { corpus: 20 * 60_000, grineer: 20 * 60_000 },
  earth:   { day: 4 * 60 * 60_000, night: 4 * 60 * 60_000 },
  // Approximate: each Duviri mood lasts ~60 min (authoritative expiry from API)
  duviri:  { joy: 60 * 60_000, anger: 60 * 60_000, envy: 60 * 60_000, sorrow: 60 * 60_000, fear: 60 * 60_000 },
};

const STATE_ORDER: Record<CycleId, readonly CycleState[]> = {
  cetus:   ['day',    'night'],
  vallis:  ['warm',   'cold'],
  cambion: ['fass',   'vome'],
  zariman: ['corpus', 'grineer'],
  earth:   ['day',    'night'],
  duviri:  ['joy',    'anger', 'envy', 'sorrow', 'fear'],
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function nextCycleState(id: CycleId, current: CycleState): CycleState {
  const order = STATE_ORDER[id];
  const i     = order.indexOf(current as never);
  return order[(i + 1) % order.length] as CycleState;
}

/**
 * Walk a cycle forward using approximate durations until it is no longer
 * expired.  Called when we're offline and the stored expiry has passed.
 */
export function extrapolateCycle(cycle: WorldCycle, now: number): WorldCycle {
  if (now < cycle.expiryMs) return cycle;

  let { state, activationMs, expiryMs } = cycle;
  let guard = 0;

  while (expiryMs <= now && guard++ < 1000) {
    state        = nextCycleState(cycle.id, state);
    activationMs = expiryMs;
    expiryMs     = activationMs + CYCLE_DURATIONS[cycle.id][state];
  }

  return { ...cycle, state, activationMs, expiryMs };
}

/**
 * Derive a CycleStatus from a WorldCycle at the given instant.
 * This is a pure function — safe to call every render or every second.
 */
export function computeCycleStatus(cycle: WorldCycle, now: number): CycleStatus {
  const msRemaining = Math.max(0, cycle.expiryMs - now);
  const duration    = cycle.expiryMs - cycle.activationMs;
  const elapsed     = now - cycle.activationMs;
  const progress    = duration > 0
    ? Math.min(1, Math.max(0, elapsed / duration))
    : 0;

  return { cycle, msRemaining, progress, isExpired: msRemaining === 0 };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatMsParts(ms: number): { h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h     = Math.floor(total / 3600);
  const m     = Math.floor((total % 3600) / 60);
  const s     = total % 60;
  const pad   = (n: number) => String(n).padStart(2, '0');
  return { h: pad(h), m: pad(m), s: pad(s) };
}

export function formatMs(ms: number): string {
  const { h, m, s } = formatMsParts(ms);
  return h !== '00' ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/**
 * Human-friendly duration without seconds:
 * ≥1 day  → "Xd Yh"
 * ≥1 hour → "Xh Ym"
 * else    → "Xm"
 */
/**
 * Returns the UTC Monday 00:00:00.000 timestamp for the week containing `now`.
 * Used to bucket Nightwave standing earned across daily challenge rotations.
 */
export function getWeekStart(now: number): number {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diffToMonday);
  mon.setUTCHours(0, 0, 0, 0);
  return mon.getTime();
}

export function formatMsHuman(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
