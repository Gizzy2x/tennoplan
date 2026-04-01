# Tennoplan — Project Snapshot
Generated: Wed Apr  1 20:14:29 SAST 2026

## Structure
./js/api.js
./js/main.js
./js/state.js
./js/ui/alerts.js
./js/ui/arbitration.js
./js/ui/baro.js
./js/ui/cards.js
./js/ui/countdown.js
./js/ui/cycles.js
./js/ui/fissures.js
./js/ui/index.js
./js/ui/invasions.js
./js/ui/knowMore.js
./js/ui/layout.js
./js/ui/nightwave.js
./js/ui/pulses.js
./js/ui/rewards.js
./js/ui/steelpath.js
./js/wikiContent.js
./mockData.js

## Files

### ./js/api.js
```
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
 * @param {{ retries?: number, retryDelay?: number, fallback?: any, timeout?: number }} [opts]
 *   retries    – total attempts before giving up (default 3)
 *   retryDelay – base delay in ms; doubles each retry: 1 s → 2 s → 4 s (default 1000)
 *   fallback   – value returned instead of throwing on the final failure;
 *                pass window.WF_MOCK.<endpoint> so the UI always gets a safe shape
 *   timeout    – ms before each individual attempt is aborted (default TIMEOUT / 5 s);
 *                override to 10 000 for large payloads such as Invasions or Arbitration
 * @returns {Promise<any>}
 */
export async function apiFetch(url, { retries = 3, retryDelay = 1000, fallback = undefined, timeout = TIMEOUT } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), timeout);
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
```

### ./js/main.js
```
// js/main.js — Entry point. Imports all modules, wires them together, runs init().
// Loaded as <script type="module" src="js/main.js"> in index.html.

import { loadWikiContent } from './wikiContent.js';
import { apiFetch, API, LANG,
         normalizeCetusCycle,
         normalizeVallisCycle,
         normalizeCambionCycle }                   from './api.js';
import { state, week, today, persist,
         RUNS_DEFAULT, migratePulseWeek,
         loadDropData }                            from './state.js';
import {
  setBadge, formatDur,
  renderCards, renderPulses, renderNightwave,
  renderBaro, renderSteelPath,
  renderVoidFissures, tickFissureTimers,
  renderInvasions, renderAlerts,
  renderWorldCycles, applyCycle, tickCycleTimers,
  tickSteelPathTimer,
  applyArbitrationCard,
  updateCountdown,
  resetAll, initSectionToggles,
  toggleTieredRun, toggleNetRun, togglePulseRewardPanel,
} from './ui/index.js';

// ── Global error handlers ─────────────────────────────────────────────────────
window.addEventListener('error', e => {
  console.error('[Tennoplan] Unhandled error:', e.message, `${e.filename}:${e.lineno}`);
});
window.addEventListener('unhandledrejection', e => {
  console.error('[Tennoplan] Unhandled promise rejection:', e.reason);
  e.preventDefault();
});

// ── Expose functions used by HTML inline onclick attributes ───────────────────
// type="module" scopes everything to the module, so inline handlers need window.*
window.toggleTieredRun       = toggleTieredRun;
window.toggleNetRun          = toggleNetRun;
window.togglePulseRewardPanel = togglePulseRewardPanel;
window.resetAll              = resetAll;

// ── Static task data (weekly/daily cards + nightwave fallback) ────────────────
const TASK_DATA = {
  weekly: [
    { id:'archon',    title:'Archon Hunt',          desc:'Weekly 3-mission hunt. Rewards Archon Shards for permanent build upgrades.',      tag:'weekly', reward:'Archon Shard',    wikiUrl:'https://warframe.fandom.com/wiki/Archon_Hunt' },
    { id:'circuit',   title:'The Circuit (Duviri)', desc:'Roguelike endless for Incarnon Genesis adapters. Resets weekly selections.',       tag:'weekly', reward:'Incarnon Genesis', wikiUrl:'https://warframe.fandom.com/wiki/The_Circuit',
      liveInfo:'<div class="sortie-stages"><div class="sortie-stage">Loadout picks are personal — they randomise for you in Teshin\'s Cave and reset every ~2 hours or after any Duviri run.</div><div class="sortie-stage">Steel Path Circuit Incarnon options rotate weekly — check the wiki for this week\'s pool.</div></div>' },
    { id:'syndicate', title:'Syndicate Standing Cap', desc:'Hit your weekly cap across chosen syndicates. Use missions or medallions.',      tag:'weekly', reward:'Standing',         wikiUrl:'https://warframe.fandom.com/wiki/Syndicate' },
  ],
  daily: [
    { id:'sortie',    title:'Sortie',            desc:'3-stage daily chain with modifiers. Rewards Rivens, Forma, Exilus adapters.', tag:'daily', reward:'Riven / Forma', wikiUrl:'https://warframe.fandom.com/wiki/Sortie' },
    { id:'synddaily', title:'Syndicate Dailies', desc:'Daily missions to build standing toward your weekly cap.',                    tag:'daily', reward:'Standing',       wikiUrl:'https://warframe.fandom.com/wiki/Syndicate' },
  ],
  nightwave_fallback: [
    { id:'nw1', title:'Complete a Sortie',           standing:1000, type:'daily' },
    { id:'nw2', title:'Kill 150 Enemies',            standing:1000, type:'daily' },
    { id:'nw3', title:'Complete 3 Void Fissures',    standing:1000, type:'daily' },
    { id:'nw4', title:'Run 5 Syndicate Missions',    standing:1500, type:'weekly' },
    { id:'nw5', title:'Complete a Nightmare Mission',standing:1500, type:'weekly' },
    { id:'nw6', title:'Complete an Archon Hunt',     standing:4500, type:'weekly elite' },
  ],
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  loadWikiContent(); // fire-and-forget — populates cache in background

  // Run storage migration before touching any UI
  if (migratePulseWeek(week)) persist();

  initSectionToggles();

  // Render immediately with static data so the page is usable before any fetch
  renderCards(TASK_DATA.weekly, TASK_DATA.daily);
  renderPulses();
  renderNightwave(TASK_DATA.nightwave_fallback, 'Loading live Nightwave data...');
  renderWorldCycles();   // builds flexbox cycle cards; applyCycle() fills data as fetches resolve
  updateCountdown();
  setInterval(updateCountdown, 1000);
  setInterval(tickSteelPathTimer, 1000);

  // ── Live badge registry ───────────────────────────────────────────────────
  const _ep = {};
  function trackEndpoint(name)  { _ep[name] = 'pending'; _updateBadge(); }
  function endpointOk(name)     { _ep[name] = 'ok';      _updateBadge(); }
  function endpointFail(name)   { _ep[name] = 'fail';    _updateBadge(); }
  function _updateBadge() {
    const vals = Object.values(_ep);
    if (!vals.length || vals.some(v => v === 'pending')) { setBadge('loading'); return; }
    const ok   = vals.filter(v => v === 'ok').length;
    const fail = vals.filter(v => v === 'fail').length;
    if (ok === 0)  { setBadge('offline');  return; }
    // Up to 1 endpoint failure still counts as Live — e.g. Invasions down alone
    // won't degrade the badge. 2+ failures = Partial. All fail = Offline.
    if (fail <= 1) { setBadge('live');     return; }
    setBadge('partial');
  }

  // safeRender: if fn throws due to unexpected data shape, retries with the
  // WF_MOCK entry for that section only — every other live section is unaffected.
  function safeRender(epName, liveData, mockData, fn) {
    const usingLive = liveData != null;
    const src       = usingLive ? liveData : mockData;
    try {
      fn(src);
      usingLive ? endpointOk(epName) : endpointFail(epName);
    } catch (err) {
      console.error('[Tennoplan]', epName, 'render error — falling back to mock:', err.message);
      try { fn(mockData); } catch { /* mock also failed — section stays in loading state */ }
      endpointFail(epName);
    }
  }

  // ── One-time fetches — all fired simultaneously via Promise.allSettled ────
  // No single slow/failed endpoint can block the rest of the app from rendering.
  ['nightwave', 'baro', 'archon', 'sortie', 'steelPath'].forEach(trackEndpoint);

  Promise.allSettled([
    apiFetch(`${API}/nightwave${LANG}`),
    apiFetch(`${API}/voidTrader${LANG}`),
    apiFetch(`${API}/archonHunt${LANG}`),
    apiFetch(`${API}/sortie${LANG}`),
    apiFetch(`${API}/steelPath${LANG}`),
  ]).then(([nwR, baroR, archonR, sortieR, spR]) => {

    safeRender('nightwave',
      nwR.status === 'fulfilled' ? nwR.value : null,
      window.WF_MOCK?.nightwave,
      nw => {
        if (!nw || !Array.isArray(nw.activeChallenges) || !nw.activeChallenges.length)
          throw new Error('invalid payload');
        const acts = nw.activeChallenges.filter(Boolean).map(c => ({
          id:       c.id || c.title || 'nw-act',
          title:    c.title || 'Unknown Act',
          standing: c.reputation || 0,
          type:     c.isElite ? 'weekly elite' : c.isDaily ? 'daily' : 'weekly',
        }));
        renderNightwave(acts, nw.season ? 'Season ' + nw.season : 'Current season');
      }
    );

    safeRender('baro',
      baroR.status === 'fulfilled' ? baroR.value : null,
      window.WF_MOCK?.voidTrader,
      b => {
        if (!b) throw new Error('no payload');
        renderBaro(b);
      }
    );

    safeRender('archon',
      archonR.status === 'fulfilled' ? archonR.value : null,
      window.WF_MOCK?.archonHunt,
      hunt => {
        const card = document.getElementById('card-archon');
        if (!card || !hunt) throw new Error('no card or payload');
        const missions = hunt.missions || hunt.variants || [];
        if (!missions.length) throw new Error('empty missions');
        const old = card.querySelector('.card-live-info');
        if (old) old.remove();
        const info = document.createElement('div');
        info.className = 'card-live-info';
        info.innerHTML = '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">This week\'s missions:</div>'
          + '<div class="sortie-stages">'
          + missions.map((v, i) =>
              `<div class="sortie-stage">Stage ${i+1}: <strong>${(v && (v.type || v.missionType)) || 'N/A'}</strong> — ${(v && (v.node || v.nodeName)) || 'N/A'}</div>`
            ).join('')
          + '</div>';
        const footer = card.querySelector('.card-footer');
        if (footer) footer.before(info); else card.appendChild(info);
      }
    );

    safeRender('sortie',
      sortieR.status === 'fulfilled' ? sortieR.value : null,
      window.WF_MOCK?.sortie,
      s => {
        const card = document.getElementById('card-sortie');
        if (!card || !s || !Array.isArray(s.variants)) throw new Error('no card or variants');
        const old = card.querySelector('.card-live-info');
        if (old) old.remove();
        const info = document.createElement('div');
        info.className = 'card-live-info';
        info.innerHTML = '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Today\'s stages:</div>'
          + '<div class="sortie-stages">'
          + s.variants.map((v, i) =>
              `<div class="sortie-stage">Stage ${i+1}: <strong>${(v && v.missionType) || 'N/A'}</strong> — ${(v && v.modifier) || 'N/A'}</div>`
            ).join('')
          + '</div>';
        const footer = card.querySelector('.card-footer');
        if (footer) footer.before(info); else card.appendChild(info);
      }
    );

    safeRender('steelPath',
      spR.status === 'fulfilled' ? spR.value : null,
      window.WF_MOCK?.steelPath,
      sp => renderSteelPath(sp, !sp)
    );
  });

  // ── Polled loaders — each runs independently on its own interval ──────────
  const FISSURES_POLL_MS  = 60000;
  const ARB_POLL_MS       = 60000;
  const INVASIONS_POLL_MS = 120000;
  const CYCLES_POLL_MS    = 30000;
  const ALERTS_POLL_MS    = 120000;

  // Void Fissures
  let fissuresFirstLoad = true;
  let fissureTickStarted = false;
  function loadVoidFissures() {
    apiFetch(`${API}/fissures${LANG}`, { fallback: window.WF_MOCK?.fissures })
      .then(data => {
        renderVoidFissures(data);
        if (!fissureTickStarted) { fissureTickStarted = true; setInterval(tickFissureTimers, 1000); }
        if (fissuresFirstLoad)   { fissuresFirstLoad  = false; endpointOk('fissures'); }
      })
      .catch(err => {
        console.error('[Tennoplan] fissures fetch failed:', err?.message ?? err);
        if (fissuresFirstLoad) { fissuresFirstLoad = false; endpointFail('fissures'); }
      });
  }
  trackEndpoint('fissures');
  loadVoidFissures();
  setInterval(loadVoidFissures, FISSURES_POLL_MS);

  // Arbitration (polled, no badge — updates silently)
  function loadArbitrationLive() {
    apiFetch(`${API}/arbitration${LANG}`, { fallback: window.WF_MOCK?.arbitration })
      .then(arb => { if (arb) applyArbitrationCard(arb); })
      .catch(err => {
        console.error('[Tennoplan] arbitration fetch failed:', err?.message ?? err);
      });
  }
  loadArbitrationLive();
  setInterval(loadArbitrationLive, ARB_POLL_MS);

  // Invasions
  let invasionsFirstLoad = true;
  function loadInvasions() {
    apiFetch(`${API}/invasions${LANG}`, { fallback: window.WF_MOCK?.invasions })
      .then(data => {
        renderInvasions(data);
        if (invasionsFirstLoad) { invasionsFirstLoad = false; endpointOk('invasions'); }
      })
      .catch(err => {
        console.error('[Tennoplan] invasions fetch failed:', err?.message ?? err);
        if (invasionsFirstLoad) {
          invasionsFirstLoad = false;
          const c = document.getElementById('inv-container');
          if (c) c.innerHTML = '<div class="inv-offline">Invasion data unavailable — check back soon.</div>';
          endpointFail('invasions');
        }
      });
  }
  trackEndpoint('invasions');
  loadInvasions();
  setInterval(loadInvasions, INVASIONS_POLL_MS);

  // World State Cycles
  let cyclesTickStarted = false;
  let cetusFirstLoad    = true;
  let vallisFirstLoad   = true;
  let cambionFirstLoad  = true;

  function startCycleTick() {
    if (!cyclesTickStarted) { cyclesTickStarted = true; setInterval(tickCycleTimers, 1000); }
  }

  function loadCetusCycle() {
    apiFetch(`${API}/cetusCycle${LANG}`, { fallback: window.WF_MOCK?.cetusCycle })
      .then(data => {
        applyCycle('cetus', normalizeCetusCycle(data));
        startCycleTick();
        if (cetusFirstLoad) { cetusFirstLoad = false; endpointOk('cetusCycle'); }
      })
      .catch(err => {
        console.error('[Tennoplan] cetusCycle fetch failed:', err?.message ?? err);
        if (cetusFirstLoad) {
          cetusFirstLoad = false;
          const el = document.getElementById('cetus-timer');
          if (el) el.textContent = '—';
          endpointFail('cetusCycle');
        }
      });
  }

  function loadVallisCycle() {
    apiFetch(`${API}/vallisCycle${LANG}`, { fallback: window.WF_MOCK?.vallisCycle })
      .then(data => {
        applyCycle('vallis', normalizeVallisCycle(data));
        startCycleTick();
        if (vallisFirstLoad) { vallisFirstLoad = false; endpointOk('vallisCycle'); }
      })
      .catch(err => {
        console.error('[Tennoplan] vallisCycle fetch failed:', err?.message ?? err);
        if (vallisFirstLoad) {
          vallisFirstLoad = false;
          const el = document.getElementById('vallis-timer');
          if (el) el.textContent = '—';
          endpointFail('vallisCycle');
        }
      });
  }

  function loadCambionCycle() {
    apiFetch(`${API}/cambionCycle${LANG}`, { fallback: window.WF_MOCK?.cambionCycle })
      .then(data => {
        applyCycle('cambion', normalizeCambionCycle(data));
        startCycleTick();
        if (cambionFirstLoad) { cambionFirstLoad = false; endpointOk('cambionCycle'); }
      })
      .catch(err => {
        console.error('[Tennoplan] cambionCycle fetch failed:', err?.message ?? err);
        if (cambionFirstLoad) {
          cambionFirstLoad = false;
          const el = document.getElementById('cambion-timer');
          if (el) el.textContent = '—';
          endpointFail('cambionCycle');
        }
      });
  }

  trackEndpoint('cetusCycle');
  trackEndpoint('vallisCycle');
  trackEndpoint('cambionCycle');
  loadCetusCycle();
  loadVallisCycle();
  loadCambionCycle();
  setInterval(loadCetusCycle,   CYCLES_POLL_MS);
  setInterval(loadVallisCycle,  CYCLES_POLL_MS);
  setInterval(loadCambionCycle, CYCLES_POLL_MS);

  // Notable Alerts (silent fail — section stays hidden)
  function loadAlerts() {
    apiFetch(`${API}/alerts${LANG}`, { fallback: window.WF_MOCK?.alerts })
      .then(data => renderAlerts(data))
      .catch(err => {
        console.error('[Tennoplan] alerts fetch failed:', err?.message ?? err);
      });
  }
  loadAlerts();
  setInterval(loadAlerts, ALERTS_POLL_MS);

  // Drop data — non-blocking, never touches the badge
  loadDropData();
}

init();
```

