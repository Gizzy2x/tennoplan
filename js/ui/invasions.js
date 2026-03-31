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
