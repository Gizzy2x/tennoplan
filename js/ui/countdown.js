// js/ui/countdown.js — updateCountdown().

export function updateCountdown() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntil = day === 1 ? 7 : (8 - day) % 7;
  const nextWeek  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil));
  const wd = nextWeek - now;
  const wh = Math.floor(wd / 3600000), wm = Math.floor((wd % 3600000) / 60000), ws = Math.floor((wd % 60000) / 1000);
  const tw = document.getElementById('timer-weekly');
  if (tw) tw.textContent = `${String(wh).padStart(2,'0')}:${String(wm).padStart(2,'0')}:${String(ws).padStart(2,'0')}`;

  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dd = midnight - now;
  const dh = Math.floor(dd / 3600000), dm = Math.floor((dd % 3600000) / 60000), ds = Math.floor((dd % 60000) / 1000);
  const td = document.getElementById('timer-daily');
  if (td) td.textContent = `${String(dh).padStart(2,'0')}:${String(dm).padStart(2,'0')}:${String(ds).padStart(2,'0')}`;
}
