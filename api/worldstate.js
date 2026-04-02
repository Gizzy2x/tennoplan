'use strict';

const WorldState = require('warframe-worldstate-parser');

const PRIMARY_URL  = 'https://api.warframestat.us/pc';
const FALLBACK_URL = 'http://content.warframe.com/dynamic/worldState.php';
const TIMEOUT_MS   = 2500;

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

module.exports = async (req, res) => {
  // Vercel edge cache: serve cached response for 60 s, revalidate in background
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  // ── Primary: warframestat.us ──────────────────────────────────────────────
  try {
    const response = await fetchWithTimeout(PRIMARY_URL, TIMEOUT_MS);
    const data = await response.json();
    res.setHeader('x-data-source', 'primary');
    return res.status(200).json(data);
  } catch (_primaryErr) {
    // Intentional fall-through to fallback
  }

  // ── Fallback: raw DE worldstate → warframe-worldstate-parser ─────────────
  try {
    const response = await fetchWithTimeout(FALLBACK_URL, TIMEOUT_MS);
    const rawText  = await response.text();
    const ws       = new WorldState(rawText);
    res.setHeader('x-data-source', 'fallback');
    return res.status(200).json(ws);
  } catch (fallbackErr) {
    return res.status(502).json({ error: 'Both data sources unavailable', detail: fallbackErr.message });
  }
};
