// js/ui/cycles.js — renderWorldCycles(), applyCycle(), tickCycleTimers(),
//                   CYCLE_DUR_MS, CYCLE_HINTS, CYCLE_META.

import { formatDur } from './layout.js';
import { buildCyclePanel } from './knowMore.js';

// ── Constants ─────────────────────────────────────────────────────────────────
export const CYCLE_DUR_MS = {
  day: 6000000, night: 3000000,
  warm:  400000, cold:   800000,
  fass: 6000000, vome:  6000000,
};

export const CYCLE_HINTS = {
  day:   'Mining & bounties',
  night: 'Eidolons & fishing',
  warm:  'Toroid farming',
  cold:  'Fishing & conservation',
  fass:  'Rare Vome drops',
  vome:  'Fishing & bounties',
};

// Cycle display metadata — id matches DOM ids and API normalizer names
export const CYCLE_META = [
  { id: 'cetus',   label: 'Cetus',         defaultHint: 'Night → Eidolons & fishing'      },
  { id: 'vallis',  label: 'Orb Vallis',    defaultHint: 'Cold → fishing & conservation'   },
  { id: 'cambion', label: 'Cambion Drift', defaultHint: 'Vome → fishing & bounties'       },
];

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Build the flexbox cycle cards inside #cycles-grid.
 * Renders placeholder skeletons immediately so the layout is in place before
 * any API data arrives. applyCycle() fills in live values as each fetch resolves.
 */
export function renderWorldCycles() {
  const grid = document.getElementById('cycles-grid');
  if (!grid) return;
  grid.innerHTML = CYCLE_META.map(({ id, label, defaultHint }) => `
    <div class="cycle-card" id="cycle-${id}">
      <div class="cycle-header">
        <span class="cycle-name">${label}</span>
        <span class="cycle-state-pill" id="${id}-pill">—</span>
      </div>
      <div class="cycle-next" id="${id}-next">Next: —</div>
      <div class="cycle-bar-label">time remaining</div>
      <div class="cycle-bar-bg">
        <div class="cycle-bar-fill" id="${id}-bar" style="width:0%"></div>
      </div>
      <div class="cycle-footer">
        <span class="cycle-hint" id="${id}-hint">${defaultHint}</span>
        <div class="cycle-timer-wrap">
          <div class="cycle-timer-label">changes in</div>
          <div class="cycle-timer" id="${id}-timer">—</div>
        </div>
      </div>
    </div>
  `).join('');
}

// cycle: { current, next, timeLeft, percent, expiry, activation }
// Produced by normalizeCetusCycle / normalizeVallisCycle / normalizeCambionCycle in api.js.
export function applyCycle(id, cycle) {
  const pill  = document.getElementById(id + '-pill');
  const bar   = document.getElementById(id + '-bar');
  const timer = document.getElementById(id + '-timer');
  const hint  = document.getElementById(id + '-hint');
  const nextEl = document.getElementById(id + '-next');
  if (!pill || !bar || !timer) return;
  const stateKey = cycle.current.toLowerCase();
  // Store expiry + activation on the timer element so tickCycleTimers can
  // recalculate timeLeft and bar width every second without another fetch.
  timer.setAttribute('data-cycle-expiry', cycle.expiry);
  timer.setAttribute('data-cycle-state',  stateKey);
  if (cycle.activation) timer.setAttribute('data-cycle-activation', cycle.activation);
  pill.className    = 'cycle-state-pill ' + stateKey;
  pill.textContent  = cycle.current;
  if (nextEl) nextEl.textContent = 'Next: ' + cycle.next;
  bar.className     = 'cycle-bar-fill ' + stateKey;
  bar.style.width   = cycle.percent.toFixed(1) + '%'; // percent of phase time remaining
  timer.textContent = formatDur(cycle.timeLeft);
  if (hint) hint.textContent = CYCLE_HINTS[stateKey] || '';

  // Attach or refresh Know More expand for this cycle card
  const card = document.getElementById('cycle-' + id);
  if (card) {
    // Remove old expand wrapper and button on cycle refresh
    card.querySelectorAll('.km-collapsible').forEach(el => el.remove());
    card.querySelectorAll('.km-toggle-btn').forEach(el => el.remove());

    const cycleKnowBtn = document.createElement('button');
    cycleKnowBtn.className   = 'km-toggle-btn';
    cycleKnowBtn.textContent = 'Know more ↓';
    const footer = card.querySelector('.cycle-footer');
    if (footer) footer.appendChild(cycleKnowBtn);
    else card.appendChild(cycleKnowBtn);

    let cycleExpandWrapper = null;
    let cycleExpandOpen    = false;

    cycleKnowBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!cycleExpandWrapper) {
        const panelHTML = buildCyclePanel(id, stateKey);
        cycleExpandWrapper = document.createElement('div');
        cycleExpandWrapper.className = 'km-collapsible';
        const inner = document.createElement('div');
        inner.className = 'km-inner';
        const panel = document.createElement('div');
        panel.className = 'km-panel';
        panel.innerHTML = panelHTML;
        inner.appendChild(panel);
        cycleExpandWrapper.appendChild(inner);
        card.appendChild(cycleExpandWrapper);
      }
      cycleExpandOpen = !cycleExpandOpen;
      cycleExpandWrapper.classList.toggle('km-open', cycleExpandOpen);
      cycleKnowBtn.textContent = cycleExpandOpen ? 'Less ↑' : 'Know more ↓';
    });
  }
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
        // Use API-derived phase window: percent of time still remaining (bar shrinks to 0)
        const actMs = new Date(activationIso).getTime();
        const total = expMs - actMs;
        pct = total > 0 ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0;
      } else {
        // Fallback: known phase durations when API omits activation
        const durationMs = CYCLE_DUR_MS[stateKey] || 6000000;
        pct = durationMs > 0 ? Math.max(0, Math.min(100, (remaining / durationMs) * 100)) : 0;
      }
      bar.style.width = pct.toFixed(1) + '%';
    }
  });
}
