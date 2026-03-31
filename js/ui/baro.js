// js/ui/baro.js — renderBaro().

import { formatDur } from './layout.js';

export function renderBaro(b) {
  if (!b) { document.getElementById('baro-status').textContent = 'Data unavailable'; return; }
  const dot    = document.getElementById('baro-dot');
  const status = document.getElementById('baro-status');
  const timer  = document.getElementById('baro-timer');
  if (b.active) {
    dot.className    = 'baro-dot present';
    status.textContent = 'Present at ' + (b.location || 'Relay');
    timer.textContent  = 'Leaves in ' + formatDur(new Date(b.expiry) - Date.now());
  } else {
    dot.className    = 'baro-dot absent';
    status.textContent = 'Next visit: ' + (b.location || 'Unknown relay');
    timer.textContent  = b.activation ? 'Arrives in ' + formatDur(new Date(b.activation) - Date.now()) : '—';
  }
}
