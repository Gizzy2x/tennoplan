// js/ui/wikiPanel.js — Wiki lookup slide-in panel.
//
// Two views:
//   SEARCH  — search input + live results list (warframestat.us, debounced 320 ms)
//   DETAIL  — full item card: name, type, description, howToGet, howToUse,
//              stats, abilities, drop locations, wiki link
//
// Opening:
//   openWikiPanel('Item Name')   — jumps straight to DETAIL for that item
//   openWikiPanel()              — opens in SEARCH mode, empty
//
// Triggers in the rest of the app:
//   Any element with [data-wiki="Item Name"] — delegated click handler in main.js
//   The header search button  (#wiki-open-btn)

import { wikiLookup, wikiSearch } from '../wikiService.js';
import { getDropsFor }            from '../state.js';

// ── Panel state ───────────────────────────────────────────────────────────────
let _panelOpen       = false;
let _currentQuery    = '';
let _debounceTimer   = null;
let _detailHistory   = [];   // stack so "back" can return to search results

// ── DOM refs (set once in initWikiPanel) ──────────────────────────────────────
let _backdrop, _panel, _searchInput, _closeBtn, _body;

// ── Icons (inline SVG, consistent with app's checkSVG pattern) ───────────────
function _searchIcon() {
  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
    <circle cx="6" cy="6" r="4"/><line x1="9.5" y1="9.5" x2="13" y2="13"/>
  </svg>`;
}
function _backIcon() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="7,2 3,6 7,10"/><line x1="3" y1="6" x2="11" y2="6"/>
  </svg>`;
}
function _externalIcon() {
  return `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4,1 9,1 9,6"/><line x1="9" y1="1" x2="4" y2="6"/>
    <polyline points="2,3 1,3 1,9 7,9 7,7"/>
  </svg>`;
}

// ── Rarity colour map ─────────────────────────────────────────────────────────
const RARITY_COLOR = {
  common:    '#8ab4a0',
  uncommon:  '#6ea8e8',
  rare:      '#c8a84b',
  legendary: '#b87de8',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function _typeBadge(type) {
  if (!type) return '';
  return `<span class="wiki-badge">${type}</span>`;
}

function _tradableBadge(tradable) {
  if (tradable === null || tradable === undefined) return '';
  return tradable
    ? `<span class="wiki-badge wiki-badge-green">Tradable</span>`
    : `<span class="wiki-badge wiki-badge-dim">Not Tradable</span>`;
}

function _mrBadge(mr) {
  if (!mr) return '';
  return `<span class="wiki-badge wiki-badge-dim">MR ${mr}</span>`;
}

// ── Render: loading spinner ───────────────────────────────────────────────────
function _renderLoading(label = 'Looking up…') {
  _body.innerHTML = `
    <div class="wiki-loading">
      <div class="wiki-spinner"></div>
      <div class="wiki-loading-label">${label}</div>
    </div>`;
}

// ── Render: empty / error states ──────────────────────────────────────────────
function _renderEmpty(message) {
  _body.innerHTML = `<div class="wiki-empty">${message}</div>`;
}

// ── Render: search results list ───────────────────────────────────────────────
function _renderResults(results, query) {
  if (!results.length) {
    _body.innerHTML = `
      <div class="wiki-empty">
        No results for <strong>${_esc(query)}</strong>.<br>
        <a class="wiki-fandom-link" href="https://warframe.fandom.com/wiki/Special:Search?query=${encodeURIComponent(query)}" target="_blank" rel="noopener">
          Search on the Warframe Wiki ${_externalIcon()}
        </a>
      </div>`;
    return;
  }
  const rows = results.map((r, i) => `
    <div class="wiki-result-row" data-result-idx="${i}" role="button" tabindex="0">
      <div class="wiki-result-name">${_esc(r.name)}</div>
      <div class="wiki-result-type">${_esc(r.type)}</div>
    </div>`).join('');

  _body.innerHTML = `<div class="wiki-results-list">${rows}</div>`;

  _body.querySelectorAll('.wiki-result-row').forEach(row => {
    const idx = Number(row.getAttribute('data-result-idx'));
    row.addEventListener('click', () => {
      _detailHistory.push({ view: 'results', query, results });
      _showDetail(results[idx]);
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _detailHistory.push({ view: 'results', query, results });
        _showDetail(results[idx]);
      }
    });
  });
}