### ./js/state.js
```
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
```

### ./js/ui/alerts.js
```
// js/ui/alerts.js — renderAlerts().

import { formatDur } from './layout.js';

// ── Module-level state ────────────────────────────────────────────────────────
let alertsTickOn = false;

const NOTABLE_TYPES = ['nitain', 'helm', 'skin', 'vandal', 'wraith', 'weapon'];

// ── Export ────────────────────────────────────────────────────────────────────
export function renderAlerts(data) {
  const section = document.getElementById('alerts-section');
  if (!section) return;
  const notable = (data || []).filter(a => {
    const types = (a.rewardTypes || []).map(t => String(t).toLowerCase());
    return types.some(t => NOTABLE_TYPES.some(n => t.includes(n)));
  });
  if (!notable.length) { section.style.display = 'none'; return; }

  const container = document.getElementById('alerts-container');
  const list = document.createElement('div');
  list.className = 'alerts-list';
  notable.forEach(a => {
    const mission   = a.mission || {};
    const reward    = mission.reward || {};
    const rewardStr = reward.asString || reward.itemString || 'Unknown reward';
    const node      = mission.node || a.node || 'Unknown';
    const type      = mission.type || a.type || '';
    const minLvl    = mission.minEnemyLevel ?? a.minEnemyLevel;
    const maxLvl    = mission.maxEnemyLevel ?? a.maxEnemyLevel;
    const levels    = (minLvl != null && maxLvl != null) ? ` · Lvl ${minLvl}–${maxLvl}` : '';
    const expiry    = a.expiry || '';
    const row = document.createElement('div');
    row.className = 'alert-row';
    row.innerHTML = `
      <div class="alert-left">
        <div class="alert-reward">${rewardStr}</div>
        <div class="alert-meta">${node}${type ? ' · ' + type : ''}${levels}</div>
      </div>
      <div class="alert-timer"${expiry ? ` data-alert-expiry="${expiry}"` : ''}>${expiry ? formatDur(new Date(expiry) - Date.now()) : '—'}</div>`;
    list.appendChild(row);
  });
  container.innerHTML = '';
  container.appendChild(list);
  section.style.display = '';
  if (typeof window !== 'undefined' && !alertsTickOn) {
    alertsTickOn = true;
    setInterval(() => {
      document.querySelectorAll('[data-alert-expiry]').forEach(el => {
        const exp = el.getAttribute('data-alert-expiry');
        if (exp) el.textContent = formatDur(new Date(exp) - Date.now());
      });
    }, 1000);
  }
}
```

