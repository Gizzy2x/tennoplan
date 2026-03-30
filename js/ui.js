// js/ui.js — All render*, apply*, tick*, toggle* and related UI helpers.
// Imports state but never imports from api.js — keeps the render layer pure.

import { state, week, today, persist, RUNS_DEFAULT, getDropsFor } from './state.js';

// ── Module-level UI state ─────────────────────────────────────────────────────
const openRewardPanels   = new Set(); // card/pulse ids with open reward panels
let   lastArbitrationPayload = null;
let   lastFissureData        = null;
let   fissureFilter          = 'all'; // 'all' | 'normal' | 'steelpath'
let   invasionTimerOn        = false;
let   wfArbTickOn            = false;
let   alertsTickOn           = false;

// ── Constants ─────────────────────────────────────────────────────────────────
const CARD_REWARDS = {
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

const CYCLE_DUR_MS = {
  day: 6000000, night: 3000000,
  warm:  400000, cold:   800000,
  fass: 6000000, vome:  6000000,
};

const CYCLE_HINTS = {
  day:   'Mining & bounties',
  night: 'Eidolons & fishing',
  warm:  'Toroid farming',
  cold:  'Fishing & conservation',
  fass:  'Rare Vome drops',
  vome:  'Fishing & bounties',
};

const NOTABLE_TYPES = ['nitain', 'helm', 'skin', 'vandal', 'wraith', 'weapon'];

// ── Utility ───────────────────────────────────────────────────────────────────
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

function checkSVG() {
  return '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ── Reward panels ─────────────────────────────────────────────────────────────
function buildRewardPanelHTML(cardId) {
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

// ── Pulses ────────────────────────────────────────────────────────────────────
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

// ── Nightwave ─────────────────────────────────────────────────────────────────
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
    div.onclick = () => { week.nw[id] = !week.nw[id]; renderNightwave(acts, season); persist(); };
    c.appendChild(div);
  });
  document.getElementById('nw-standing').textContent = earned.toLocaleString() + ' standing earned this session';
  document.getElementById('nw-bar').style.width = maxPts > 0 ? (earned / maxPts * 100) + '%' : '0%';
}

// ── Baro Ki'Teer ──────────────────────────────────────────────────────────────
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

// ── Arbitration ───────────────────────────────────────────────────────────────
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
      if (openRewardPanels.has('arbitration')) {
        openRewardPanels.delete('arbitration');
        div.querySelector('.card-rewards-panel')?.remove();
        arbToggle.textContent = 'Rewards ↓';
      } else {
        openRewardPanels.add('arbitration');
        const panel = document.createElement('div');
        panel.className = 'card-rewards-panel';
        panel.innerHTML = buildRewardPanelHTML('arbitration');
        panel.addEventListener('click', e => e.stopPropagation());
        div.appendChild(panel);
        arbToggle.textContent = 'Rewards ↑';
      }
    });
    if (openRewardPanels.has('arbitration')) {
      const panel = document.createElement('div');
      panel.className = 'card-rewards-panel';
      panel.innerHTML = buildRewardPanelHTML('arbitration');
      panel.addEventListener('click', e => e.stopPropagation());
      div.appendChild(panel);
      arbToggle.textContent = 'Rewards ↑';
    }
  }

  if (!wfArbTickOn) {
    wfArbTickOn = true;
    setInterval(tickArbitrationTimers, 1000);
  }
  tickArbitrationTimers();
}

// ── Void Fissures ─────────────────────────────────────────────────────────────
function normalizeFissureTier(raw) {
  if (raw == null || raw === '') return 'Unknown';
  const s     = String(raw).trim();
  const lower = s.toLowerCase();
  const map   = { lith:'Lith', meso:'Meso', neo:'Neo', axi:'Axi', requiem:'Requiem', omnia:'Omnia' };
  return map[lower] || (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
}

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

  const daily = document.getElementById('daily-cards');
  if (!daily) return;
  let wrap = document.getElementById('wf-fissures-live');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'wf-fissures-live';
    daily.parentNode.insertBefore(wrap, daily);
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

// ── Steel Path Honors ─────────────────────────────────────────────────────────
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

// ── Invasions ─────────────────────────────────────────────────────────────────
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

  if (!invasionTimerOn) {
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

// ── World State Cycles ────────────────────────────────────────────────────────
// cycle: { current, next, timeLeft, percent, expiry, activation }
// Produced by normalizeCetusCycle / normalizeVallisCycle / normalizeCambionCycle in api.js.
export function applyCycle(id, cycle) {
  const pill  = document.getElementById(id + '-pill');
  const bar   = document.getElementById(id + '-bar');
  const timer = document.getElementById(id + '-timer');
  const hint  = document.getElementById(id + '-hint');
  if (!pill || !bar || !timer) return;
  const stateKey = cycle.current.toLowerCase();
  timer.setAttribute('data-cycle-expiry', cycle.expiry);
  timer.setAttribute('data-cycle-state',  stateKey);
  if (cycle.activation) timer.setAttribute('data-cycle-activation', cycle.activation);
  pill.className    = 'cycle-state-pill ' + stateKey;
  pill.textContent  = cycle.current;
  bar.className     = 'cycle-bar-fill ' + stateKey;
  bar.style.width   = cycle.percent.toFixed(1) + '%';
  timer.textContent = formatDur(cycle.timeLeft);
  if (hint) hint.textContent = CYCLE_HINTS[stateKey] || '';
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
        // Use API-derived activation for accurate bar fill (no hardcoded durations needed)
        const actMs = new Date(activationIso).getTime();
        const total = expMs - actMs;
        pct = total > 0 ? Math.min(100, Math.max(0, ((now - actMs) / total) * 100)) : 0;
      } else {
        // Fallback: known phase durations (used when API omits activation)
        const durationMs = CYCLE_DUR_MS[stateKey] || 6000000;
        pct = durationMs > 0 ? Math.max(0, Math.min(100, (remaining / durationMs) * 100)) : 0;
      }
      bar.style.width = pct.toFixed(1) + '%';
    }
  });
}

// ── Notable Alerts ────────────────────────────────────────────────────────────
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
  if (!alertsTickOn) {
    alertsTickOn = true;
    setInterval(() => {
      document.querySelectorAll('[data-alert-expiry]').forEach(el => {
        const exp = el.getAttribute('data-alert-expiry');
        if (exp) el.textContent = formatDur(new Date(exp) - Date.now());
      });
    }, 1000);
  }
}

// ── Countdown timers ──────────────────────────────────────────────────────────
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

// ── Reset / section toggles ───────────────────────────────────────────────────
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