// ── Render: full detail card ──────────────────────────────────────────────────
function _renderDetail(item, showBack = false) {
  const backBtn = showBack
    ? `<button class="wiki-back-btn" id="wiki-back-btn">${_backIcon()} Back</button>`
    : '';

  // Header row: name + badges
  const badges = [
    _typeBadge(item.type),
    _tradableBadge(item.tradable),
    _mrBadge(item.masteryReq),
  ].filter(Boolean).join('');

  // Description
  const desc = item.description
    ? `<p class="wiki-desc">${_esc(item.description)}</p>`
    : '';

  // How to get
  const howToGet = item.howToGet
    ? `<div class="wiki-section">
         <div class="wiki-section-label">How to get</div>
         <div class="wiki-section-body">${_esc(item.howToGet)}</div>
       </div>`
    : '';

  // How to use / spend
  const howToUse = item.howToUse
    ? `<div class="wiki-section">
         <div class="wiki-section-label">How to use</div>
         <div class="wiki-section-body">${_esc(item.howToUse)}</div>
       </div>`
    : '';

  // Frame stats (health / shield / armor / energy)
  const stats = item.stats
    ? `<div class="wiki-section">
         <div class="wiki-section-label">Base stats</div>
         <div class="wiki-stats-grid">
           <div class="wiki-stat"><span class="wiki-stat-val">${item.stats.health}</span><span class="wiki-stat-key">Health</span></div>
           <div class="wiki-stat"><span class="wiki-stat-val">${item.stats.shield}</span><span class="wiki-stat-key">Shield</span></div>
           <div class="wiki-stat"><span class="wiki-stat-val">${item.stats.armor}</span><span class="wiki-stat-key">Armor</span></div>
           <div class="wiki-stat"><span class="wiki-stat-val">${item.stats.energy}</span><span class="wiki-stat-key">Energy</span></div>
         </div>
       </div>`
    : '';

  // Abilities
  const abilities = item.abilities?.length
    ? `<div class="wiki-section">
         <div class="wiki-section-label">Abilities</div>
         ${item.abilities.map(a =>
           `<div class="wiki-ability">
              <div class="wiki-ability-name">${_esc(a.name)}</div>
              ${a.description ? `<div class="wiki-ability-desc">${_esc(a.description)}</div>` : ''}
            </div>`
         ).join('')}
       </div>`
    : '';

  // Drop locations — prefer warframestat.us drops[], fall back to local drop cache
  let dropsHtml = '';
  const wsDrops = item.drops || [];
  const localDrops = getDropsFor ? (getDropsFor(item.name) || []) : [];

  if (wsDrops.length) {
    const rows = wsDrops.map(d => {
      const pct    = d.chance != null ? (d.chance * 100).toFixed(2) + '%' : '';
      const color  = RARITY_COLOR[(d.rarity || '').toLowerCase()] || 'var(--text-dim)';
      return `<div class="wiki-drop-row">
        <div class="wiki-drop-loc">${_esc(d.location || d.type || '')}</div>
        <div class="wiki-drop-meta">
          ${d.rarity ? `<span style="color:${color};font-size:10px;font-weight:600">${_esc(d.rarity)}</span>` : ''}
          ${pct ? `<span class="wiki-drop-pct">${pct}</span>` : ''}
        </div>
      </div>`;
    }).join('');
    dropsHtml = `<div class="wiki-section">
      <div class="wiki-section-label">Drop locations</div>
      <div class="wiki-drops">${rows}</div>
    </div>`;
  } else if (localDrops.length) {
    const rows = localDrops.map(d => {
      const pct   = d.chance != null ? d.chance.toFixed(2) + '%' : '';
      const color = RARITY_COLOR[(d.rarity || '').toLowerCase()] || 'var(--text-dim)';
      return `<div class="wiki-drop-row">
        <div class="wiki-drop-loc">${_esc(d.place || '')}</div>
        <div class="wiki-drop-meta">
          ${d.rarity ? `<span style="color:${color};font-size:10px;font-weight:600">${_esc(d.rarity)}</span>` : ''}
          ${pct ? `<span class="wiki-drop-pct">${pct}</span>` : ''}
        </div>
      </div>`;
    }).join('');
    dropsHtml = `<div class="wiki-section">
      <div class="wiki-section-label">Drop locations</div>
      <div class="wiki-drops">${rows}</div>
    </div>`;
  }

  // Components (crafted items)
  const components = item.components?.length
    ? `<div class="wiki-section">
         <div class="wiki-section-label">Components</div>
         <div class="wiki-chips">
           ${item.components.map(c => `<span class="wiki-chip" data-wiki="${_esc(c)}">${_esc(c)}</span>`).join('')}
         </div>
       </div>`
    : '';

  // Source note
  const sourceNote = item.source === 'fandom'
    ? `<div class="wiki-source-note">Description from the Warframe Wiki.</div>`
    : item.source === 'static'
    ? `<div class="wiki-source-note">Curated info from Tennoplan's knowledge base.</div>`
    : '';

  _body.innerHTML = `
    ${backBtn}
    <div class="wiki-detail">
      <div class="wiki-detail-name">${_esc(item.name)}</div>
      ${badges ? `<div class="wiki-badges">${badges}</div>` : ''}
      ${desc}
      ${howToGet}
      ${howToUse}
      ${stats}
      ${abilities}
      ${dropsHtml}
      ${components}
      ${sourceNote}
      <a class="wiki-ext-link" href="${_esc(item.wikiUrl)}" target="_blank" rel="noopener">
        View on Warframe Wiki ${_externalIcon()}
      </a>
    </div>`;

  // Back button
  if (showBack) {
    _body.querySelector('#wiki-back-btn')?.addEventListener('click', _goBack);
  }

  // Component chips are also clickable
  _body.querySelectorAll('.wiki-chip[data-wiki]').forEach(chip => {
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const q = chip.getAttribute('data-wiki');
      if (q) {
        _detailHistory.push({ view: 'detail', item });
        _loadDetail(q);
      }
    });
  });
}

