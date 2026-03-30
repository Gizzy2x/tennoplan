// js/state.js — localStorage persistence, state shape, and drop-data cache.
// Imported by ui.js and main.js. Never touches the DOM.

import { apiFetch } from './api.js';

// ── Week / day keys ───────────────────────────────────────────────────────────
function getWeekKey() {
  const now  = new Date();
  const day  = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return 'week-' + mon.toISOString().slice(0, 10);
}

export const WEEK_KEY = getWeekKey();
// DAY_KEY resets automatically at UTC midnight — no manual clear needed
export const DAY_KEY  = 'day-' + new Date().toISOString().slice(0, 10);

export const RUNS_DEFAULT = {
  edaNormal: false, edaElite: false,
  taNormal:  false, taElite:  false,
  net1: false, net2: false, net3: false, net4: false, net5: false,
};

// ── Persistent state ──────────────────────────────────────────────────────────
// Safe parse: corrupted localStorage throws before init() runs without this guard.
export let state;
try   { state = JSON.parse(localStorage.getItem('wf-tracker-v2') || '{}'); }
catch { localStorage.removeItem('wf-tracker-v2'); state = {}; }

if (!state[WEEK_KEY])        state[WEEK_KEY]        = { tasks: {}, nw: {}, runs: { ...RUNS_DEFAULT } };
if (!state[DAY_KEY])         state[DAY_KEY]          = { tasks: {} };
if (!state.arb)              state.arb               = { doneForKey: null };
if (!state.ui)               state.ui                = {};
if (!state.ui.collapsed)     state.ui.collapsed      = {};

// Convenience references — property mutations on these objects persist fine
// since they point into the same underlying state object.
export const week  = state[WEEK_KEY];
export const today = state[DAY_KEY];

export function persist() {
  try   { localStorage.setItem('wf-tracker-v2', JSON.stringify(state)); }
  catch { /* storage full or unavailable — skip silently */ }
}

// ── Pulse migration ───────────────────────────────────────────────────────────
// Converts prior storage formats → current flat boolean model.
// v3 (current): flat keys edaNormal, edaElite, taNormal, taElite, net1–net5
// v2: nested { eda:{normal,elite}, tmp:{normal,elite}, net:[indices] }
// v1: arrays or alloc/pulses keys
export function migratePulseWeek(w) {
  if (w.runs && 'edaNormal' in w.runs) return false; // already current
  const r = w.runs || {};
  let edaN = false, edaE = false, taN = false, taE = false;
  const net = [false, false, false, false, false];

  if (r.eda && typeof r.eda === 'object' && !Array.isArray(r.eda)) {
    edaN = !!r.eda.normal; edaE = !!r.eda.elite;
  } else if (Array.isArray(r.eda)) { edaN = r.eda.length > 0; }

  if (r.tmp && typeof r.tmp === 'object' && !Array.isArray(r.tmp)) {
    taN = !!r.tmp.normal; taE = !!r.tmp.elite;
  } else if (Array.isArray(r.tmp)) { taN = r.tmp.length > 0; }

  if (Array.isArray(r.net)) {
    r.net.forEach(i => { if (i >= 0 && i < 5) net[i] = true; });
  }
  if (r.alloc && typeof r.alloc === 'object') {
    const n = Math.min(5, r.alloc.net | 0);
    for (let i = 0; i < n; i++) net[i] = true;
  } else if (Array.isArray(w.pulses)) {
    const c = w.pulses.filter(Boolean).length;
    for (let i = 0; i < Math.min(5, c); i++) net[i] = true;
  }

  w.runs = {
    edaNormal: edaN, edaElite: edaE, taNormal: taN, taElite: taE,
    net1: net[0], net2: net[1], net3: net[2], net4: net[3], net5: net[4],
  };
  delete w.pulses;
  delete w.alloc;
  return true;
}

// ── Drop data (lazy-loaded, 24 h localStorage cache) ─────────────────────────
// getDropsFor() is the public read interface; loadDropData() populates it.
let dropData = null;

export function getDropsFor(itemName) {
  if (!dropData) return null;
  const needle  = String(itemName).toLowerCase();
  const results = [];
  for (const entry of dropData) {
    if (results.length >= 20) break;
    if (String(entry.item || '').toLowerCase().includes(needle)) {
      results.push({
        place:  (entry.place  || '').replace(/<[^>]+>/g, ''),
        item:   entry.item    || '',
        rarity: entry.rarity  || '',
        chance: entry.chance  ?? null,
      });
    }
  }
  return results;
}

export async function loadDropData() {
  const CACHE_KEY    = 'wf-drops-cache';
  const CACHE_TS_KEY = 'wf-drops-cache-ts';
  const TTL          = 24 * 60 * 60 * 1000;
  try {
    // Purge a broken empty-array cache entry
    if (localStorage.getItem(CACHE_KEY) === '[]') {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TS_KEY);
    }
    const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
    if (dropData === null && ts && Date.now() - ts < TTL) {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) { dropData = JSON.parse(raw); return; }
    }
    const data = await apiFetch('https://drops.warframestat.us/data/all.slim.json');
    if (!Array.isArray(data)) return;
    dropData = data;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
    } catch { /* storage quota exceeded — keep in memory only */ }
  } catch { /* silent fail — drop data is entirely optional */ }
}
