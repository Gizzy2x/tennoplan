// js/ui/fissures.js — renderVoidFissures(), tickFissureTimers(), normalizeFissureTier().

import { formatDur } from './layout.js';

// ── Module-level state ────────────────────────────────────────────────────────
let lastFissureData = null;
let fissureFilter   = 'all'; // 'all' | 'normal' | 'steelpath'

// ── Private helpers ───────────────────────────────────────────────────────────
function normalizeFissureTier(raw) {
  if (raw == null || raw === '') return 'Unknown';
  const s     = String(raw).trim();
  const lower = s.toLowerCase();
  const map   = { lith:'Lith', meso:'Meso', neo:'Neo', axi:'Axi', requiem:'Requiem', omnia:'Omnia' };
  return map[lower] || (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
}

// ── Exports ───────────────────────────────────────────────────────────────────
export function renderVoidFissures(fissures) {
  if (!fissures || !fissures.length) return;
  lastFissureData = fissures;
  const tierOrder = ['Lith','Meso','Neo','Axi','Requiem','Omnia'];
  const colors    = { Lith:'#5dc98a', Meso:'#6ea8e8', Neo:'#c8a84b', Axi:'#b87de8', Requiem:'#e05c5c', Omnia:'#4fc3f7' };

  const filtered = fissures
    .filter(f => !f.isStorm)
    .filter(f => {
      if (fissureFilter === 'normal')    return !f.isHard;
      if (fissureFilter === 'steelpath') return !!f.isHard;
      return true;
    })
    .map(f => ({ ...f, _tier: normalizeFissureTier(f.tier) }))
    .sort((a, b) => {
      const ia = tierOrder.indexOf(a._tier), ib = tierOrder.indexOf(b._tier);
      const sa = ia === -1 ? 999 : ia,       sb = ib === -1 ? 999 : ib;
      if (sa !== sb) return sa - sb;
      if (a._tier !== b._tier) return a._tier.localeCompare(b._tier);
      return new Date(a.expiry || 0) - new Date(b.expiry || 0);
    });

  const byTier = {};
  filtered.forEach(f => { (byTier[f._tier] ??= []).push(f); });
  const extraTiers  = Object.keys(byTier).filter(t => tierOrder.indexOf(t) === -1).sort();
  const tiersToShow = tierOrder.concat(extraTiers).filter(t => byTier[t]?.length);

  const daily = document.getElementById('daily-cards');
  if (!daily) return;
  let wrap = document.getElementById('wf-fissures-live');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'wf-fissures-live';
    daily.parentNode.insertBefore(wrap, daily);
  }
  wrap.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.style.marginTop = '28px';
  title.innerHTML = 'Void Fissures <span style="font-size:10px;color:var(--green);margin-left:8px">LIVE</span>';
  wrap.appendChild(title);

  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;';
  [['all','All'],['normal','Normal'],['steelpath','Steel Path']].forEach(([val, label]) => {
    const btn  = document.createElement('button');
    btn.textContent = label;
    const isOn = fissureFilter === val;
    btn.className  = 'pulse-run' + (isOn ? ' pulse-run-on' : '');
    btn.style.cssText = 'font-family:inherit;' + (isOn
      ? 'border-color:var(--accent);color:var(--text);background:rgba(79,195,247,0.12);box-shadow:0 0 0 1px rgba(79,195,247,0.25);'
      : '');
    btn.onclick = () => { fissureFilter = val; renderVoidFissures(lastFissureData); };
    filterBar.appendChild(btn);
  });
  wrap.appendChild(filterBar);

  if (!tiersToShow.length) {
    const empty = document.createElement('div');
    empty.className = 'fissure-tier-empty';
    empty.style.padding = '4px 0 12px';
    empty.textContent = 'No fissures match the current filter.';
    wrap.appendChild(empty);
  } else {
    const stack = document.createElement('div');
    stack.className = 'wf-fissures-stack';
    tiersToShow.forEach(tierName => {
      const list  = byTier[tierName];
      const color = colors[tierName] || '#6b7494';
      const block = document.createElement('div');
      block.className = 'fissure-tier-block';
      const head = document.createElement('div');
      head.className = 'fissure-tier-heading';
      head.style.color = color;
      head.innerHTML = `<span class="fissure-tier-dot" style="background:${color};box-shadow:0 0 8px ${color}55"></span>${tierName} relics`;
      block.appendChild(head);
      list.forEach(f => {
        const exp = f.expiry || '';
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;border-left:3px solid ${color};`;
        const t     = formatDur(new Date(exp) - Date.now());
        const badge = f.isHard
          ? `<span style="font-size:10px;font-weight:600;letter-spacing:0.05em;padding:2px 7px;border-radius:20px;color:#4fc3f7;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.3);white-space:nowrap">Steel Path</span>`
          : `<span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;color:var(--text-hint);white-space:nowrap">Normal</span>`;
        row.innerHTML = `
          <div style="flex:1;font-size:12px;color:var(--text)">${f.missionType || 'N/A'} — ${f.node || 'N/A'}</div>
          ${badge}
          <div class="fissure-time" data-expiry="${exp.replace(/"/g,'')}" style="font-size:11px;color:var(--text-dim);white-space:nowrap">${t}</div>`;
        block.appendChild(row);
      });
      stack.appendChild(block);
    });
    wrap.appendChild(stack);
  }

  // Void Storms — always shown, unaffected by filter
  const storms = fissures
    .filter(f => !!f.isStorm)
    .map(f => ({ ...f, _tier: normalizeFissureTier(f.tier) }))
    .sort((a, b) => {
      const ia = tierOrder.indexOf(a._tier), ib = tierOrder.indexOf(b._tier);
      const sa = ia === -1 ? 999 : ia,       sb = ib === -1 ? 999 : ib;
      if (sa !== sb) return sa - sb;
      if (a._tier !== b._tier) return a._tier.localeCompare(b._tier);
      return new Date(a.expiry || 0) - new Date(b.expiry || 0);
    });
  const stormByTier  = {};
  storms.forEach(f => { (stormByTier[f._tier] ??= []).push(f); });
  const stormExtra   = Object.keys(stormByTier).filter(t => tierOrder.indexOf(t) === -1).sort();
  const stormTiers   = tierOrder.concat(stormExtra).filter(t => stormByTier[t]?.length);

  const stormSection = document.createElement('div');
  stormSection.style.marginTop = '24px';
  const stormTitle = document.createElement('div');
  stormTitle.className = 'section-title';
  stormTitle.style.marginTop = '0';
  stormTitle.textContent = 'Void Storms — Railjack Fissures';
  stormSection.appendChild(stormTitle);
  const stormSub = document.createElement('div');
  stormSub.style.cssText = 'font-size:11px;color:var(--text-dim);margin:-4px 0 10px;';
  stormSub.textContent   = 'Requires a Railjack — separate mission type, same relics and rewards.';
  stormSection.appendChild(stormSub);

  if (!stormTiers.length) {
    const empty = document.createElement('div');
    empty.className = 'fissure-tier-empty';
    empty.textContent = 'No active Void Storms right now.';
    stormSection.appendChild(empty);
  } else {
    const stormStack = document.createElement('div');
    stormStack.className = 'wf-fissures-stack';
    stormTiers.forEach(tierName => {
      const list  = stormByTier[tierName];
      const color = colors[tierName] || '#6b7494';
      const block = document.createElement('div');
      block.className = 'fissure-tier-block';
      const head = document.createElement('div');
      head.className = 'fissure-tier-heading';
      head.style.color = color;
      head.innerHTML = `<span class="fissure-tier-dot" style="background:${color};box-shadow:0 0 8px ${color}55"></span>${tierName} relics`;
      block.appendChild(head);
      list.forEach(f => {
        const exp = f.expiry || '';
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;border-left:3px solid ${color};`;
        const t     = formatDur(new Date(exp) - Date.now());
        const badge = f.isHard
          ? `<span style="font-size:10px;font-weight:600;letter-spacing:0.05em;padding:2px 7px;border-radius:20px;color:#4fc3f7;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.3);white-space:nowrap">Steel Path</span>`
          : `<span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;color:var(--text-hint);white-space:nowrap">Normal</span>`;
        row.innerHTML = `
          <div style="flex:1;font-size:12px;color:var(--text)">${f.missionType || 'N/A'} — ${f.node || 'N/A'}</div>
          ${badge}
          <div class="fissure-time" data-expiry="${exp.replace(/"/g,'')}" style="font-size:11px;color:var(--text-dim);white-space:nowrap">${t}</div>`;
        block.appendChild(row);
      });
      stormStack.appendChild(block);
    });
    stormSection.appendChild(stormStack);
  }
  wrap.appendChild(stormSection);
}

export function tickFissureTimers() {
  document.querySelectorAll('.fissure-time').forEach(el => {
    const exp = el.getAttribute('data-expiry');
    if (exp) el.textContent = formatDur(new Date(exp) - Date.now());
  });
}
