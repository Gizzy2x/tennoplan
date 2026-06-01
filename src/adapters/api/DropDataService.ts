/**
 * DropDataService — reliable, download-once static data sync.
 *
 * Replaces the old ItemsService (auto-sync on launch, 24 h TTL) with a
 * download-once + store-durably model. Data only leaves Dexie when the
 * user hits "Clear Data" in Settings, and only enters when the user hits
 * "Refresh" (or accepts the stale-data banner on launch).
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │  Data flow (manual trigger only — NO auto-sync on app launch):  │
 *   │                                                                 │
 *   │    fetchAndSync()                                               │
 *   │       │                                                         │
 *   │       ├─ Fetch drops.warframestat.us (with retry + progress)    │
 *   │       ├─ normaliseDropPayload() → DropLocation[]                │
 *   │       ├─ Load items-map.json → StoredItem[] (iconUrl resolved)  │
 *   │       └─ Transactional write: items + dropLocations + syncState │
 *   │                                                                 │
 *   │    checkForStaleData()  — lightweight timestamp read            │
 *   │    clearAllData()       — Settings button only                  │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Why the rewrite: the previous system polled on init, used a 24 h TTL
 * and produced "(image.png)" placeholders when caches cleared. The new
 * design stores pre-resolved iconUrls so icons never go missing, and
 * never touches the network unless the user explicitly asks.
 */

import { db } from '@/adapters/storage/db';
import { logger } from '@/core/utils/logger';
import { normaliseDropPayload, type RawDropPayload } from '@/core/services/dropsService';
import { getIconUrl } from '@/lib/icons/IconResolver';
import type { StoredItem, ItemCategory } from '@/core/domain/items';
import type { DataSyncId } from '@/core/domain/sync';
import itemsMap from '@/lib/icons/items-map.json';
import { MOCK_DROP_LOCATIONS, MOCK_ITEMS } from '@/lib/mockdata/fixtures';

const log = logger.scope('DropDataService');

// ─── Constants ───────────────────────────────────────────────────────────────

/** Primary drop-data source. drops.warframestat.us mirrors WFCD/warframe-drop-data. */
const DROPS_URL_PRIMARY  = 'https://drops.warframestat.us/data/all.json';
/** Fallback: raw WFCD repo on GitHub — same dataset, different CDN. */
const DROPS_URL_FALLBACK = 'https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/all.json';

/** Check if mock mode is enabled via environment variable. */
function isMockModeEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

/** 14 days — the plan's stale threshold. Beyond this, the banner surfaces. */
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Bump this whenever `normaliseDropPayload` changes in a way that affects the
 * stored rows. A mismatch forces a full re-fetch + re-parse on the next sync,
 * bypassing the ETag/304 fast-path so users don't keep stale rows from an old
 * parser. (v2: fixed bounty reward parsing — itemName field, bare A/B/C
 * rotation keys, deimos/zariman section names.
 *  v3: preserve per-stage `stage` on bounty rewards for the wiki-style view.)
 */
const PARSER_VERSION = 3;

/** Drop payload is ~10 MB; keep timeout generous. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Exponential backoff base (ms). Attempt N waits N * this before retry. */
const RETRY_BACKOFF_MS = 1_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FetchProgress {
  /** Short, user-facing status string. Safe to render directly. */
  status: string;
  /** 0–100 percent complete, or null for indeterminate phases. */
  percent: number | null;
}

export interface FetchOptions {
  /** Called as the sync progresses through phases. */
  onProgress?: (progress: FetchProgress) => void;
  /** Max retry attempts on fetch failure. Default: 3. */
  maxRetries?: number;
  /** Per-attempt timeout (ms). Default: 30 000. */
  timeoutMs?: number;
}

export interface FetchResult {
  itemsCount: number;
  dropsCount: number;
  durationMs: number;
  fetchedAt: number;
}

export interface StaleInfo {
  /** True if dataset is missing entirely OR older than 14 days. */
  isStale: boolean;
  /** Whole days since last sync; Infinity when never synced. */
  daysOld: number;
  /** User-facing message for banners. */
  message: string;
  /** Unix ms of the last successful sync, or null. */
  lastUpdated: number | null;
}

