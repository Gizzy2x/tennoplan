// ---------------------------------------------------------------------------
// Codex fetcher — pulls every upstream JSON blob the codex pipeline needs.
//
// Sources:
//   • calamity-inc/warframe-public-export-plus  (12 JSON files; ~30 MB total)
//   • drops.warframestat.us/data/all.json       (WFCD drops; ~10 MB)
//
// Strategy:
//   • All calamity files fetched in parallel batches (config.concurrency).
//     Cloudflare caps simultaneous subrequests during scheduled events.
//   • WFCD drops has primary + GitHub-raw fallback.
//   • If ANY required calamity file fails, throw — partial codex would
//     produce broken TennoplanItems. We refuse to commit garbage.
//   • WFCD drops failure is recoverable: codex can ship without drops
//     (degraded quality), but every drop-bearing item loses bestFarms.
//     Returns null and lets the merger handle absence.
//
// Output:
//   RawCodexBlobs — every fetched payload as `unknown`, parsed JSON.
//   Downstream parser (C.2) does the type-narrowing into lookup maps.
// ---------------------------------------------------------------------------

import { config } from '../config';
import { logger } from '../logger';
import { fetchWithRetry } from '../utils/http';

const log  = (msg: string, data?: unknown) => logger.info('codex-fetcher',  msg, data);
const warn = (msg: string, data?: unknown) => logger.warn('codex-fetcher',  msg, data);

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RawCalamityBlobs {
  warframes:        unknown;
  weapons:          unknown;
  sentinels:        unknown;
  abilities:        unknown;
  upgrades:         unknown;
  recipes:          unknown;
  relics:           unknown;
  arcanes:          unknown;
  resources:        unknown;
  keys:             unknown;
  flavour:          unknown;
  fusionBundles:    unknown;
  gear:             unknown;
  /**
   * English locale dictionary — flat map of localization key → display name.
   * Calamity export files store `name` as a localization key like
   * "/Lotus/Language/Items/SupportArchwingName"; resolving it via dict.en.json
   * yields the human-readable English name ("Amesha") which WFCD uses.
   */
  localeDict:       unknown;
}

export interface RawCodexBlobs extends RawCalamityBlobs {
  /** WFCD drops payload, or null if both sources failed. */
  drops: unknown | null;
  /** Source attribution for the drops blob: 'wfcd' (primary), 'wfcd-github' (fallback), or null on failure. */
  dropsSource: 'wfcd' | 'wfcd-github' | null;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs: number, retries = 1): Promise<unknown> {
  const res = await fetchWithRetry(url, { timeoutMs, retries });
  return JSON.parse(res.text);
}

/**
 * Run an async fn over a list of inputs with bounded concurrency.
 * Returns results in input order. If any task throws, the whole call
 * rejects with that error — there's no partial-success semantics here
 * because a half-fetched codex is useless.
 */
async function pmap<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      const it = items[i];
      if (it === undefined) continue;
      results[i] = await fn(it);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ─── Calamity ─────────────────────────────────────────────────────────────────

/**
 * Fetch a single calamity file by basename (e.g. 'ExportWarframes.json').
 * Returns parsed JSON.
 */
export async function fetchCalamityFile(filename: string): Promise<unknown> {
  const url = config.codex.calamityBaseUrl + filename;
  return fetchJson(url, config.codex.fetchTimeoutMs, 1);
}

/**
 * Fetch all calamity export files + locale dictionary in parallel batches.
 * Throws if ANY required file fails (a partial codex is unsafe to ship).
 */
export async function fetchAllCalamity(): Promise<RawCalamityBlobs> {
  const files = config.codex.calamityFiles;
  log('fetching calamity exports', { count: files.length, concurrency: config.codex.concurrency });

  const started = Date.now();

  // Fetch exports + locale dict in parallel. Dict uses same base URL.
  const [results, localeDict] = await Promise.all([
    pmap(files, config.codex.concurrency, async (name) => {
      const t0 = Date.now();
      const data = await fetchCalamityFile(name);
      log('fetched', { file: name, ms: Date.now() - t0 });
      return [name, data] as const;
    }),
    fetchCalamityFile('dict.en.json'),
  ]);

  log('calamity batch complete', { ms: Date.now() - started });

  // Map filenames → field names. Unknown file in the list = type error
  // (rather than silent miss) thanks to readonly tuple inference.
  const lookup = new Map<string, unknown>(results);
  return {
    warframes:     requireFile(lookup, 'ExportWarframes.json'),
    weapons:       requireFile(lookup, 'ExportWeapons.json'),
    sentinels:     requireFile(lookup, 'ExportSentinels.json'),
    abilities:     requireFile(lookup, 'ExportAbilities.json'),
    upgrades:      requireFile(lookup, 'ExportUpgrades.json'),
    recipes:       requireFile(lookup, 'ExportRecipes.json'),
    relics:        requireFile(lookup, 'ExportRelics.json'),
    arcanes:       requireFile(lookup, 'ExportArcanes.json'),
    resources:     requireFile(lookup, 'ExportResources.json'),
    keys:          requireFile(lookup, 'ExportKeys.json'),
    flavour:       requireFile(lookup, 'ExportFlavour.json'),
    fusionBundles: requireFile(lookup, 'ExportFusionBundles.json'),
    gear:          requireFile(lookup, 'ExportGear.json'),
    localeDict,
  };
}

function requireFile(lookup: Map<string, unknown>, name: string): unknown {
  const v = lookup.get(name);
  if (v === undefined) {
    throw new Error(`Calamity fetch missing required file: ${name}`);
  }
  return v;
}

// ─── WFCD drops ───────────────────────────────────────────────────────────────

/**
 * Fetch the WFCD drops payload. Tries the primary CDN first, then the
 * raw GitHub mirror. Returns the parsed JSON plus a source attribution
 * so the merger can score data quality. Returns null on both failures —
 * codex still ships without drops, just with degraded quality.
 */
export async function fetchWfcdDrops(): Promise<{ data: unknown; source: 'wfcd' | 'wfcd-github' } | null> {
  const t0 = Date.now();
  try {
    const data = await fetchJson(config.codex.wfcdDropsUrl, config.codex.fetchTimeoutMs, 2);
    log('fetched WFCD drops (primary)', { ms: Date.now() - t0 });
    return { data, source: 'wfcd' };
  } catch (e) {
    warn('WFCD primary failed, falling back to GitHub', { error: errMsg(e) });
  }

  try {
    const data = await fetchJson(config.codex.wfcdDropsFallbackUrl, config.codex.fetchTimeoutMs, 2);
    log('fetched WFCD drops (fallback)', { ms: Date.now() - t0 });
    return { data, source: 'wfcd-github' };
  } catch (e) {
    warn('WFCD fallback failed too — codex will ship without drops', { error: errMsg(e) });
    return null;
  }
}

// ─── Top-level entry point ────────────────────────────────────────────────────

/**
 * Fetch every upstream blob the codex pipeline needs, in parallel.
 * Calamity exports are required (throws on any failure).
 * WFCD drops are recoverable (returns null, downstream handles absence).
 */
export async function fetchAllCodexSources(): Promise<RawCodexBlobs> {
  const started = Date.now();

  const [calamity, drops] = await Promise.all([
    fetchAllCalamity(),
    fetchWfcdDrops(),
  ]);

  log('all codex sources fetched', {
    ms:           Date.now() - started,
    dropsSource:  drops?.source ?? 'unavailable',
  });

  return {
    ...calamity,
    drops:       drops?.data ?? null,
    dropsSource: drops?.source ?? null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
