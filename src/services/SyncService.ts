import { db } from '../adapters/storage/db';
import { setWsCache, getWsCache, getWsTimestamp } from '../adapters/storage/worldstateCache';
import { logger } from '../core/utils/logger';

const log = logger.scope('SyncService');

const USER_INVENTORY_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// ---------------------------------------------------------------------------
// Endpoint config
// ---------------------------------------------------------------------------

const PRIMARY_URL    = '/api/worldstate';
const FALLBACK_URL   = 'https://api.warframestat.us/pc';
const PRIMARY_TIMEOUT_MS  = 3_000;  // give the Vercel proxy 3 s
const FALLBACK_TIMEOUT_MS = 8_000;  // mirror gets a bit more headroom

// ---------------------------------------------------------------------------
// LocalStorage snapshot — synchronous, instant read on cold start.
// Dexie is seeded from this before any network call so the UI never blanks.
// ---------------------------------------------------------------------------

const LS_SNAPSHOT_KEY = 'tennoplan:worldstate_snapshot';

function lsReadSnapshot(): unknown | null {
  try {
    const raw = localStorage.getItem(LS_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function lsWriteSnapshot(data: unknown): void {
  try {
    localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded — silently ignore; Dexie is the authoritative store.
  }
}

// ---------------------------------------------------------------------------
// Fetch helper with AbortController-based timeout
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Primary → fallback fetch
// Tries the Vercel proxy first. If that times out or throws, falls back to
// the public api.warframestat.us mirror directly.
// ---------------------------------------------------------------------------

type DataSource = 'Primary' | 'Fallback' | 'Cache';

interface FetchResult {
  data: unknown;
  source: DataSource;
}

async function fetchWorldstate(): Promise<FetchResult> {
  try {
    const res = await fetchWithTimeout(PRIMARY_URL, PRIMARY_TIMEOUT_MS);
    if (!res.ok) throw new Error(`Primary returned HTTP ${res.status}`);
    return { data: await res.json(), source: 'Primary' };
  } catch (primaryErr) {
    log.warn('Primary endpoint failed or timed out — switching to mirror.', primaryErr);
    const res = await fetchWithTimeout(FALLBACK_URL, FALLBACK_TIMEOUT_MS);
    if (!res.ok) throw new Error(`Mirror returned HTTP ${res.status}`);
    return { data: await res.json(), source: 'Fallback' };
  }
}

export const SyncService = {
  /**
   * The single entry-point for all worldstate network requests.
   *
   * Flow:
   *  1. Seed Dexie from LocalStorage snapshot if Dexie is cold (black-screen guard).
   *  2. Honour the 60 s anti-spam lock unless force=true.
   *  3. Try /api/worldstate (3 s timeout) → fall back to warframestat.us mirror.
   *  4. Persist to Dexie (1 h TTL) + update the LS snapshot.
   *  5. On total failure, return whatever stale data Dexie has.
   *
   * @param force - bypass the 60s anti-spam lock (for manual user-triggered refreshes)
   */
  async performSync(force = false) {
    const now = Date.now();

    // 1. Black-screen guard — seed Dexie from LS on cold start so
    //    useLiveQuery subscribers have something to render immediately.
    const existing = await getWsCache<unknown>('worldstate_master');
    if (!existing) {
      const snapshot = lsReadSnapshot();
      if (snapshot) {
        log.info('Cold start: seeding Dexie from LocalStorage snapshot. [Cache]');
        await setWsCache('worldstate_master', snapshot, 3_600_000);
      }
    }

    // 2. The 60s Lock (Anti-Spam) — skipped when force=true
    if (!force) {
      const lastSync = await getWsTimestamp('last_sync_time');
      if (lastSync && now - lastSync < 60_000) {
        log.info('Sync skipped — within 60 s lock window. Serving from Cache.');
        return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
      }
    }

    try {
      // 3. Fetch — primary first, mirror as fallback
      const { data, source } = await fetchWorldstate();

      // 4. Persist to Dexie (1 h TTL) + update the LS snapshot.
      //    All useLiveQuery subscribers auto-update — no manual invalidation needed.
      await setWsCache('worldstate_master', data, 3_600_000);
      await setWsCache('last_sync_time', now);
      lsWriteSnapshot(data);

      log.success(`Worldstate synced. Source: ${source}`);
      return data;
    } catch (error) {
      log.error('All endpoints failed — serving stale data from Cache.', error);
      return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
    }
  },

  /**
   * Gateway method for persisting user inventory from parsed EE.log.
   *
   * @param items - Array of discovered item names from LogParserService.parseLog()
   *
   * This is the ONLY place in the app that writes user_inventory to cache.
   * It ensures:
   * - Consistent TTL (24 hours)
   * - Single write path (SyncService enforces)
   * - Coordination with worldstate sync cadence
   */
  async updateUserInventory(items: string[]) {
    const now = Date.now();

    try {
      await db.cache.put({
        key: 'user_inventory',
        data: items,
        updatedAt: now,
        expiresAt: now + USER_INVENTORY_TTL,
      });
    } catch (error) {
      log.error('Failed to persist user inventory.', error);
      throw error;
    }
  },
};
