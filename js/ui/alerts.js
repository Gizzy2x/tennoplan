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
