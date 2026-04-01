// js/ui/baro.js — renderBaro(), tickBaroTimer().

import { formatDur } from './layout.js';

export function renderBaro(b) {
  if (!b) { document.getElementById('baro-status').textContent = 'Data unavailable'; return; }
  const dot    = document.getElementById('baro-dot');
  const status = document.getElementById('baro-status');
  const timer  = document.getElementById('baro-timer');
  if (b.active) {
    dot.className      = 'baro-dot present';
    status.textContent = 'Present at ' + (b.location || 'Relay');
    timer.textContent  = 'Leaves in ' + formatDur(new Date(b.expiry) - Date.now());
    // Store on DOM so tickBaroTimer can update every second
    timer.dataset.baroExpiry     = b.expiry || '';
    timer.dataset.baroActive     = 'true';
    delete timer.dataset.baroActivation;
  } else {
    dot.className      = 'baro-dot absent';
    status.textContent = 'Next visit: ' + (b.location || 'Unknown relay');
    if (b.activation) {
      timer.textContent            = 'Arrives in ' + formatDur(new Date(b.activation) - Date.now());
      timer.dataset.baroActivation = b.activation;
      timer.dataset.baroActive     = 'false';
      delete timer.dataset.baroExpiry;
    } else {
      timer.textContent = '—';
      delete timer.dataset.baroExpiry;
      delete timer.dataset.baroActivation;
    }
  }
}

// Called every second from main.js — ticks the Baro arrival/departure countdown.
export function tickBaroTimer() {
  const timer = document.getElementById('baro-timer');
  if (!timer) return;
  const expiry     = timer.dataset.baroExpiry;
  const activation = timer.dataset.baroActivation;
  const active     = timer.dataset.baroActive;
  if (active === 'true' && expiry) {
    timer.textContent = 'Leaves in ' + formatDur(new Date(expiry) - Date.now());
  } else if (active === 'false' && activation) {
    timer.textContent = 'Arrives in ' + formatDur(new Date(activation) - Date.now());
  }
}