### ./js/ui/arbitration.js
```
// js/ui/arbitration.js — applyArbitrationCard(), tickArbitrationTimers(), and helpers.

import { state, persist } from '../state.js';
import { formatDur, checkSVG } from './layout.js';
import { buildRewardPanelHTML } from './rewards.js';

// ── Module-level state ────────────────────────────────────────────────────────
let lastArbitrationPayload = null;
let wfArbTickOn            = false;
// Tracks whether the arbitration reward panel is currently open.
// Mirrors the openRewardPanels Set in cards.js but scoped to this module only
// — the 'arbitration' key is never touched by cards.js itself.
let arbRewardPanelOpen     = false;

// ── Private helpers ───────────────────────────────────────────────────────────
function arbitrationPayloadOk(arb) {
  if (!arb || arb.expired) return false;
  const nk = String(arb.nodeKey || arb.node || '');
  if (!nk || /^SolNode0+$/i.test(nk)) return false;
  const t   = new Date(arb.expiry).getTime();
  if (!Number.isFinite(t)) return false;
  const rot = t - Date.now();
  if (rot > 12 * 3600000 || rot < -600000) return false;
  return true;
}

function arbHourSlotKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 13);
}

function nextUtcHourMs(ts = Date.now()) {
  const d = new Date(ts);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(0);
  const t0 = d.getTime();
  return t0 <= ts ? t0 + 3600000 : t0;
}

function getArbitrationSlotKey(arb, ok) {
  if (ok && arb && arb.id)  return 'id:' + arb.id;
  if (ok && arb)            return 'n:' + String(arb.node) + '|' + String(arb.activation || '');
  return 'fb:' + arbHourSlotKey();
}

// ── Exports ───────────────────────────────────────────────────────────────────
export function tickArbitrationTimers() {
  document.querySelectorAll('[data-arb-until]').forEach(el => {
    const u = el.getAttribute('data-arb-until');
    if (u) el.textContent = formatDur(new Date(u) - Date.now());
  });
}

export function applyArbitrationCard(arb) {
  if (!arb) return;
  lastArbitrationPayload = arb;
  const dc = document.getElementById('daily-cards');
  if (!dc) return;
  let div = document.getElementById('card-arbitration');
  if (!div) {
    div = document.createElement('div');
    div.id = 'card-arbitration';
    dc.appendChild(div);
  }
  const ok       = arbitrationPayloadOk(arb);
  const slotKey  = getArbitrationSlotKey(arb, ok);
  const done     = state.arb.doneForKey === slotKey;
  const rotIso   = ok && arb.expiry
    ? new Date(arb.expiry).toISOString()
    : new Date(nextUtcHourMs()).toISOString();
  const typ = (arb.type && arb.type !== 'Unknown')
    ? arb.type
    : (arb.typeKey && arb.typeKey !== 'Unknown' ? String(arb.typeKey).replace(/_/g, ' ') : null);
  const nodeLabel  = ok ? arb.node : null;
  const enemyLabel = ok && arb.enemy && arb.enemy !== 'Tenno' ? arb.enemy : null;
  const rotSpan       = `<span data-arb-until="${rotIso}">${formatDur(new Date(rotIso) - Date.now())}</span>`;
  const rotSpanInline = `<span class="arb-inline-time">New mission in about ${rotSpan}</span>`;
  const rotateRow     = ok && !done ? `<div class="sortie-stage">${rotSpanInline}</div>` : '';
  const fallbackExtra = !ok && !done
    ? `<div class="sortie-stage"><span class="arb-inline-time">Roughly hourly rotation — next pick in about ${rotSpan}</span></div>`
    : '';
  const missionLines = ok
    ? `<div class="sortie-stage"><strong>Playing now:</strong> ${typ || 'Arbitration'} — ${nodeLabel}</div>`
      + (enemyLabel ? `<div class="sortie-stage">Facing <strong>${enemyLabel}</strong></div>` : '')
      + rotateRow
    : (done ? '' : `<div class="sortie-stage">Open the <strong>Star Chart</strong> → <strong>Arbitrations</strong> to see this hour's mission.</div>` + fallbackExtra);
  const doneLine = done
    ? `<div class="arb-done-wrap">
         <p class="arb-done-msg">Marked complete for this hour.</p>
         <div class="arb-next-cycle">
           <div class="arb-next-cycle-label">Time until next cycle</div>
           <div class="arb-next-cycle-time"><span data-arb-until="${rotIso}">${formatDur(new Date(rotIso) - Date.now())}</span></div>
         </div>
       </div>`
    : '';

  div.className = 'card' + (done ? ' done' : '');
  div.innerHTML = `
    <div class="card-header">
      <div class="card-title">Arbitration</div>
      <div class="card-check">${checkSVG()}</div>
    </div>
    <div class="card-desc">Steel Path endless runs — Vitus Essence and Arbitration-only mods. The Star Chart picks a new mission about every hour.</div>
    <div class="card-live-info">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">What to do next</div>
      <div class="sortie-stages">${missionLines}${doneLine}</div>
    </div>
    <div class="card-footer">
      <span class="card-tag tag-daily">daily</span>
      <span class="card-reward">Arbitration mods</span>
      <a class="card-wiki card-rewards-toggle-arb" href="#">Rewards ↓</a>
      <a class="card-wiki" href="https://warframe.fandom.com/wiki/Arbitrations" target="_blank" rel="noopener" onclick="event.stopPropagation()">Wiki ↗</a>
    </div>`;

  div.onclick = () => {
    const a = lastArbitrationPayload;
    if (!a) return;
    const k = getArbitrationSlotKey(a, arbitrationPayloadOk(a));
    state.arb.doneForKey = state.arb.doneForKey === k ? null : k;
    persist();
    applyArbitrationCard(a);
  };

  const arbToggle = div.querySelector('.card-rewards-toggle-arb');
  if (arbToggle) {
    arbToggle.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      if (arbRewardPanelOpen) {
        arbRewardPanelOpen = false;
        div.querySelector('.card-rewards-panel')?.remove();
        arbToggle.textContent = 'Rewards ↓';
      } else {
        arbRewardPanelOpen = true;
        const panel = document.createElement('div');
        panel.className = 'card-rewards-panel';
        panel.innerHTML = buildRewardPanelHTML('arbitration');
        panel.addEventListener('click', e => e.stopPropagation());
        div.appendChild(panel);
        arbToggle.textContent = 'Rewards ↑';
      }
    });
    if (arbRewardPanelOpen) {
      const panel = document.createElement('div');
      panel.className = 'card-rewards-panel';
      panel.innerHTML = buildRewardPanelHTML('arbitration');
      panel.addEventListener('click', e => e.stopPropagation());
      div.appendChild(panel);
      arbToggle.textContent = 'Rewards ↑';
    }
  }

  if (typeof window !== 'undefined' && !wfArbTickOn) {
    wfArbTickOn = true;
    setInterval(tickArbitrationTimers, 1000);
  }
  tickArbitrationTimers();
}
```

### ./js/ui/baro.js
```
// js/ui/baro.js — renderBaro().

import { formatDur } from './layout.js';

export function renderBaro(b) {
  if (!b) { document.getElementById('baro-status').textContent = 'Data unavailable'; return; }
  const dot    = document.getElementById('baro-dot');
  const status = document.getElementById('baro-status');
  const timer  = document.getElementById('baro-timer');
  if (b.active) {
    dot.className    = 'baro-dot present';
    status.textContent = 'Present at ' + (b.location || 'Relay');
    timer.textContent  = 'Leaves in ' + formatDur(new Date(b.expiry) - Date.now());
  } else {
    dot.className    = 'baro-dot absent';
    status.textContent = 'Next visit: ' + (b.location || 'Unknown relay');
    timer.textContent  = b.activation ? 'Arrives in ' + formatDur(new Date(b.activation) - Date.now()) : '—';
  }
}
```

### ./js/ui/cards.js
```
// js/ui/cards.js — makeCard(), renderCards(), togglePulseRewardPanel().

import { week, today, persist } from '../state.js';
import { checkSVG } from './layout.js';
import { CARD_REWARDS, buildRewardPanelHTML } from './rewards.js';

// ── Module-level state ─────────────────────────────────────────────────────────
export const openRewardPanels = new Set(); // card/pulse ids with open reward panels

// ── Constants ─────────────────────────────────────────────────────────────────
// Called from HTML inline onclick (exposed via window.* in main.js)
export function togglePulseRewardPanel(key, btn) {
  const panel = document.getElementById(key + '-panel');
  if (!panel) return;
  if (openRewardPanels.has(key)) {
    openRewardPanels.delete(key);
    panel.style.display = 'none';
    btn.textContent = 'Rewards ↓';
  } else {
    openRewardPanels.add(key);
    panel.style.display = '';
    btn.textContent = 'Rewards ↑';
  }
}

