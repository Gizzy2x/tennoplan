// js/main.js — Entry point. Imports all modules, wires them together, runs init().
// Loaded as <script type="module" src="js/main.js"> in index.html.

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
} from './ui.js';

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
