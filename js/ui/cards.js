// js/ui/cards.js — makeCard(), renderCards(), checkSVG(), CARD_REWARDS,
//                  buildRewardPanelHTML(), togglePulseRewardPanel().

import { week, today, persist, getDropsFor } from '../state.js';

// ── Module-level state ─────────────────────────────────────────────────────────
export const openRewardPanels = new Set(); // card/pulse ids with open reward panels

// ── Constants ─────────────────────────────────────────────────────────────────
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

export function checkSVG() {
  return '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ── Reward panels ─────────────────────────────────────────────────────────────
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