// ── Cards ─────────────────────────────────────────────────────────────────────
function makeCard(t, taskStore) {
  const store     = taskStore || week.tasks;
  const done      = !!store[t.id];
  const tc        = t.tag === 'biweekly' ? 'tag-biweek' : 'tag-' + t.tag;
  const hasRewards = !!CARD_REWARDS[t.id];
  const div = document.createElement('div');
  div.className = 'card' + (done ? ' done' : '');
  div.id = 'card-' + t.id;
  div.innerHTML = `
    <div class="card-header">
      <div class="card-title">${t.title}</div>
      <div class="card-check">${checkSVG()}</div>
    </div>
    <div class="card-desc">${t.desc}</div>
    ${t.liveInfo ? `<div class="card-live-info">${t.liveInfo}</div>` : ''}
    <div class="card-footer">
      <span class="card-tag ${tc}">${t.tag}</span>
      <span class="card-reward">${t.reward}</span>
      ${hasRewards ? `<a class="card-wiki card-rewards-toggle" href="#">Rewards ↓</a>` : ''}
      ${t.wikiUrl ? `<a class="card-wiki" href="${t.wikiUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Wiki ↗</a>` : ''}
    </div>`;

  if (hasRewards) {
    const toggle = div.querySelector('.card-rewards-toggle');
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      if (openRewardPanels.has(t.id)) {
        openRewardPanels.delete(t.id);
        div.querySelector('.card-rewards-panel')?.remove();
        toggle.textContent = 'Rewards ↓';
      } else {
        openRewardPanels.add(t.id);
        const panel = document.createElement('div');
        panel.className = 'card-rewards-panel';
        panel.innerHTML = buildRewardPanelHTML(t.id);
        panel.addEventListener('click', e => e.stopPropagation());
        div.appendChild(panel);
        toggle.textContent = 'Rewards ↑';
      }
    });
    // Restore panel if it was open before card was re-rendered
    if (openRewardPanels.has(t.id)) {
      const panel = document.createElement('div');
      panel.className = 'card-rewards-panel';
      panel.innerHTML = buildRewardPanelHTML(t.id);
      panel.addEventListener('click', e => e.stopPropagation());
      div.appendChild(panel);
      div.querySelector('.card-rewards-toggle').textContent = 'Rewards ↑';
    }
  }

  div.onclick = () => {
    store[t.id] = !store[t.id];
    div.classList.toggle('done', !!store[t.id]);
    persist();
  };
  return div;
}

export function renderCards(weekly, daily) {
  const wc = document.getElementById('weekly-cards');
  const dc = document.getElementById('daily-cards');
  wc.innerHTML = '';
  dc.innerHTML = '';
  weekly.forEach(t => wc.appendChild(makeCard(t, week.tasks)));
  daily.forEach(t  => dc.appendChild(makeCard(t, today.tasks)));
}
```

### ./js/ui/countdown.js
```
// js/ui/countdown.js — updateCountdown().

export function updateCountdown() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntil = day === 1 ? 7 : (8 - day) % 7;
  const nextWeek  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil));
  const wd = nextWeek - now;
  const wh = Math.floor(wd / 3600000), wm = Math.floor((wd % 3600000) / 60000), ws = Math.floor((wd % 60000) / 1000);
  const tw = document.getElementById('timer-weekly');
  if (tw) tw.textContent = `${String(wh).padStart(2,'0')}:${String(wm).padStart(2,'0')}:${String(ws).padStart(2,'0')}`;

  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dd = midnight - now;
  const dh = Math.floor(dd / 3600000), dm = Math.floor((dd % 3600000) / 60000), ds = Math.floor((dd % 60000) / 1000);
  const td = document.getElementById('timer-daily');
  if (td) td.textContent = `${String(dh).padStart(2,'0')}:${String(dm).padStart(2,'0')}:${String(ds).padStart(2,'0')}`;
}
```

### ./js/ui/cycles.js
```
// js/ui/cycles.js — renderWorldCycles(), applyCycle(), tickCycleTimers(),
//                   CYCLE_DUR_MS, CYCLE_HINTS, CYCLE_META.

import { formatDur } from './layout.js';
import { buildCyclePanel } from './knowMore.js';

// ── Constants ─────────────────────────────────────────────────────────────────
export const CYCLE_DUR_MS = {
  day: 6000000, night: 3000000,
  warm:  400000, cold:   800000,
  fass: 6000000, vome:  6000000,
};

export const CYCLE_HINTS = {
  day:   'Mining & bounties',
  night: 'Eidolons & fishing',
  warm:  'Toroid farming',
  cold:  'Fishing & conservation',
  fass:  'Rare Vome drops',
  vome:  'Fishing & bounties',
};

// Cycle display metadata — id matches DOM ids and API normalizer names
export const CYCLE_META = [
  { id: 'cetus',   label: 'Cetus',         defaultHint: 'Night → Eidolons & fishing'      },
  { id: 'vallis',  label: 'Orb Vallis',    defaultHint: 'Cold → fishing & conservation'   },
  { id: 'cambion', label: 'Cambion Drift', defaultHint: 'Vome → fishing & bounties'       },
];

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Build the flexbox cycle cards inside #cycles-grid.
 * Renders placeholder skeletons immediately so the layout is in place before
 * any API data arrives. applyCycle() fills in live values as each fetch resolves.
 */
export function renderWorldCycles() {
  const grid = document.getElementById('cycles-grid');
  if (!grid) return;
  grid.innerHTML = CYCLE_META.map(({ id, label, defaultHint }) => `
    <div class="cycle-card" id="cycle-${id}">
      <div class="cycle-header">
        <span class="cycle-name">${label}</span>
        <span class="cycle-state-pill" id="${id}-pill">—</span>
      </div>
      <div class="cycle-next" id="${id}-next">Next: —</div>
      <div class="cycle-bar-label">time remaining</div>
      <div class="cycle-bar-bg">
        <div class="cycle-bar-fill" id="${id}-bar" style="width:0%"></div>
      </div>
      <div class="cycle-footer">
        <span class="cycle-hint" id="${id}-hint">${defaultHint}</span>
        <div class="cycle-timer-wrap">
          <div class="cycle-timer-label">changes in</div>
          <div class="cycle-timer" id="${id}-timer">—</div>
        </div>
      </div>
    </div>
  `).join('');
}

// cycle: { current, next, timeLeft, percent, expiry, activation }
// Produced by normalizeCetusCycle / normalizeVallisCycle / normalizeCambionCycle in api.js.
export function applyCycle(id, cycle) {
  const pill  = document.getElementById(id + '-pill');
  const bar   = document.getElementById(id + '-bar');
  const timer = document.getElementById(id + '-timer');
  const hint  = document.getElementById(id + '-hint');
  const nextEl = document.getElementById(id + '-next');
  if (!pill || !bar || !timer) return;
  const stateKey = cycle.current.toLowerCase();
  // Store expiry + activation on the timer element so tickCycleTimers can
  // recalculate timeLeft and bar width every second without another fetch.
  timer.setAttribute('data-cycle-expiry', cycle.expiry);
  timer.setAttribute('data-cycle-state',  stateKey);
  if (cycle.activation) timer.setAttribute('data-cycle-activation', cycle.activation);
  pill.className    = 'cycle-state-pill ' + stateKey;
  pill.textContent  = cycle.current;
  if (nextEl) nextEl.textContent = 'Next: ' + cycle.next;
  bar.className     = 'cycle-bar-fill ' + stateKey;
  bar.style.width   = cycle.percent.toFixed(1) + '%'; // percent of phase time remaining
  timer.textContent = formatDur(cycle.timeLeft);
  if (hint) hint.textContent = CYCLE_HINTS[stateKey] || '';

  // Attach or refresh Know More expand for this cycle card
  const card = document.getElementById('cycle-' + id);
  if (card) {
    // Remove old expand wrapper and button on cycle refresh
    card.querySelectorAll('.km-collapsible').forEach(el => el.remove());
    card.querySelectorAll('.km-toggle-btn').forEach(el => el.remove());

    const cycleKnowBtn = document.createElement('button');
    cycleKnowBtn.className   = 'km-toggle-btn';
    cycleKnowBtn.textContent = 'Know more ↓';
    const footer = card.querySelector('.cycle-footer');
    if (footer) footer.appendChild(cycleKnowBtn);
    else card.appendChild(cycleKnowBtn);

    let cycleExpandWrapper = null;
    let cycleExpandOpen    = false;

    cycleKnowBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!cycleExpandWrapper) {
        const panelHTML = buildCyclePanel(id, stateKey);
        cycleExpandWrapper = document.createElement('div');
        cycleExpandWrapper.className = 'km-collapsible';
        const inner = document.createElement('div');
        inner.className = 'km-inner';
        const panel = document.createElement('div');
        panel.className = 'km-panel';
        panel.innerHTML = panelHTML;
        inner.appendChild(panel);
        cycleExpandWrapper.appendChild(inner);
        card.appendChild(cycleExpandWrapper);
      }
      cycleExpandOpen = !cycleExpandOpen;
      cycleExpandWrapper.classList.toggle('km-open', cycleExpandOpen);
      cycleKnowBtn.textContent = cycleExpandOpen ? 'Less ↑' : 'Know more ↓';
    });
  }
}

export function tickCycleTimers() {
  document.querySelectorAll('[data-cycle-expiry]').forEach(el => {
    const expiryIso     = el.getAttribute('data-cycle-expiry');
    const stateKey      = el.getAttribute('data-cycle-state');
    const activationIso = el.getAttribute('data-cycle-activation');
    if (!expiryIso || !stateKey) return;
    const now     = Date.now();
    const expMs   = new Date(expiryIso).getTime();
    const remaining = Math.max(0, expMs - now);
    el.textContent  = formatDur(remaining);
    const id  = el.id.replace('-timer', '');
    const bar = document.getElementById(id + '-bar');
    if (bar) {
      let pct;
      if (activationIso) {
        // Use API-derived phase window: percent of time still remaining (bar shrinks to 0)
        const actMs = new Date(activationIso).getTime();
        const total = expMs - actMs;
        pct = total > 0 ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0;
      } else {
        // Fallback: known phase durations when API omits activation
        const durationMs = CYCLE_DUR_MS[stateKey] || 6000000;
        pct = durationMs > 0 ? Math.max(0, Math.min(100, (remaining / durationMs) * 100)) : 0;
      }
      bar.style.width = pct.toFixed(1) + '%';
    }
  });
}
```

### ./js/ui/fissures.js
```
// js/ui/fissures.js — renderVoidFissures(), tickFissureTimers(), normalizeFissureTier().

import { formatDur } from './layout.js';
import { buildFissurePanel } from './knowMore.js';

// ── Module-level state ────────────────────────────────────────────────────────
let lastFissureData = null;
let fissureFilter   = 'all'; // 'all' | 'normal' | 'steelpath'

// ── Private helpers ───────────────────────────────────────────────────────────
function normalizeFissureTier(raw) {
  if (raw == null || raw === '') return 'Unknown';
  const s     = String(raw).trim();
  const lower = s.toLowerCase();
  const map   = { lith:'Lith', meso:'Meso', neo:'Neo', axi:'Axi', requiem:'Requiem', omnia:'Omnia' };
  return map[lower] || (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
}

// ── Exports ───────────────────────────────────────────────────────────────────
export function renderVoidFissures(fissures) {
  if (!fissures || !fissures.length) return;
  lastFissureData = fissures;
  const tierOrder = ['Lith','Meso','Neo','Axi','Requiem','Omnia'];
  const colors    = { Lith:'#5dc98a', Meso:'#6ea8e8', Neo:'#c8a84b', Axi:'#b87de8', Requiem:'#e05c5c', Omnia:'#4fc3f7' };

  const filtered = fissures
    .filter(f => !f.isStorm)
    .filter(f => {
      if (fissureFilter === 'normal')    return !f.isHard;
      if (fissureFilter === 'steelpath') return !!f.isHard;
      return true;
    })
    .map(f => ({ ...f, _tier: normalizeFissureTier(f.tier) }))
    .sort((a, b) => {
      const ia = tierOrder.indexOf(a._tier), ib = tierOrder.indexOf(b._tier);
      const sa = ia === -1 ? 999 : ia,       sb = ib === -1 ? 999 : ib;
      if (sa !== sb) return sa - sb;
      if (a._tier !== b._tier) return a._tier.localeCompare(b._tier);
      return new Date(a.expiry || 0) - new Date(b.expiry || 0);
    });

  const byTier = {};
  filtered.forEach(f => { (byTier[f._tier] ??= []).push(f); });
  const extraTiers  = Object.keys(byTier).filter(t => tierOrder.indexOf(t) === -1).sort();
  const tiersToShow = tierOrder.concat(extraTiers).filter(t => byTier[t]?.length);

  const anchor = document.getElementById('fissures-anchor');
  if (!anchor) return;
  let wrap = document.getElementById('wf-fissures-live');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'wf-fissures-live';
    anchor.parentNode.insertBefore(wrap, anchor);
  }
  wrap.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.style.marginTop = '28px';
  title.innerHTML = 'Void Fissures <span style="font-size:10px;color:var(--green);margin-left:8px">LIVE</span>';
  wrap.appendChild(title);

  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;';
  [['all','All'],['normal','Normal'],['steelpath','Steel Path']].forEach(([val, label]) => {
    const btn  = document.createElement('button');
    btn.textContent = label;
    const isOn = fissureFilter === val;
    btn.className  = 'pulse-run' + (isOn ? ' pulse-run-on' : '');
    btn.style.cssText = 'font-family:inherit;' + (isOn
      ? 'border-color:var(--accent);color:var(--text);background:rgba(79,195,247,0.12);box-shadow:0 0 0 1px rgba(79,195,247,0.25);'
      : '');
    btn.onclick = () => { fissureFilter = val; renderVoidFissures(lastFissureData); };
    filterBar.appendChild(btn);
  });
  wrap.appendChild(filterBar);

  if (!tiersToShow.length) {
    const empty = document.createElement('div');
    empty.className = 'fissure-tier-empty';
    empty.style.padding = '4px 0 12px';
    empty.textContent = 'No fissures match the current filter.';
    wrap.appendChild(empty);
  } else {
    const stack = document.createElement('div');
    stack.className = 'wf-fissures-stack';
    tiersToShow.forEach(tierName => {
      const list  = byTier[tierName];
      const color = colors[tierName] || '#6b7494';
      const block = document.createElement('div');
      block.className = 'fissure-tier-block';
      const head = document.createElement('div');
      head.className = 'fissure-tier-heading';
      head.style.color = color;
      head.innerHTML = `<span class="fissure-tier-dot" style="background:${color};box-shadow:0 0 8px ${color}55"></span>${tierName} relics`;
      block.appendChild(head);
      list.forEach(f => {
        const exp = f.expiry || '';
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;border-left:3px solid ${color};`;
        const t     = formatDur(new Date(exp) - Date.now());
        const badge = f.isHard
          ? `<span style="font-size:10px;font-weight:600;letter-spacing:0.05em;padding:2px 7px;border-radius:20px;color:#4fc3f7;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.3);white-space:nowrap">Steel Path</span>`
          : `<span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;color:var(--text-hint);white-space:nowrap">Normal</span>`;
        row.innerHTML = `
          <div style="flex:1;font-size:12px;color:var(--text)">${f.missionType || 'N/A'} — ${f.node || 'N/A'}</div>
          ${badge}
          <div class="fissure-time" data-expiry="${exp.replace(/"/g,'')}" style="font-size:11px;color:var(--text-dim);white-space:nowrap">${t}</div>`;
        // Know More — lazy attach on first click so wikiContent has time to load
        row.classList.add('fissure-row-expandable');
        const knowBtn = document.createElement('button');
        knowBtn.className = 'km-toggle-btn';
        knowBtn.textContent = 'Know more ↓';
        row.appendChild(knowBtn);

        row.dataset.missionType = f.missionType || '';
        row.dataset.faction     = f.faction || f.enemy || '';
        row.dataset.tier        = f._tier || '';

        let expandWrapper = null;
        let expandOpen    = false;

        knowBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (!expandWrapper) {
            const panelHTML = buildFissurePanel(
              row.dataset.missionType,
              row.dataset.faction,
              row.dataset.tier
            );
            expandWrapper = document.createElement('div');
            expandWrapper.className = 'km-collapsible';
            const inner = document.createElement('div');
            inner.className = 'km-inner';
            const panel = document.createElement('div');
            panel.className = 'km-panel';
            panel.innerHTML = panelHTML;
            inner.appendChild(panel);
            expandWrapper.appendChild(inner);
            row.after(expandWrapper);
          }
          expandOpen = !expandOpen;
          expandWrapper.classList.toggle('km-open', expandOpen);
          knowBtn.textContent = expandOpen ? 'Less ↑' : 'Know more ↓';
        });
        block.appendChild(row);
      });
      stack.appendChild(block);
    });
    wrap.appendChild(stack);
  }

  // Void Storms — always shown, unaffected by filter
  const storms = fissures
    .filter(f => !!f.isStorm)
    .map(f => ({ ...f, _tier: normalizeFissureTier(f.tier) }))
    .sort((a, b) => {
      const ia = tierOrder.indexOf(a._tier), ib = tierOrder.indexOf(b._tier);
      const sa = ia === -1 ? 999 : ia,       sb = ib === -1 ? 999 : ib;
      if (sa !== sb) return sa - sb;
      if (a._tier !== b._tier) return a._tier.localeCompare(b._tier);
      return new Date(a.expiry || 0) - new Date(b.expiry || 0);
    });
  const stormByTier  = {};
  storms.forEach(f => { (stormByTier[f._tier] ??= []).push(f); });
  const stormExtra   = Object.keys(stormByTier).filter(t => tierOrder.indexOf(t) === -1).sort();
  const stormTiers   = tierOrder.concat(stormExtra).filter(t => stormByTier[t]?.length);

  const stormSection = document.createElement('div');
  stormSection.style.marginTop = '24px';
  const stormTitle = document.createElement('div');
  stormTitle.className = 'section-title';
  stormTitle.style.marginTop = '0';
  stormTitle.textContent = 'Void Storms — Railjack Fissures';
  stormSection.appendChild(stormTitle);
  const stormSub = document.createElement('div');
  stormSub.style.cssText = 'font-size:11px;color:var(--text-dim);margin:-4px 0 10px;';
  stormSub.textContent   = 'Requires a Railjack — separate mission type, same relics and rewards.';
  stormSection.appendChild(stormSub);

  if (!stormTiers.length) {
    const empty = document.createElement('div');
    empty.className = 'fissure-tier-empty';
    empty.textContent = 'No active Void Storms right now.';
    stormSection.appendChild(empty);
  } else {
    const stormStack = document.createElement('div');
    stormStack.className = 'wf-fissures-stack';
    stormTiers.forEach(tierName => {
      const list  = stormByTier[tierName];
      const color = colors[tierName] || '#6b7494';
      const block = document.createElement('div');
      block.className = 'fissure-tier-block';
      const head = document.createElement('div');
      head.className = 'fissure-tier-heading';
      head.style.color = color;
      head.innerHTML = `<span class="fissure-tier-dot" style="background:${color};box-shadow:0 0 8px ${color}55"></span>${tierName} relics`;
      block.appendChild(head);
      list.forEach(f => {
        const exp = f.expiry || '';
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;border-left:3px solid ${color};`;
        const t     = formatDur(new Date(exp) - Date.now());
        const badge = f.isHard
          ? `<span style="font-size:10px;font-weight:600;letter-spacing:0.05em;padding:2px 7px;border-radius:20px;color:#4fc3f7;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.3);white-space:nowrap">Steel Path</span>`
          : `<span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;color:var(--text-hint);white-space:nowrap">Normal</span>`;
        row.innerHTML = `
          <div style="flex:1;font-size:12px;color:var(--text)">${f.missionType || 'N/A'} — ${f.node || 'N/A'}</div>
          ${badge}
          <div class="fissure-time" data-expiry="${exp.replace(/"/g,'')}" style="font-size:11px;color:var(--text-dim);white-space:nowrap">${t}</div>`;
        // Know More — lazy attach on first click so wikiContent has time to load
        row.classList.add('fissure-row-expandable');
        const knowBtn = document.createElement('button');
        knowBtn.className = 'km-toggle-btn';
        knowBtn.textContent = 'Know more ↓';
        row.appendChild(knowBtn);

        row.dataset.missionType = f.missionType || '';
        row.dataset.faction     = f.faction || f.enemy || '';
        row.dataset.tier        = f._tier || '';

        let expandWrapper = null;
        let expandOpen    = false;

        knowBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (!expandWrapper) {
            const panelHTML = buildFissurePanel(
              row.dataset.missionType,
              row.dataset.faction,
              row.dataset.tier
            );
            expandWrapper = document.createElement('div');
            expandWrapper.className = 'km-collapsible';
            const inner = document.createElement('div');
            inner.className = 'km-inner';
            const panel = document.createElement('div');
            panel.className = 'km-panel';
            panel.innerHTML = panelHTML;
            inner.appendChild(panel);
            expandWrapper.appendChild(inner);
            row.after(expandWrapper);
          }
          expandOpen = !expandOpen;
          expandWrapper.classList.toggle('km-open', expandOpen);
          knowBtn.textContent = expandOpen ? 'Less ↑' : 'Know more ↓';
        });
        block.appendChild(row);
      });
      stormStack.appendChild(block);
    });
    stormSection.appendChild(stormStack);
  }
  wrap.appendChild(stormSection);
}

