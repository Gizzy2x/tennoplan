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