// ─── Internal types for items-map.json ───────────────────────────────────────

interface RawItemEntry {
  name: string;
  category: string;
  imageName: string;
}

const RAW_ITEMS_MAP = itemsMap as Record<string, RawItemEntry>;

// ─── Fetch helpers ───────────────────────────────────────────────────────────

function emit(onProgress: FetchOptions['onProgress'], status: string, percent: number | null): void {
  onProgress?.({ status, percent });
}

async function fetchWithTimeout(url: string, etag: string | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (etag) headers['If-None-Match'] = etag;
    return await fetch(url, { signal: controller.signal, headers, cache: 'no-cache' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch with exponential backoff. Returns the Response on success.
 * Throws after `maxRetries + 1` total attempts exhaust.
 */
async function fetchWithRetry(
  url: string,
  etag: string | undefined,
  timeoutMs: number,
  maxRetries: number,
  onProgress: FetchOptions['onProgress'],
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        emit(onProgress, `Retrying (${attempt}/${maxRetries})…`, 10);
      }
      const res = await fetchWithTimeout(url, etag, timeoutMs);
      // 304 is a valid "no change" response; 2xx is success. Both return.
      if (res.status === 304 || res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * (attempt + 1)));
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Fetch failed after ${maxRetries + 1} attempts: ${msg}`);
}

async function safeJsonFromResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text || text.trim().length === 0) throw new Error('Empty response body');
  return JSON.parse(text);
}

// ─── Items-map → StoredItem[] ────────────────────────────────────────────────

/**
 * Build the full StoredItem catalogue from the build-time items-map.json.
 * Each row gets a pre-resolved `iconUrl` — the UI never computes CDN paths.
 *
 * Future work: if WFCD ships updated items between app builds, this can
 * swap to a network fetch (e.g. @wfcd/items raw JSON on GitHub). The
 * interface and storage shape stay the same.
 */
function buildItemsFromBakedMap(now: number): StoredItem[] {
  const out: StoredItem[] = [];
  for (const [uniqueName, entry] of Object.entries(RAW_ITEMS_MAP)) {
    if (!entry?.imageName) continue; // Skip rows that would produce "(image.png)"
    out.push({
      uniqueName,
      name: entry.name,
      category: entry.category as ItemCategory,
      imageName: entry.imageName,
      iconUrl: getIconUrl(entry.imageName),
      lastUpdated: now,
    });
  }
  return out;
}

// ─── Sync-state helpers ──────────────────────────────────────────────────────

async function readSyncState(id: DataSyncId): Promise<number | null> {
  const row = await db.dataSyncState.get(id);
  return row?.lastUpdated ?? null;
}

async function readEtag(id: DataSyncId): Promise<string | undefined> {
  const row = await db.dataSyncState.get(id);
  return row?.etag;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const DropDataService = {
  /**
   * Manually fetch + store drop data and rebuild the items catalogue.
   *
   * If VITE_USE_MOCK_DATA=true, loads fixtures instead of calling the live API.
   *
   * Emits progress updates via `options.onProgress`. Retries failed fetches
   * with exponential backoff. On total failure, existing Dexie rows are
   * preserved untouched — callers can still serve stale data.
   *
   * The update is transactional: items, dropLocations, and both sync-state
   * rows are written together, or none are.
   */
  async fetchAndSync(options: FetchOptions = {}): Promise<FetchResult> {
    const { onProgress, maxRetries = 3, timeoutMs = REQUEST_TIMEOUT_MS } = options;
    const startedAt = Date.now();
    const mockMode = isMockModeEnabled();

    if (mockMode) {
      emit(onProgress, '📦 Using mock data (VITE_USE_MOCK_DATA=true)…', 10);

      const now = Date.now();
      const itemRows = MOCK_ITEMS;
      const dropRows = MOCK_DROP_LOCATIONS;

      emit(onProgress, 'Writing mock data to local database…', 50);

      try {
        await db.transaction(
          'rw',
          [db.items, db.dropLocations, db.dataSyncState],
          async () => {
            await db.items.clear();
            await db.dropLocations.clear();
            await db.items.bulkPut(itemRows);
            await db.dropLocations.bulkPut(dropRows);
            await db.dataSyncState.put({
              id: 'items',
              lastUpdated: now,
              rowCount: itemRows.length,
              lastErrorMessage: undefined,
            });
            await db.dataSyncState.put({
              id: 'dropLocations',
              lastUpdated: now,
              rowCount: dropRows.length,
              parserVersion: PARSER_VERSION,
              lastErrorMessage: undefined,
            });
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('Mock data write failed', err);
        emit(onProgress, `Failed: ${msg}`, null);
        throw err;
      }

      const durationMs = Date.now() - startedAt;
      log.success(
        `Mock: Loaded ${itemRows.length} items + ${dropRows.length} drop locations in ${(durationMs / 1000).toFixed(1)} s.`,
      );
      emit(onProgress, '✓ Mock data ready.', 100);

      return {
        itemsCount: itemRows.length,
        dropsCount: dropRows.length,
        durationMs,
        fetchedAt: now,
      };
    }

    emit(onProgress, 'Connecting to drop-data source…', 5);

    // Conditional GET: pass the previous ETag so the server can 304 us — BUT
    // only when the stored rows came from the current parser. If the parser
    // changed, skip the ETag so we force a 200 + full re-parse.
    const prevState = await db.dataSyncState.get('dropLocations');
    const parserChanged = prevState?.parserVersion !== PARSER_VERSION;
    const prevEtag = parserChanged ? undefined : prevState?.etag;
    if (parserChanged && prevState) {
      log.info(`Parser version changed (${prevState.parserVersion ?? 'none'} → ${PARSER_VERSION}) — forcing full re-parse.`);
    }

    let res: Response;
    try {
      res = await fetchWithRetry(DROPS_URL_PRIMARY, prevEtag, timeoutMs, maxRetries, onProgress);
    } catch (primaryErr) {
      log.warn('Primary drop-data source failed — trying GitHub fallback.', primaryErr);
      emit(onProgress, 'Primary source unavailable — trying fallback…', 12);
      try {
        // Fallback skips ETag (different server, ETag won't match)
        res = await fetchWithRetry(DROPS_URL_FALLBACK, undefined, timeoutMs, maxRetries, onProgress);
      } catch (fallbackErr) {
        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        await db.dataSyncState.put({
          id: 'dropLocations',
          lastUpdated: (await readSyncState('dropLocations')) ?? 0,
          lastErrorMessage: `Both sources failed. ${msg}`,
        });
        log.error('fetchAndSync failed (primary + fallback) — existing rows preserved.', fallbackErr);
        emit(onProgress, `Failed: ${msg}`, null);
        throw fallbackErr;
      }
    }

    const now = Date.now();
    const newEtag = res.headers.get('ETag') ?? undefined;

    // 304 Not Modified — refresh timestamps only, keep existing rows.
    if (res.status === 304) {
      emit(onProgress, 'Drop data unchanged. Refreshing timestamp…', 80);
      await db.dataSyncState.put({
        id: 'dropLocations',
        lastUpdated: now,
        etag: newEtag ?? prevEtag,
        rowCount: await db.dropLocations.count(),
        parserVersion: PARSER_VERSION,
        lastErrorMessage: undefined,
      });
      await db.dataSyncState.put({
        id: 'items',
        lastUpdated: now,
        rowCount: await db.items.count(),
        lastErrorMessage: undefined,
      });
      emit(onProgress, 'Complete — no changes.', 100);
      return {
        itemsCount: await db.items.count(),
        dropsCount: await db.dropLocations.count(),
        durationMs: Date.now() - startedAt,
        fetchedAt: now,
      };
    }

    // Parse payload.
    emit(onProgress, 'Parsing drop payload…', 35);
    let parsed: unknown;
    try {
      parsed = await safeJsonFromResponse(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.dataSyncState.put({
        id: 'dropLocations',
        lastUpdated: (await readSyncState('dropLocations')) ?? 0,
        lastErrorMessage: `Parse failed: ${msg}`,
      });
      emit(onProgress, `Parse failed: ${msg}`, null);
      throw err;
    }

    // Normalize drops.
    emit(onProgress, 'Normalising drop locations…', 55);
    const dropRows = normaliseDropPayload(parsed as RawDropPayload, now);
    if (dropRows.length === 0) {
      // Refuse to overwrite good cached data with an empty result.
      const existing = await db.dropLocations.count();
      if (existing > 0) {
        const msg = 'Normalisation produced 0 rows — keeping existing cached data.';
        log.warn(msg);
        emit(onProgress, msg, null);
        throw new Error(msg);
      }
    }

    // Rebuild items catalogue (always — cheap; guarantees iconUrl is fresh).
    emit(onProgress, 'Building items catalogue…', 70);
    const itemRows = buildItemsFromBakedMap(now);

    // Transactional write — all-or-nothing.
    emit(onProgress, 'Writing to local database…', 85);
    try {
      await db.transaction(
        'rw',
        [db.items, db.dropLocations, db.dataSyncState],
        async () => {
          await db.items.clear();
          await db.dropLocations.clear();
          await db.items.bulkPut(itemRows);
          await db.dropLocations.bulkPut(dropRows);
          await db.dataSyncState.put({
            id: 'items',
            lastUpdated: now,
            rowCount: itemRows.length,
            lastErrorMessage: undefined,
          });
          await db.dataSyncState.put({
            id: 'dropLocations',
            lastUpdated: now,
            etag: newEtag,
            rowCount: dropRows.length,
            parserVersion: PARSER_VERSION,
            lastErrorMessage: undefined,
          });
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('Dexie write failed — transaction rolled back.', err);
      emit(onProgress, `Database write failed: ${msg}`, null);
      throw err;
    }

    const durationMs = Date.now() - startedAt;
    log.success(
      `Synced ${itemRows.length} items + ${dropRows.length} drop locations in ${(durationMs / 1000).toFixed(1)} s.`,
    );
    emit(onProgress, 'Complete.', 100);

    return {
      itemsCount: itemRows.length,
      dropsCount: dropRows.length,
      durationMs,
      fetchedAt: now,
    };
  },

  /**
   * Read the sync state and report whether the user should see a stale
   * banner. Lightweight — a single Dexie read. Never touches the network.
   */
  async checkForStaleData(): Promise<StaleInfo> {
    const lastUpdated = await readSyncState('dropLocations');

    if (lastUpdated === null || lastUpdated === 0) {
      return {
        isStale: true,
        daysOld: Infinity,
        lastUpdated: null,
        message: 'Drop data has never been synced. Open Settings to download.',
      };
    }

    const ageMs = Date.now() - lastUpdated;
    const daysOld = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const isStale = ageMs > STALE_AFTER_MS;

    return {
      isStale,
      daysOld,
      lastUpdated,
      message: isStale
        ? `Drop data is ${daysOld} days old. Refresh in Settings when convenient.`
        : `Drop data synced ${daysOld === 0 ? 'today' : `${daysOld} day${daysOld === 1 ? '' : 's'} ago`}.`,
    };
  },

  /**
   * Wipe items + dropLocations + sync state. Call ONLY from the Settings
   * "Clear Data" button — icons will show placeholders until the next
   * successful refresh.
   */
  async clearAllData(): Promise<void> {
    await db.transaction(
      'rw',
      [db.items, db.dropLocations, db.dataSyncState],
      async () => {
        await db.items.clear();
        await db.dropLocations.clear();
        await db.dataSyncState.delete('items');
        await db.dataSyncState.delete('dropLocations');
      },
    );
    log.info('All static data cleared. Next refresh will repopulate everything.');
  },

  /** Read the ms-timestamp of the last successful dropLocations sync (or null). */
  async getLastSynced(): Promise<number | null> {
    return readSyncState('dropLocations');
  },
};
