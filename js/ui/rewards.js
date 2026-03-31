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
