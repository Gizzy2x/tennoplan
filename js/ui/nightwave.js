// js/ui/nightwave.js — renderNightwave().

import { week, persist } from '../state.js';
import { buildNightwavePanel, attachExpand } from './knowMore.js';

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
    div.onclick = () => { week.nw[id] = !week.nw[id]; renderNightwave(acts, season); persist(); };
    // Add Know More expand
    const panelHTML = buildNightwavePanel(act.type, act.title || act.name || '');
    if (panelHTML) {
      const knowBtn = document.createElement('button');
      knowBtn.className = 'km-toggle-btn';
      knowBtn.textContent = 'Know more ↓';
      div.appendChild(knowBtn);
      attachExpand(div, panelHTML);
    }
    c.appendChild(div);
  });
  document.getElementById('nw-standing').textContent = earned.toLocaleString() + ' standing earned this session';
  document.getElementById('nw-bar').style.width = maxPts > 0 ? (earned / maxPts * 100) + '%' : '0%';
}
