// js/api.js — Resilient fetch layer
// 3 retries · exponential backoff (1 s → 2 s → 4 s) · 5 s abort timeout
// All other modules that need live data import { apiFetch } from here.

export const API     = 'https://api.warframestat.us/pc';
export const LANG    = '?language=en';
export const TIMEOUT = 5000; // ms before each individual attempt is aborted

// ── Cycle normalisers ─────────────────────────────────────────────────────────
// Transform raw warframestat.us cycle payloads into a standard shape used by
// both the initial render (applyCycle) and the per-second tick timer.
//
// Return shape: { current, next, timeLeft, percent, expiry, activation }
//   current    – human label for the active phase  ('Day'/'Night', 'Warm'/'Cold', 'Fass'/'Vome')
//   next       – label of the upcoming phase
//   timeLeft   – ms until the phase ends (≥ 0)
//   percent    – fraction of the phase already elapsed, 0–100 (bar fill)
//   expiry     – ISO string; stored on DOM element for tick recalculation
//   activation – ISO string | null; stored on DOM element for accurate bar recalculation

function _cycleProgress(raw) {
  const now    = Date.now();
  const expMs  = new Date(raw.expiry).getTime();
  const actMs  = raw.activation ? new Date(raw.activation).getTime() : null;
  const timeLeft = Math.max(0, expMs - now);
  const totalMs  = actMs != null ? expMs - actMs : 0;
  // percent = fraction of the phase still remaining (100 → 0 as the phase runs out)
  // Drives bar width: full bar at start, empty at transition.
  const percent  = totalMs > 0
    ? Math.min(100, Math.max(0, (timeLeft / totalMs) * 100))
    : 0;
  return { timeLeft, percent, expiry: raw.expiry, activation: raw.activation || null };
}

export function normalizeCetusCycle(raw) {
  if (!raw || !raw.expiry) throw new Error('invalid cetusCycle payload');
  const base    = _cycleProgress(raw);
  const current = raw.isDay ? 'Day' : 'Night';
  const next    = raw.isDay ? 'Night' : 'Day';
  return { current, next, ...base };
}

export function normalizeVallisCycle(raw) {
  if (!raw || !raw.expiry) throw new Error('invalid vallisCycle payload');
  const base    = _cycleProgress(raw);
  const current = raw.isWarm ? 'Warm' : 'Cold';
  const next    = raw.isWarm ? 'Cold' : 'Warm';
  return { current, next, ...base };
}

export function normalizeCambionCycle(raw) {
  if (!raw || !raw.expiry) throw new Error('invalid cambionCycle payload');
  const base    = _cycleProgress(raw);
  const state   = String(raw.state || raw.active || '').toLowerCase();
  const current = state === 'fass' ? 'Fass' : 'Vome';
  const next    = state === 'fass' ? 'Vome' : 'Fass';
  return { current, next, ...base };
}

/**
 * Fetch a JSON endpoint with automatic retries and exponential backoff.
 * @param {string} url
 * @param {{ retries?: number, retryDelay?: number, fallback?: any }} [opts]
 *   retries    – total attempts before giving up (default 3)
 *   retryDelay – base delay in ms; doubles each retry: 1 s → 2 s → 4 s (default 1000)
 *   fallback   – value returned instead of throwing on the final failure;
 *                pass window.WF_MOCK.<endpoint> so the UI always gets a safe shape
 * @returns {Promise<any>}
 */
export async function apiFetch(url, { retries = 3, retryDelay = 1000, fallback = undefined } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      clearTimeout(t);
      if (attempt === retries) {
        // All retries exhausted — return mock fallback if one was supplied so
        // the UI always gets a safe data shape; otherwise rethrow so the
        // caller's .catch() can update the badge / show an "unavailable" msg.
        if (fallback !== undefined) return fallback;
        throw e;
      }
      // Exponential backoff: 1 s → 2 s → 4 s
      await new Promise(res => setTimeout(res, retryDelay * 2 ** (attempt - 1)));
    }
  }
}