// ── Detail loader ─────────────────────────────────────────────────────────────
async function _loadDetail(query) {
  _searchInput.value = query;
  _renderLoading(`Loading "${query}"…`);
  const result = await wikiLookup(query);
  if (!result) {
    _renderEmpty(`Nothing found for <strong>${_esc(query)}</strong>.`);
    return;
  }
  _renderDetail(result, _detailHistory.length > 0);
}

// ── Show detail directly (already resolved WikiResult) ────────────────────────
function _showDetail(item) {
  _searchInput.value = item.name;
  _renderDetail(item, true);
}

// ── Back navigation ───────────────────────────────────────────────────────────
function _goBack() {
  const prev = _detailHistory.pop();
  if (!prev) return;
  if (prev.view === 'results') {
    _searchInput.value = prev.query;
    _renderResults(prev.results, prev.query);
  } else if (prev.view === 'detail') {
    _searchInput.value = prev.item.name;
    _renderDetail(prev.item, _detailHistory.length > 0);
  }
}

// ── Search handler with debounce ──────────────────────────────────────────────
function _onSearchInput() {
  const q = _searchInput.value.trim();
  _currentQuery = q;
  clearTimeout(_debounceTimer);
  if (!q) { _renderEmpty('Type anything to search…'); return; }
  _renderLoading('Searching…');
  _debounceTimer = setTimeout(async () => {
    if (_searchInput.value.trim() !== q) return; // stale
    const results = await wikiSearch(q, { limit: 7 });
    if (_searchInput.value.trim() !== q) return; // stale
    _detailHistory = [];
    _renderResults(results, q);
  }, 320);
}

// ── Open / close ──────────────────────────────────────────────────────────────
export function openWikiPanel(query) {
  _panelOpen = true;
  _detailHistory = [];
  _backdrop.classList.add('open');
  _panel.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (query) {
    _searchInput.value = query;
    _loadDetail(query);
  } else {
    _searchInput.value = '';
    _renderEmpty('Type anything to search — frames, items, missions, factions…');
    requestAnimationFrame(() => _searchInput.focus());
  }
}

export function closeWikiPanel() {
  _panelOpen = false;
  _backdrop.classList.remove('open');
  _panel.classList.remove('open');
  document.body.style.overflow = '';
  clearTimeout(_debounceTimer);
}

export function isWikiPanelOpen() { return _panelOpen; }

// ── Init — call once at app startup ──────────────────────────────────────────
export function initWikiPanel() {
  // Inject panel DOM
  const mount = document.createElement('div');
  mount.innerHTML = `
    <div class="wiki-backdrop" id="wiki-backdrop"></div>
    <div class="wiki-panel"    id="wiki-panel" role="dialog" aria-label="Warframe wiki lookup">
      <div class="wiki-panel-header">
        <div class="wiki-search-wrap">
          <span class="wiki-search-icon">${_searchIcon()}</span>
          <input
            type="search"
            id="wiki-search-input"
            class="wiki-search-input"
            placeholder="Search frames, items, missions…"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <button class="wiki-close-btn" id="wiki-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="wiki-panel-body" id="wiki-panel-body"></div>
    </div>`;
  document.body.appendChild(mount);

  _backdrop    = document.getElementById('wiki-backdrop');
  _panel       = document.getElementById('wiki-panel');
  _searchInput = document.getElementById('wiki-search-input');
  _closeBtn    = document.getElementById('wiki-close-btn');
  _body        = document.getElementById('wiki-panel-body');

  // Events
  _closeBtn.addEventListener('click', closeWikiPanel);
  _backdrop.addEventListener('click', closeWikiPanel);
  _searchInput.addEventListener('input', _onSearchInput);
  _searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeWikiPanel();
    if (e.key === 'Enter') {
      const q = _searchInput.value.trim();
      if (q) { _detailHistory = []; _loadDetail(q); }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _panelOpen) closeWikiPanel();
  });

  // Initial placeholder
  _renderEmpty('Type anything to search — frames, items, missions, factions…');
}

// ── HTML escape ───────────────────────────────────────────────────────────────
function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
