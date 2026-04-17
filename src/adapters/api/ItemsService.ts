/**
 * ItemsService — syncs warframe-drop-data into the Dexie dropLocations table.
 *
 * Mirrors SyncService's style:
 *   - AbortController-based timeout
 *   - Conditional GET via ETag
 *   - Resilient JSON parsing with stale fallback
 *   - Module-level in-flight guard for re-entrancy
 *   - Scoped logger
 *
 * Does NOT duplicate static item metadata (that lives in the build-time
 * items-map.json). Only maintains normalized drop locations + timestamps.
 *
 * Invocation model:
 *   - init()      — call once in AppShell; fires one TTL-guarded sync attempt
 *   - sync()      — TTL-guarded (24 h). Cheap to call; de-duplicated.
 *   - forceSync() — user-triggered "Refresh" button; bypasses the TTL.
 */

import { db } from '@/adapters/storage/db';
import { logger } from '@/core/utils/logger';
import { normaliseDropPayload, type RawDropPayload } from '@/core/services/dropsService';

const log = logger.scope('ItemsService');

// ─── Constants ───────────────────────────────────────────────────────────────

const DROPS_URL              = 'https://drops.warframestat.us/data/all.json';
const DROPS_ETAG_KEY         = 'drops:etag';
const DROPS_LAST_SYNC_KEY    = 'drops:lastSynced';
const DROPS_DAILY_TTL_MS     = 24 * 60 * 60 * 1000; // 24 h
const REQUEST_TIMEOUT_MS     = 30_000;              // drop payload is ~10 MB

// Module-level re-entrancy guard
let _inFlight: Promise<number | null> | null = null;

// ─── Setting helpers (ETag + lastSynced live in the settings table) ─────────

async function getSetting<T>(key: string): Promise<T | null> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : null;
}

async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value, updatedAt: Date.now() });
}

// ─── Fetch helpers (mirrors SyncService) ─────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  etag: string | null,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (etag) headers['If-None-Match'] = etag;
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

async function safeJsonFromResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text || text.trim().length === 0) throw new Error('Empty response body');
  return JSON.parse(text);
}

// ─── Core pipeline ───────────────────────────────────────────────────────────

/**
 * Returns the fetchedAt timestamp on success, or null on failure.
 * Never throws — keeps stale Dexie rows as the fallback.
 */
async function runSync(): Promise<number | null> {
  const etag = await getSetting<string>(DROPS_ETAG_KEY);

  let res: Response;
  try {
    res = await fetchWithTimeout(DROPS_URL, etag, REQUEST_TIMEOUT_MS);
  } catch (err) {
    log.error('Drops endpoint unreachable — keeping stale Dexie rows.', err);
    return null;
  }

  if (res.status === 304) {
    const now = Date.now();
    await setSetting(DROPS_LAST_SYNC_KEY, now);
    log.info('Drops unchanged (304). Rows kept; lastSynced stamp refreshed.');
    return now;
  }

  if (!res.ok) {
    log.warn(`Drops fetch returned HTTP ${res.status} — keeping stale Dexie rows.`);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = await safeJsonFromResponse(res);
  } catch (err) {
    log.error('Drops response was not valid JSON — keeping stale Dexie rows.', err);
    return null;
  }

  // Pure normalization (no Dexie, no React)
  const fetchedAt = Date.now();
  const rows = normaliseDropPayload(parsed as RawDropPayload, fetchedAt);
  if (rows.length === 0) {
    log.warn('Drops normalization produced 0 rows — aborting write to preserve existing cache.');
    return null;
  }

  // Wipe + bulkPut inside a single transaction so a failure rolls back cleanly.
  try {
    await db.transaction('rw', db.dropLocations, async () => {
      await db.dropLocations.clear();
      await db.dropLocations.bulkPut(rows);
    });
  } catch (err) {
    log.error('Failed to persist drop locations to Dexie.', err);
    return null;
  }

  const newEtag = res.headers.get('ETag');
  if (newEtag) await setSetting(DROPS_ETAG_KEY, newEtag);
  await setSetting(DROPS_LAST_SYNC_KEY, fetchedAt);

  log.success(`Drops synced — ${rows.length} locations stored.`);
  return fetchedAt;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const ItemsService = {
  /**
   * Sync if the last sync is older than 24 h. Safe to call from anywhere —
   * a single in-flight request is shared across concurrent callers.
   * Returns the fetchedAt timestamp (or the last known one on 304), or null on failure.
   */
  async sync(force = false): Promise<number | null> {
    if (_inFlight) return _inFlight;

    _inFlight = (async () => {
      try {
        if (!force) {
          const last = await getSetting<number>(DROPS_LAST_SYNC_KEY);
          if (last && Date.now() - last < DROPS_DAILY_TTL_MS) {
            const minsAgo = Math.floor((Date.now() - last) / 60_000);
            log.info(`Drops fresh (synced ${minsAgo} min ago) — skipping network.`);
            return last;
          }
        }
        return await runSync();
      } finally {
        _inFlight = null;
      }
    })();

    return _inFlight;
  },

  /** Force a refetch, bypassing the 24 h TTL. Used by a "Refresh" button in UI. */
  async forceSync(): Promise<number | null> {
    return this.sync(true);
  },

  /** Read the ms-timestamp of the last successful sync (or null if never synced). */
  async getLastSynced(): Promise<number | null> {
    return getSetting<number>(DROPS_LAST_SYNC_KEY);
  },

  /**
   * Bootstrap on app launch. Fires one TTL-guarded sync attempt.
   * No periodic polling — drop data changes ~monthly; hammering the endpoint
   * adds no value.
   */
  init(): void {
    void this.sync(false);
  },

  /** Placeholder for symmetry with SyncService. Nothing to tear down today. */
  destroy(): void {
    /* no-op */
  },
};