export function tickFissureTimers() {
  document.querySelectorAll('.fissure-time').forEach(el => {
    const exp = el.getAttribute('data-expiry');
    if (exp) el.textContent = formatDur(new Date(exp) - Date.now());
  });
}
```

### ./js/ui/index.js
```
// js/ui/index.js — Barrel re-export for all ui/* modules.
// main.js imports everything from here so it only needs one import line.

export { formatDur, setBadge, resetAll, initSectionToggles, checkSVG } from './layout.js';

export { CARD_REWARDS, buildRewardPanelHTML } from './rewards.js';

export { renderCards, togglePulseRewardPanel } from './cards.js';

export { renderPulses, toggleTieredRun, toggleNetRun, countPulsesUsed } from './pulses.js';

export { renderNightwave } from './nightwave.js';

export { renderBaro } from './baro.js';

export { applyArbitrationCard, tickArbitrationTimers } from './arbitration.js';

export { renderVoidFissures, tickFissureTimers } from './fissures.js';

export { renderSteelPath, tickSteelPathTimer } from './steelpath.js';

export { renderInvasions } from './invasions.js';

export { renderAlerts } from './alerts.js';

export { renderWorldCycles, applyCycle, tickCycleTimers, CYCLE_DUR_MS, CYCLE_HINTS, CYCLE_META } from './cycles.js';

