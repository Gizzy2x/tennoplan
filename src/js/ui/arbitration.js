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
