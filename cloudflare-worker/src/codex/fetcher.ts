// ---------------------------------------------------------------------------
// Codex fetcher — pulls every upstream JSON blob the codex pipeline needs.
//
// WFCD-only sources (post-2026-05-26 refactor):
//   • mods, warframes, weapons, sentinels, pets, arcanes, relics, resources, gear
//   • drops (location-keyed; parser inverts to per-item drops)
//
// Each per-category fetch:
//   • Primary:  api.warframestat.us/<category> with ?only= filter (small)
//   • Fallback: raw.githubusercontent.com/WFCD/warframe-items (full payload)
//   • Returns the parsed JSON, or null if BOTH paths fail. Downstream
//     parsers tolerate null absence — codex still ships with reduced
//     coverage rather than refusing to commit.
//
// Only `drops` carries a `source` attribution because the merge logic
// downstream conditions on it; item categories don't need it.
// ---------------------------------------------------------------------------

import { config } from '../config';
import { logger } from '../logger';
import { fetchWithRetry } from '../utils/http';
import { fetchWikiWarframes, type WikiWarframeRecord } from './wikiWarframes';

const log  = (msg: string, data?: unknown) => logger.info('codex-fetcher',  msg, data);
const warn = (msg: string, data?: unknown) => logger.warn('codex-fetcher',  msg, data);

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RawCodexBlobs {
  /** WFCD drops payload, or null if both sources failed. */
  drops:        unknown | null;
  /** Source attribution for drops: 'wfcd' (primary), 'wfcd-github' (fallback), or null. */
  dropsSource:  'wfcd' | 'wfcd-github' | null;

  // Per-category item universes. null = both primary + fallback failed.
  mods:         unknown | null;
  warframes:    unknown | null;
  weapons:      unknown | null;
  sentinels:    unknown | null;
  pets:         unknown | null;
  arcanes:      unknown | null;
  relics:       unknown | null;
  resources:    unknown | null;
  gear:         unknown | null;
  misc:         unknown | null;

  /**
   * Wiki-sourced per-warframe records (passive prose + Sex/Subsumed/Tactical/
   * Progenitor/Themes/Playstyle/InitialEnergy/SellPrice/etc), keyed by
   * warframe display name. Empty Map on fetch/parse failure (never null) —
   * enricher treats absent fields as "no override, use WFCD value".
   */
  wikiWarframes: ReadonlyMap<string, WikiWarframeRecord>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs: number, retries = 1): Promise<unknown> {
  const res = await fetchWithRetry(url, { timeoutMs, retries });
  return JSON.parse(res.text);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Generic primary-with-GitHub-fallback fetch. Returns the parsed JSON, or
 * null if both fail. Logs source attribution so we can spot when fallbacks
 * fire repeatedly in production.
 */
async function fetchWithFallback(label: string, primary: string, fallback: string): Promise<unknown | null> {
  const t0 = Date.now();
  try {
    const data = await fetchJson(primary, config.codex.fetchTimeoutMs, 2);
    log(`fetched ${label} (primary)`, { ms: Date.now() - t0 });
    return data;
  } catch (e) {
    warn(`${label} primary failed, trying GitHub fallback`, { error: errMsg(e) });
  }
  try {
    const data = await fetchJson(fallback, config.codex.fetchTimeoutMs, 2);
    log(`fetched ${label} (github fallback)`, { ms: Date.now() - t0 });
    return data;
  } catch (e) {
    warn(`${label} fallback failed — category will be missing this sync`, { error: errMsg(e) });
    return null;
  }
}

// ─── Drops (separate because it also reports source attribution) ──────────────

async function fetchDrops(): Promise<{ data: unknown; source: 'wfcd' | 'wfcd-github' } | null> {
  const t0 = Date.now();
  try {
    const data = await fetchJson(config.codex.wfcdDropsUrl, config.codex.fetchTimeoutMs, 2);
    log('fetched drops (primary)', { ms: Date.now() - t0 });
    return { data, source: 'wfcd' };
  } catch (e) {
    warn('drops primary failed, falling back to GitHub', { error: errMsg(e) });
  }
  try {
    const data = await fetchJson(config.codex.wfcdDropsFallbackUrl, config.codex.fetchTimeoutMs, 2);
    log('fetched drops (github fallback)', { ms: Date.now() - t0 });
    return { data, source: 'wfcd-github' };
  } catch (e) {
    warn('drops fallback failed — codex will ship without drop data', { error: errMsg(e) });
    return null;
  }
}

// ─── Top-level entry point ────────────────────────────────────────────────────

/**
 * Fetch every WFCD source the codex needs. All categories run concurrently;
 * each one tolerates its own failure (returns null) so a single down endpoint
 * doesn't sink the whole sync. Validator decides whether the result is
 * shippable based on per-category presence + total item count.
 */
export async function fetchAllCodexSources(): Promise<RawCodexBlobs> {
  const started = Date.now();
  const c = config.codex;

  const [
    drops,
    mods, warframes, weapons, sentinels, pets, arcanes, relics, resources, gear, misc,
    wikiWarframes,
  ] = await Promise.all([
    fetchDrops(),
    fetchWithFallback('mods',      c.wfcdModsUrl,      c.wfcdModsFallbackUrl),
    fetchWithFallback('warframes', c.wfcdWarframesUrl, c.wfcdWarframesFallbackUrl),
    fetchWithFallback('weapons',   c.wfcdWeaponsUrl,   c.wfcdWeaponsFallbackUrl),
    fetchWithFallback('sentinels', c.wfcdSentinelsUrl, c.wfcdSentinelsFallbackUrl),
    fetchWithFallback('pets',      c.wfcdPetsUrl,      c.wfcdPetsFallbackUrl),
    fetchWithFallback('arcanes',   c.wfcdArcanesUrl,   c.wfcdArcanesFallbackUrl),
    fetchWithFallback('relics',    c.wfcdRelicsUrl,    c.wfcdRelicsFallbackUrl),
    fetchWithFallback('resources', c.wfcdResourcesUrl, c.wfcdResourcesFallbackUrl),
    fetchWithFallback('gear',      c.wfcdGearUrl,      c.wfcdGearFallbackUrl),
    fetchWithFallback('misc',      c.wfcdMiscUrl,      c.wfcdMiscFallbackUrl),
    fetchWikiWarframes(),
  ]);

  log('all codex sources fetched', {
    ms:            Date.now() - started,
    dropsSource:   drops?.source ?? 'unavailable',
    mods:          mods      != null ? 'ok' : 'unavailable',
    warframes:     warframes != null ? 'ok' : 'unavailable',
    weapons:       weapons   != null ? 'ok' : 'unavailable',
    sentinels:     sentinels != null ? 'ok' : 'unavailable',
    pets:          pets      != null ? 'ok' : 'unavailable',
    arcanes:       arcanes   != null ? 'ok' : 'unavailable',
    relics:        relics    != null ? 'ok' : 'unavailable',
    resources:     resources != null ? 'ok' : 'unavailable',
    gear:          gear      != null ? 'ok' : 'unavailable',
    misc:          misc      != null ? 'ok' : 'unavailable',
    wikiWarframes: wikiWarframes.size,
  });

  return {
    drops:       drops?.data ?? null,
    dropsSource: drops?.source ?? null,
    mods, warframes, weapons, sentinels, pets, arcanes, relics, resources, gear, misc,
    wikiWarframes,
  };
}