export { updateCountdown } from './countdown.js';

export { buildFissurePanel, buildNightwavePanel, buildCyclePanel, attachExpand } from './knowMore.js';

// Other modules import wiki lookups directly:
// import { getMissionType, getFaction } from '../wikiContent.js';
```

### ./js/ui/invasions.js
```
// js/ui/invasions.js — renderInvasions().

import { formatDur } from './layout.js';

// ── Module-level state ────────────────────────────────────────────────────────
let invasionTimerOn = false;

// ── Export ────────────────────────────────────────────────────────────────────
export function renderInvasions(data) {
  const container = document.getElementById('inv-container');
  const badge     = document.getElementById('inv-live-badge');
  if (!container) return;
  const active = (data || []).filter(inv => !inv.completed);
  if (!active.length) {
    container.innerHTML = '<div class="inv-empty">No active invasions right now — check back later.</div>';
    if (badge) badge.textContent = '';
    return;
  }
  if (badge) badge.textContent = 'LIVE';
  active.sort((a, b) => new Date(a.expiry || 0) - new Date(b.expiry || 0));

  const list = document.createElement('div');
  list.className = 'inv-list';
  const REWARD_NAMES = {
    catalyst:'Orokin Catalyst', reactor:'Orokin Reactor', fieldron:'Fieldron',
    forma:'Forma', exilus:'Exilus Adapter', mutalist:'Nav Coordinate',
  };
  function titleCase(s) {
    return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  function resolveRewardName(key, inv) {
    const k     = String(key).toLowerCase();
    const items = inv.attacker?.reward?.countedItems ?? [];
    const found = items.find(ci => ci && String(ci.type || '').toLowerCase().includes(k));
    return (found?.type) || REWARD_NAMES[k] || titleCase(key);
  }

  active.forEach(inv => {
    const rawTypes   = Array.isArray(inv.rewardTypes) ? inv.rewardTypes.filter(Boolean) : [];
    const uniqueKeys = [...new Set(rawTypes.map(r => String(r).toLowerCase()))];
    const rewards    = uniqueKeys.map(k => resolveRewardName(k, inv));
    const expiry     = inv.expiry || '';
    const timeLeft   = expiry ? formatDur(new Date(expiry) - Date.now()) : (inv.eta || '—');
    const node       = inv.node || '';
    const desc       = inv.desc || '';
    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `
      ${node ? `<div class="inv-node">${node}</div>` : ''}
      ${desc ? `<div class="inv-missions" style="margin-top:-2px">${desc}</div>` : ''}
      ${rewards.length ? `
      <div style="margin-top:4px">
        <div class="inv-rewards-label">Possible rewards</div>
        <div class="inv-reward-pills">${rewards.map(r => `<span class="inv-reward-pill">${r}</span>`).join('')}</div>
      </div>` : ''}
      <div class="inv-footer">
        <div class="inv-missions">3 missions to complete</div>
        <div class="inv-timer"${expiry ? ` data-inv-expiry="${expiry}"` : ''}>${timeLeft}</div>
      </div>`;
    list.appendChild(row);
  });

  if (typeof window !== 'undefined' && !invasionTimerOn) {
    invasionTimerOn = true;
    setInterval(() => {
      document.querySelectorAll('[data-inv-expiry]').forEach(el => {
        const exp = el.getAttribute('data-inv-expiry');
        if (exp) el.textContent = formatDur(new Date(exp) - Date.now());
      });
    }, 1000);
  }
  container.innerHTML = '';
  container.appendChild(list);
}
```

### ./js/ui/knowMore.js
```
// js/ui/knowMore.js — Shared expand panel builder for the Know More system.
// Imported by fissures.js, nightwave.js, cycles.js.
// All functions are pure — they take data and return DOM elements or HTML strings.

import { getMissionType, getFissureTier, getFaction, getCycleState, getNightwaveActType } from '../wikiContent.js';

// ── Speed rating dots (1–5) ───────────────────────────────────────────────────
function speedDotsHTML(rating, label) {
  if (!rating) return '';
  const dots = Array.from({ length: 5 }, (_, i) =>
    `<span class="km-speed-dot${i < rating ? ' active' : ''}"></span>`
  ).join('');
  return `<div class="km-speed"><span class="km-speed-label">${label || ''}</span>${dots}</div>`;
}

// ── Frame pills ───────────────────────────────────────────────────────────────
function framePillsHTML(frames, isLive = false) {
  if (!frames || !frames.length) return '';
  return frames.map(f =>
    `<span class="km-frame-pill${isLive ? ' km-live' : ''}">${f}</span>`
  ).join('');
}

// ── Weakness pills ────────────────────────────────────────────────────────────
function weaknessPillsHTML(weaknesses) {
  if (!weaknesses || !weaknesses.length) return '';
  return weaknesses.map(w => `<span class="km-weakness-pill">${w}</span>`).join('');
}

// ── Activity pills ────────────────────────────────────────────────────────────
function activityPillsHTML(activities) {
  if (!activities || !activities.length) return '';
  return activities.map(a => `<span class="km-activity-pill">${a}</span>`).join('');
}

// ── Tips list ─────────────────────────────────────────────────────────────────
function tipsHTML(tips) {
  if (!tips || !tips.length) return '';
  return `<ul class="km-tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function section(label, content) {
  if (!content) return '';
  return `<div class="km-section"><div class="km-section-label">${label}</div>${content}</div>`;
}

// ── Build expand panel HTML for a fissure row ─────────────────────────────────
// missionType: string from API e.g. 'Capture'
// faction: string from API e.g. 'Grineer'
// tierName: string e.g. 'Lith'
// isLiveFrame: optional string[] from arbitration buff override
export function buildFissurePanel(missionType, faction, tierName, liveFrames = null) {
  const mt  = getMissionType(missionType);
  const fac = getFaction(faction);
  const ft  = getFissureTier(tierName);

  let html = '';

  // Summary
  if (mt?.summary) {
    html += `<div class="km-panel-summary">${mt.summary}</div>`;
  }

  // Speed rating
  if (mt?.speedRating) {
    html += section('Speed', speedDotsHTML(mt.speedRating, mt.speed));
  }

  // Recommended frames
  const rf = mt?.recommendedFrames;
  if (rf) {
    const frames = (liveFrames && liveFrames.length) ? liveFrames : (rf.general || []);
    const isLive = !!(liveFrames && liveFrames.length);
    const liveTag = isLive ? '<span class="km-live-badge">LIVE</span>' : '';
    html += section(
      `Recommended Frames${liveTag}`,
      `<div class="km-frames">${framePillsHTML(frames, isLive)}</div>`
      + (rf.reason ? `<div style="font-size:11px;color:var(--text-hint);margin-top:5px">${rf.reason}</div>` : '')
    );
  }

  // Faction
  if (fac) {
    html += section('Enemy Faction — ' + faction,
      `<div style="font-size:11.5px;color:var(--text-dim);margin-bottom:6px">${fac.summary}</div>`
      + (fac.weaknesses?.length ? `<div class="km-weaknesses">${weaknessPillsHTML(fac.weaknesses)}</div>` : '')
    );
  }

  // Fissure tier
  if (ft) {
    html += section('Relic Tier — ' + tierName,
      `<div style="font-size:11.5px;color:var(--text-dim);margin-bottom:6px">${ft.summary}</div>`
    );
  }

  // Tips
  if (mt?.tips?.length) {
    html += section('Tips', tipsHTML(mt.tips.slice(0, 3)));
  }

  return html || '<div style="color:var(--text-hint);font-size:11px">No additional info available.</div>';
}

// ── Build expand panel HTML for a nightwave act ───────────────────────────────
// actType: 'daily' | 'weekly' | 'weekly elite'
// actTitle: string — used to derive contextual tip if possible
export function buildNightwavePanel(actType, actTitle) {
  const at = getNightwaveActType(actType);

  let html = '';

  if (at?.summary) {
    html += `<div class="km-panel-summary">${at.summary}</div>`;
  }

  if (at?.standingRange) {
    html += section('Standing', `<div style="font-size:12px;color:var(--text)">${at.standingRange} standing</div>`);
  }

  if (at?.tips?.length) {
    html += section('Tips', tipsHTML(at.tips));
  }

  return html || '<div style="color:var(--text-hint);font-size:11px">No additional info available.</div>';
}

// ── Build expand panel HTML for a world cycle card ────────────────────────────
// location: 'cetus' | 'vallis' | 'cambion'
// currentState: 'day' | 'night' | 'warm' | 'cold' | 'fass' | 'vome'
export function buildCyclePanel(location, currentState) {
  const cs = getCycleState(location, currentState);
  if (!cs) return '<div style="color:var(--text-hint);font-size:11px">No additional info available.</div>';

  let html = '';

  if (cs.summary) {
    html += `<div class="km-panel-summary">${cs.summary}</div>`;
  }

  if (cs.activities?.length) {
    html += section('Active Now', `<div class="km-activities">${activityPillsHTML(cs.activities)}</div>`);
  }

  if (cs.notAvailable?.length) {
    html += section('Not Available', `<div style="font-size:11px;color:var(--text-hint)">${cs.notAvailable.join(' · ')}</div>`);
  }

  if (cs.recommendedFrames?.general?.length) {
    const rf = cs.recommendedFrames;
    html += section('Recommended Frames',
      `<div class="km-frames">${framePillsHTML(rf.general)}</div>`
      + (rf.reason ? `<div style="font-size:11px;color:var(--text-hint);margin-top:5px">${rf.reason}</div>` : '')
    );
  }

  if (cs.tips?.length) {
    html += section('Tips', tipsHTML(cs.tips.slice(0, 3)));
  }

  return html;
}

// ── Attach expand behaviour to any element ────────────────────────────────────
// Wraps the panel HTML in the km-collapsible structure and attaches click toggle.
// el: the element that gets clicked (the row or card header)
// panelHTML: string — the inner content
// containerEl: optional — if provided, panel appends here instead of after el
// Returns the collapsible wrapper div.
export function attachExpand(el, panelHTML, containerEl) {
  const wrapper = document.createElement('div');
  wrapper.className = 'km-collapsible';

  const inner = document.createElement('div');
  inner.className = 'km-inner';

  const panel = document.createElement('div');
  panel.className = 'km-panel';
  panel.innerHTML = panelHTML;
  panel.addEventListener('click', e => e.stopPropagation());

  inner.appendChild(panel);
  wrapper.appendChild(inner);

  const target = containerEl || el;
  target.after(wrapper);

  let open = false;
  el.addEventListener('click', e => {
    // Don't toggle if user clicked a link or button inside the row
    if (e.target.closest('a, button')) return;
    open = !open;
    wrapper.classList.toggle('km-open', open);
    // Update toggle button text if one exists inside el
    const btn = el.querySelector('.km-toggle-btn');
    if (btn) btn.textContent = open ? 'Less ↑' : 'Know more ↓';
  });

  return wrapper;
}
```

### ./js/ui/layout.js
```
// js/ui/layout.js — Badge, formatDur, resetAll, initSectionToggles.

import { state, week, today, persist, RUNS_DEFAULT } from '../state.js';

export function formatDur(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'soon';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

export function setBadge(s) {
  const el  = document.getElementById('data-badge');
  const map = {
    live:    ['Live data',                  'live'],
    partial: ['Partial live',               'offline'],
    offline: ['Offline — cached data shown','offline'],
  };
  const [txt, cls] = map[s] || ['Loading...', 'loading'];
  el.textContent = txt;
  el.className   = 'data-badge ' + cls;
}

export function resetAll() {
  if (!confirm('Reset all weekly tasks and pulse tracking? This cannot be undone.')) return;
  week.tasks   = {};
  week.nw      = {};
  week.runs    = { ...RUNS_DEFAULT };
  today.tasks  = {};
  state.arb    = { doneForKey: null };
  persist();
  location.reload();
}

export function checkSVG() {
  return '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function initSectionToggles() {
  document.querySelectorAll('.section-title[id]').forEach(title => {
    const content = title.nextElementSibling;
    if (!content) return;
    const chevron = document.createElement('span');
    chevron.className   = 'sec-chevron';
    chevron.textContent = '▾';
    title.appendChild(chevron);
    const secId = title.id;
    if (state.ui.collapsed[secId]) {
      content.style.display = 'none';
      title.classList.add('sec-collapsed');
    }
    title.addEventListener('click', e => {
      if (e.target.closest('button, a')) return;
      if (state.ui.collapsed[secId]) {
        delete state.ui.collapsed[secId];
        content.style.display = '';
        title.classList.remove('sec-collapsed');
      } else {
        state.ui.collapsed[secId] = true;
        content.style.display = 'none';
        title.classList.add('sec-collapsed');
      }
      persist();
    });
  });
}
```

### ./js/ui/nightwave.js
```
// js/ui/nightwave.js — renderNightwave().

import { week, persist } from '../state.js';
import { buildNightwavePanel } from './knowMore.js';

export function renderNightwave(acts, season) {
  const c = document.getElementById('nw-acts');
  c.innerHTML = '';
  let earned  = 0;
  const maxPts = acts.reduce((s, a) => s + (a.standing || a.pts || 0), 0);
  if (season) document.getElementById('nw-season').textContent = season;
  acts.forEach(act => {
    const id   = act.id || ('nw-' + (act.title || act.name || '').replace(/\s+/g, '-').toLowerCase());
    const pts  = act.standing || act.pts || 0;
    const done = !!week.nw[id];
    if (done) earned += pts;
    const div = document.createElement('div');
    div.className = 'nw-act' + (done ? ' done' : '');
    const typeLabel = act.type ? `<span class="nw-act-type">${act.type.replace(/_/g, ' ')}</span>` : '';
    div.innerHTML = `<div class="nw-act-check"></div><div class="nw-act-name">${act.title || act.name || 'Act'}</div>${typeLabel}<div class="nw-act-pts">+${pts.toLocaleString()}</div>`;
    div.addEventListener('click', e => {
      if (e.target.closest('button, a')) return;
      week.nw[id] = !week.nw[id];
      renderNightwave(acts, season);
      persist();
    });
    const knowBtn = document.createElement('button');
    knowBtn.className = 'km-toggle-btn';
    knowBtn.textContent = 'Know more ↓';
    div.appendChild(knowBtn);

    let nwExpandWrapper = null;
    let nwExpandOpen    = false;

    knowBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!nwExpandWrapper) {
        const panelHTML = buildNightwavePanel(act.type, act.title || act.name || '');
        nwExpandWrapper = document.createElement('div');
        nwExpandWrapper.className = 'km-collapsible';
        const inner = document.createElement('div');
        inner.className = 'km-inner';
        const panel = document.createElement('div');
        panel.className = 'km-panel';
        panel.innerHTML = panelHTML;
        inner.appendChild(panel);
        nwExpandWrapper.appendChild(inner);
        div.after(nwExpandWrapper);
      }
      nwExpandOpen = !nwExpandOpen;
      nwExpandWrapper.classList.toggle('km-open', nwExpandOpen);
      knowBtn.textContent = nwExpandOpen ? 'Less ↑' : 'Know more ↓';
    });
    c.appendChild(div);
  });
  document.getElementById('nw-standing').textContent = earned.toLocaleString() + ' standing earned this session';
  document.getElementById('nw-bar').style.width = maxPts > 0 ? (earned / maxPts * 100) + '%' : '0%';
}
```

### ./js/ui/pulses.js
```
// js/ui/pulses.js — renderPulses(), toggleTieredRun(), toggleNetRun(), countPulsesUsed().

import { week, persist } from '../state.js';

export function countPulsesUsed() {
  return Object.values(week.runs).filter(Boolean).length;
}

// Called from HTML inline onclick
export function toggleTieredRun(mode, tier) {
  const nk = mode === 'eda' ? 'edaNormal' : 'taNormal';
  const ek = mode === 'eda' ? 'edaElite'  : 'taElite';
  const r  = week.runs;

  if (tier === 'elite') {
    if (r[ek]) {
      r[ek] = false;
    } else {
      const extraCost = r[nk] ? 1 : 2;
      if (countPulsesUsed() + extraCost > 5) return;
      r[nk] = true;
      r[ek] = true;
    }
  } else {
    if (r[nk]) {
      r[ek] = false;
      r[nk] = false;
    } else {
      if (countPulsesUsed() >= 5) return;
      r[nk] = true;
    }
  }
  persist();
  renderPulses();
}

// Called from HTML inline onclick
export function toggleNetRun(idx) {
  const key = 'net' + (idx + 1);
  if (week.runs[key]) {
    week.runs[key] = false;
  } else {
    if (countPulsesUsed() >= 5) return;
    week.runs[key] = true;
  }
  persist();
  renderPulses();
}

export function renderPulses() {
  const used    = countPulsesUsed();
  const labelEl = document.getElementById('pulses-used-label');
  const fillEl  = document.getElementById('pulse-progress-fill');
  if (labelEl) labelEl.textContent = used + ' / 5 pulses used this week';
  if (fillEl)  fillEl.style.width  = (used / 5 * 100) + '%';

  [['eda','edaNormal','edaElite'],['tmp','taNormal','taElite']].forEach(([mode, nk, ek]) => {
    const nEl = document.querySelector(`.pulse-run[data-mode="${mode}"][data-tier="normal"]`);
    const eEl = document.querySelector(`.pulse-run[data-mode="${mode}"][data-tier="elite"]`);
    if (nEl) nEl.classList.toggle('pulse-run-on', !!week.runs[nk]);
    if (eEl) eEl.classList.toggle('pulse-run-on', !!week.runs[ek]);
  });

  document.querySelectorAll('.pulse-run[data-mode="net"]').forEach(el => {
    const idx = +el.getAttribute('data-idx');
    el.classList.toggle('pulse-run-on', !!week.runs['net' + (idx + 1)]);
  });
}
```

### ./js/ui/rewards.js
```
// js/ui/rewards.js — CARD_REWARDS constant and buildRewardPanelHTML().
// Extracted from cards.js so both cards.js and arbitration.js can import
// from here without creating a cross-ui/* dependency between each other.

import { getDropsFor } from '../state.js';

export const CARD_REWARDS = {
  archon: {
    items: ['Archon Shard', 'Archon Mod (week-specific)', 'Forma', 'Kuva'],
    note: "Shard colour and mod set change each week — check the in-game mission screen for this week's specifics.",
  },
  circuit: {
    items: ['Incarnon Genesis Adapter', 'Pathos Clamps', 'Duviri Resources', 'Drifter Intrinsics'],
    note: "Incarnon selection rotates weekly — check the Duviri spiral for this week's available weapons.",
  },
  syndicate: {
    items: ['Syndicate Standing', 'Augment Mods', 'Syndicate Weapons', 'Syndicate Sigils'],
    note: 'Rewards depend on your chosen syndicates.',
  },
  sortie: {
    items: ['Riven Mod', 'Ayatan Sculpture', 'Exilus Adapter', 'Forma Bundle', 'Weapon Cosmetic', '60,000 Credits'],
    liveQuery: 'Sortie', liveLimit: 8,
  },
  arbitration: {
    items: ['Vitus Essence', 'Arbitration Mods', 'Ayatan Sculptures', 'Endo'],
    note: 'Spend Vitus Essence at the Arbitrations vendor in any Relay to buy exclusive mods.',
  },
  synddaily: {
    items: ['Syndicate Standing', 'Syndicate Medallions'],
    note: 'Standing counts toward your weekly syndicate cap.',
  },
};

export function buildRewardPanelHTML(cardId) {
  const def = CARD_REWARDS[cardId];
  if (!def) return '';
  let liveUsed = false;
  let rows = '';
  if (def.liveQuery) {
    const live   = getDropsFor(def.liveQuery);
    const capped = live && live.length ? live.slice(0, def.liveLimit || 8) : null;
    if (capped && capped.length) {
      liveUsed = true;
      for (const r of capped) {
        const cls = r.rarity ? 'rarity-' + r.rarity.toLowerCase() : '';
        const pct = r.chance != null ? r.chance.toFixed(2) + '%' : '';
        rows += `<div class="reward-row">
          <span class="reward-name">${r.item}</span>
          ${cls ? `<span class="reward-rarity ${cls}">${r.rarity}</span>` : ''}
          ${pct ? `<span class="reward-chance">${pct}</span>`            : ''}
        </div>`;
      }
    }
  }
  if (liveUsed) {
    return `<div class="rewards-header"><span class="rh-item">Item</span><span>Rarity</span><span>Chance</span></div>`
      + rows
      + (def.note ? `<div class="reward-note">${def.note}</div>` : '');
  }
  const chips = def.items
    .map(item => `<div class="reward-chip"><span class="reward-chip-name">${item}</span></div>`)
    .join('');
  return `<div class="rewards-header"><span class="rh-item">Item</span></div><div class="reward-chips">${chips}</div>`
    + (def.note ? `<div class="reward-note">${def.note}</div>` : '');
}
```

### ./js/ui/steelpath.js
```
// js/ui/steelpath.js — renderSteelPath(), tickSteelPathTimer().

import { week, persist } from '../state.js';
import { formatDur } from './layout.js';

export function renderSteelPath(sp, offline) {
  const box = document.getElementById('sp-box');
  if (!box) return;
  if (offline || !sp || !sp.currentReward) {
    box.innerHTML = "<div class=\"sp-offline\">Steel Path Honors data unavailable — check back soon. Visit Teshin in any Relay to see this week's rotating item.</div>";
    return;
  }
  const reward     = sp.currentReward;
  const rewardName = reward.name  || 'Unknown reward';
  const rewardCost = reward.cost  != null ? reward.cost : '?';
  const expiry     = sp.expiry ? new Date(sp.expiry) : null;
  const rotation   = Array.isArray(sp.rotation)  ? sp.rotation  : [];
  const claimKey   = 'sp-' + rewardName.replace(/\s+/g, '-').toLowerCase();
  const isClaimed  = !!week.tasks[claimKey];
  const rotHtml    = rotation.length
    ? rotation.map(r => `<span class="sp-rotation-item${r.name === rewardName ? ' current' : ''}" title="${r.cost} Steel Essence">${r.name}</span>`).join('')
    : '<span style="font-size:11px;color:var(--text-hint)">Rotation data unavailable</span>';
  const timerStr  = expiry ? formatDur(expiry - Date.now()) : '—';
  const expiryIso = expiry ? expiry.toISOString() : '';

  box.innerHTML = `
    <div class="sp-main">
      <div class="sp-reward-block">
        <div class="sp-reward-label">This week's rotating item</div>
        <div class="sp-reward-name">${rewardName}</div>
        <div class="sp-reward-cost">Costs <strong>${rewardCost} Steel Essence</strong> — visit Teshin in any Relay</div>
        <button class="sp-claimed-btn${isClaimed ? ' claimed' : ''}" id="sp-claimed-btn">
          ${isClaimed ? '✓ Claimed this week' : 'Mark as claimed'}
        </button>
      </div>
      <div class="sp-timer-block">
        <div class="sp-timer-label">Resets in</div>
        <div class="sp-timer-val" id="sp-timer-val" ${expiryIso ? `data-sp-expiry="${expiryIso}"` : ''}>${timerStr}</div>
      </div>
    </div>
    ${rotation.length ? `
    <div class="sp-rotation">
      <div class="sp-rotation-label">8-week rotation — your place in the cycle</div>
      <div class="sp-rotation-list">${rotHtml}</div>
    </div>` : ''}`;

  document.getElementById('sp-claimed-btn').onclick = () => {
    week.tasks[claimKey] = !week.tasks[claimKey];
    persist();
    renderSteelPath(sp, false);
  };
}

export function tickSteelPathTimer() {
  const el = document.getElementById('sp-timer-val');
  if (!el) return;
  const iso = el.getAttribute('data-sp-expiry');
  if (iso) el.textContent = formatDur(new Date(iso) - Date.now());
}
```

### ./js/wikiContent.js
```
// js/wikiContent.js — Static knowledge base loader.
// Loads wikiContent.json once at startup, caches it, exposes safe lookup functions.
// All functions return null (never throw) if the requested key doesn't exist.

let _cache = null;
let _loadPromise = null;

export async function loadWikiContent() {
  if (_cache) return _cache;
  if (_loadPromise) return _loadPromise;
  _loadPromise = fetch('./wikiContent.json')
    .then(r => { if (!r.ok) throw new Error('wikiContent fetch failed: ' + r.status); return r.json(); })
    .then(data => { _cache = data; _loadPromise = null; return data; })
    .catch(err => { console.error('[Tennoplan] wikiContent load failed:', err.message); _loadPromise = null; return null; });
  return _loadPromise;
}

// Returns the full wikiContent object, or null if not loaded yet.
export function getWikiContent() {
  return _cache;
}

// Get info for a mission type. key = 'Capture', 'Exterminate', etc.
export function getMissionType(key) {
  if (!_cache || !key) return null;
  return _cache.missionTypes?.[key] ?? null;
}

// Get info for a fissure tier. key = 'Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Omnia'
export function getFissureTier(key) {
  if (!_cache || !key) return null;
  return _cache.fissureTiers?.[key] ?? null;
}

// Get info for an enemy faction. key = 'Grineer', 'Corpus', 'Infested', etc.
export function getFaction(key) {
  if (!_cache || !key) return null;
  return _cache.factions?.[key] ?? null;
}

// Get info for a top-level game mode. key = 'voidFissures', 'arbitration', 'nightwave', etc.
export function getGameMode(key) {
  if (!_cache || !key) return null;
  return _cache.gameModes?.[key] ?? null;
}

// Get world cycle state info. location = 'cetus'|'vallis'|'cambion', state = 'day'|'night'|'warm'|'cold'|'fass'|'vome'
export function getCycleState(location, state) {
  if (!_cache || !location || !state) return null;
  return _cache.worldCycles?.[location]?.[state.toLowerCase()] ?? null;
}

// Get Nightwave act type info. key = 'daily'|'weekly'|'weekly elite'
export function getNightwaveActType(key) {
  if (!_cache || !key) return null;
  return _cache.nightwaveActTypes?.[key] ?? null;
}

// Get resource info. key = 'VoidTraces', 'VitusEssence', 'SteelEssence', 'Ducats', etc.
export function getResource(key) {
  if (!_cache || !key) return null;
  return _cache.resources?.[key] ?? null;
}

// Get the recommended frame list for a mission type, with live override support.
// Returns { frames: string[], reason: string, isLive: boolean } or null.
// liveOverrideFrames: optional string[] injected at runtime from arbitration buff data.
export function getRecommendedFrames(missionTypeKey, liveOverrideFrames = null) {
  if (!_cache || !missionTypeKey) return null;
  const mt = _cache.missionTypes?.[missionTypeKey];
  if (!mt?.recommendedFrames) return null;
  const rf = mt.recommendedFrames;
  if (liveOverrideFrames && liveOverrideFrames.length) {
    return { frames: liveOverrideFrames, reason: rf.reason, isLive: true };
  }
  return { frames: rf.general ?? [], reason: rf.reason ?? '', isLive: false };
}
```

### ./mockData.js
```
// mockData.js — Static fallback data used when WarframeStat.us is unreachable.
// Loaded before app.js via <script src="mockData.js">.
// Exposes window.WF_MOCK; apiFetch() returns the relevant entry on final retry failure.
// Time-sensitive fields (expiry, activation) are set to 1 h from page load — good enough
// for UI rendering without crashing timers.
(function () {
  var _1h = new Date(Date.now() + 3_600_000).toISOString();
  var _7d = new Date(Date.now() + 604_800_000).toISOString();

  window.WF_MOCK = {

    // ── Nightwave ──────────────────────────────────────────────────────────────
    nightwave: {
      season: 'Offline — cached acts shown',
      activeChallenges: [
        { id: 'nw-d1', title: 'Complete a Sortie',            reputation: 1000, isDaily: true,  isElite: false },
        { id: 'nw-d2', title: 'Kill 150 Enemies',             reputation: 1000, isDaily: true,  isElite: false },
        { id: 'nw-d3', title: 'Complete 3 Void Fissures',     reputation: 1000, isDaily: true,  isElite: false },
        { id: 'nw-w1', title: 'Complete 5 Syndicate Missions', reputation: 1500, isDaily: false, isElite: false },
        { id: 'nw-w2', title: 'Complete a Nightmare Mission',  reputation: 1500, isDaily: false, isElite: false },
        { id: 'nw-e1', title: 'Complete an Archon Hunt',       reputation: 4500, isDaily: false, isElite: true  },
      ]
    },

    // ── Void Trader ────────────────────────────────────────────────────────────
    voidTrader: {
      active: false,
      location: 'N/A — API offline',
      activation: _7d,
      expiry: _7d
    },

    // ── Void Fissures ──────────────────────────────────────────────────────────
    // Empty array — renderVoidFissures() handles [] by showing a filter bar with
    // "No fissures match the current filter." rather than crashing.
    fissures: [],

    // ── Arbitration ────────────────────────────────────────────────────────────
    arbitration: {
      node: 'N/A — API offline',
      type: 'Arbitration',
      enemy: 'N/A',
      expiry: _1h,
      id: 'mock-arb'
    },

    // ── Archon Hunt ────────────────────────────────────────────────────────────
    archonHunt: {
      missions: [
        { type: 'N/A', node: 'API offline — check in-game' },
        { type: 'N/A', node: 'API offline — check in-game' },
        { type: 'N/A', node: 'API offline — check in-game' }
      ]
    },

    // ── Sortie ─────────────────────────────────────────────────────────────────
    sortie: {
      variants: [
        { missionType: 'N/A', modifier: 'API offline — check in-game' },
        { missionType: 'N/A', modifier: 'API offline — check in-game' },
        { missionType: 'N/A', modifier: 'API offline — check in-game' }
      ]
    },

    // ── Steel Path Honors ──────────────────────────────────────────────────────
    // null → renderSteelPath(null, true) shows the offline message gracefully.
    steelPath: null,

    // ── Invasions ──────────────────────────────────────────────────────────────
    // Empty array — renderInvasions([]) shows "No active invasions right now."
    invasions: [],

    // ── World-state cycles ─────────────────────────────────────────────────────
    // Expiry is 1 h from load; timers will tick down correctly until data refreshes.
    cetusCycle:   { isDay:  true,  expiry: _1h },
    vallisCycle:  { isWarm: false, expiry: _1h },
    cambionCycle: { state: 'vome', expiry: _1h },

    // ── Alerts ─────────────────────────────────────────────────────────────────
    // Empty array — renderAlerts([]) hides the section entirely.
    alerts: []

  };
}());
```
