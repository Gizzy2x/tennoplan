// js/ui/pulses.js — renderPulses(), toggleTieredRun(), toggleNetRun(), countPulsesUsed().

import { week, persist } from '../state.js';

export function countPulsesUsed() {
  return Object.values(week.runs).filter(Boolean).length;
}

// Called from HTML inline onclick
export function toggleTieredRun(mode, tier) {
  const nk = mode === 'eda' ? 'edaNormal' : 'taNormal';
  const ek = mode === 'eda' ? 'edaElite'  : 'taElite';
  const r  = week.runs;

  if (tier === 'elite') {
    if (r[ek]) {
      r[ek] = false;
    } else {
      const extraCost = r[nk] ? 1 : 2;
      if (countPulsesUsed() + extraCost > 5) return;
      r[nk] = true;
      r[ek] = true;
    }
  } else {
    if (r[nk]) {
      r[ek] = false;
      r[nk] = false;
    } else {
      if (countPulsesUsed() >= 5) return;
      r[nk] = true;
    }
  }
  persist();
  renderPulses();
}

// Called from HTML inline onclick
export function toggleNetRun(idx) {
  const key = 'net' + (idx + 1);
  if (week.runs[key]) {
    week.runs[key] = false;
  } else {
    if (countPulsesUsed() >= 5) return;
    week.runs[key] = true;
  }
  persist();
  renderPulses();
}

export function renderPulses() {
  const used    = countPulsesUsed();
  const labelEl = document.getElementById('pulses-used-label');
  const fillEl  = document.getElementById('pulse-progress-fill');
  if (labelEl) labelEl.textContent = used + ' / 5 pulses used this week';
  if (fillEl)  fillEl.style.width  = (used / 5 * 100) + '%';

  [['eda','edaNormal','edaElite'],['tmp','taNormal','taElite']].forEach(([mode, nk, ek]) => {
    const nEl = document.querySelector(`.pulse-run[data-mode="${mode}"][data-tier="normal"]`);
    const eEl = document.querySelector(`.pulse-run[data-mode="${mode}"][data-tier="elite"]`);
    if (nEl) nEl.classList.toggle('pulse-run-on', !!week.runs[nk]);
    if (eEl) eEl.classList.toggle('pulse-run-on', !!week.runs[ek]);
  });

  document.querySelectorAll('.pulse-run[data-mode="net"]').forEach(el => {
    const idx = +el.getAttribute('data-idx');
    el.classList.toggle('pulse-run-on', !!week.runs['net' + (idx + 1)]);
  });
}
