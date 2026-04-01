// js/ui/nightwave.js — renderNightwave().

import { week, persist } from '../state.js';
import { buildNightwavePanel } from './knowMore.js';

export function renderNightwave(acts, season) {
  const c = document.getElementById('nw-acts');
  c.innerHTML = '';
  let earned  = 0;
  const maxPts = acts.reduce((s, a) => s + (a.standing || a.pts || 0), 0);
  if (season) document.getElementById('nw-season').textContent = season;
  acts.forEach(act => {
    const id   = act.id || ('nw-' + (act.title || act.name || '').replace(/\s+/g, '-').toLowerCase());
    const pts  = act.standing || act.pts || 0;
    const done = !!week.nw[id];
    if (done) earned += pts;
    const div = document.createElement('div');
    div.className = 'nw-act' + (done ? ' done' : '');
    const typeLabel = act.type ? `<span class="nw-act-type">${act.type.replace(/_/g, ' ')}</span>` : '';
    div.innerHTML = `<div class="nw-act-check"></div><div class="nw-act-name">${act.title || act.name || 'Act'}</div>${typeLabel}<div class="nw-act-pts">+${pts.toLocaleString()}</div>`;
    div.addEventListener('click', e => {
      if (e.target.closest('button, a')) return;
      week.nw[id] = !week.nw[id];
      renderNightwave(acts, season);
      persist();
    });
    const knowBtn = document.createElement('button');
    knowBtn.className = 'km-toggle-btn';
    knowBtn.textContent = 'Know more ↓';
    div.appendChild(knowBtn);

    let nwExpandWrapper = null;
    let nwExpandOpen    = false;

    knowBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!nwExpandWrapper) {
        const panelHTML = buildNightwavePanel(act.type, act.title || act.name || '');
        nwExpandWrapper = document.createElement('div');
        nwExpandWrapper.className = 'km-collapsible';
        const inner = document.createElement('div');
        inner.className = 'km-inner';
        const panel = document.createElement('div');
        panel.className = 'km-panel';
        panel.innerHTML = panelHTML;
        inner.appendChild(panel);
        nwExpandWrapper.appendChild(inner);
        div.after(nwExpandWrapper);
      }
      nwExpandOpen = !nwExpandOpen;
      nwExpandWrapper.classList.toggle('km-open', nwExpandOpen);
      knowBtn.textContent = nwExpandOpen ? 'Less ↑' : 'Know more ↓';
    });
    c.appendChild(div);
  });
  document.getElementById('nw-standing').textContent = earned.toLocaleString() + ' standing earned this session';
  document.getElementById('nw-bar').style.width = maxPts > 0 ? (earned / maxPts * 100) + '%' : '0%';
}
