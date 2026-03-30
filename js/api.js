// js/api.js — Resilient fetch layer
// 3 retries · exponential backoff (1 s → 2 s → 4 s) · 5 s abort timeout
// All other modules that need live data import { apiFetch } from here.

export const API     = 'https://api.warframestat.us/pc';
export const LANG    = '?language=en';
export const TIMEOUT = 5000; // ms before each individual attempt is aborted

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
