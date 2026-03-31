// js/ui/layout.js — Badge, formatDur, resetAll, initSectionToggles.

import { state, week, today, persist, RUNS_DEFAULT } from '../state.js';

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

export function checkSVG() {
  return '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
