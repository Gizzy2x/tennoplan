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
