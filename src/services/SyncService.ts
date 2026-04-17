import { db } from '../adapters/storage/db';
import { setWsCache, getWsCache, getWsEtag, setWsEtag } from '../adapters/storage/worldstateCache';
import { logger } from '../core/utils/logger';
import { useHeartbeatStore } from '../store/heartbeat';

const log = logger.scope('SyncService');

// ---------------------------------------------------------------------------
// Endpoint config
// ---------------------------------------------------------------------------

const CF_WORKER_URL   = import.meta.env.VITE_WORLDSTATE_WORKER_URL as string | undefined;
const DIRECT_URL      = 'https://api.warframestat.us/pc/';
const PRIMARY_URL     = CF_WORKER_URL?.replace(/\/$/, '') ?? DIRECT_URL;
const FALLBACK_URL    = CF_WORKER_URL ? DIRECT_URL : null;

const REQUEST_TIMEOUT_MS        = 10_000;
const USER_INVENTORY_TTL        = 24 * 60 * 60 * 1000;
const PASSIVE_SYNC_COOLDOWN_MS  = 60_000;
const POLL_INTERVAL_MS          = 60_000;

// Module-level state
let _lastPassiveSyncAt = 0;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _visibilityHandler: (() => void) | null = null;

// ---------------------------------------------------------------------------
// LocalStorage snapshot
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
    // Quota exceeded — Dexie is authoritative, LS is just the cold-start seed.
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

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

/**
 * Safe text-based JSON parse.
 * Guards against empty bodies and partial responses that produce
 * "Unexpected end of JSON input" when calling res.json() directly.
 */
async function safeJsonFromResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text || text.trim().length === 0) {
    throw new Error('Empty response body');
  }
  return JSON.parse(text); // SyntaxError propagates with useful message
}

// ---------------------------------------------------------------------------
// Fetch with primary → fallback and ETag support
// ---------------------------------------------------------------------------

type DataSource = 'Worker' | 'Direct' | 'Unchanged';

interface FetchResult {
  data:   unknown;
  source: DataSource;
  etag:   string | null;
}

async function fetchWorldstate(storedEtag: string | null): Promise<FetchResult> {
  const sourceName: DataSource = CF_WORKER_URL ? 'Worker' : 'Direct';

  try {
    const res = await fetchWithTimeout(PRIMARY_URL, storedEtag, REQUEST_TIMEOUT_MS);

    if (res.status === 304) {
      return { data: null, source: 'Unchanged', etag: storedEtag };
    }

    if (!res.ok) throw new Error(`Primary returned HTTP ${res.status}`);

    return { data: await safeJsonFromResponse(res), source: sourceName, etag: res.headers.get('ETag') };
  } catch (primaryErr) {
    if (!FALLBACK_URL) throw primaryErr;

    log.warn('CF Worker unreachable — falling back to warframestat.us directly.', primaryErr);
    const res = await fetchWithTimeout(FALLBACK_URL, storedEtag, REQUEST_TIMEOUT_MS);

    if (res.status === 304) {
      return { data: null, source: 'Unchanged', etag: storedEtag };
    }

    if (!res.ok) throw new Error(`Direct fallback returned HTTP ${res.status}`);

    return { data: await safeJsonFromResponse(res), source: 'Direct', etag: res.headers.get('ETag') };
  }
}

// ---------------------------------------------------------------------------
// SyncService
// ---------------------------------------------------------------------------

export const SyncService = {
  /**
   * The single entry-point for all worldstate network requests.
   *
   * Always updates the heartbeat store with the true outcome:
   *   live    — fresh data from network (200 or 304 confirmed current)
   *   cached  — network failed, serving stale Dexie data
   *   offline — network failed AND no local cache exists
   */
  async performSync(_force = false) {
    const hb = useHeartbeatStore.getState();

    // 1. Black-screen guard — seed Dexie from LS on cold start
    const existing = await getWsCache<unknown>('worldstate_master');
    if (!existing) {
      const snapshot = lsReadSnapshot();
      if (snapshot) {
        log.info('Cold start: seeding Dexie from LocalStorage snapshot.');
        await setWsCache('worldstate_master', snapshot, 3_600_000);
      }
    }

    // 2. Load stored ETag for conditional GET
    const storedEtag = await getWsEtag();

    try {
      const { data, source, etag } = await fetchWorldstate(storedEtag);

      // 3. 304 Not Modified — serve existing Dexie data; still counts as a live sync
      if (source === 'Unchanged') {
        log.info('Worldstate unchanged (304 Not Modified). Serving from Cache.');
        hb.setSync('live', Date.now());
        return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
      }

      // 4. 200 OK — persist new data and ETag
      await setWsCache('worldstate_master', data, 3_600_000);
      if (etag) await setWsEtag(etag);
      lsWriteSnapshot(data);

      log.success(`Worldstate synced. Source: ${source}`);
      hb.setSync('live', Date.now());
      return data;

    } catch (error) {
      log.error('All endpoints failed — serving stale data from Cache.', error);

      // Update heartbeat to reflect the true state (stale cache or no data)
      const cache = await getWsCache<unknown>('worldstate_master');
      if (cache) {
        hb.setSync('cached', cache.cachedAt);
      } else {
        hb.setSync('offline');
      }

      return cache?.data ?? null;
    }
  },

  /**
   * Rate-limited passive sync nudge — safe to call on every clock tick.
   * Triggered when a fissure/invasion/alert hits 00:00:00.
   */
  requestPassiveSync() {
    const now = Date.now();
    if (now - _lastPassiveSyncAt < PASSIVE_SYNC_COOLDOWN_MS) return;
    _lastPassiveSyncAt = now;
    log.info('Passive sync triggered by expiration event.');
    void this.performSync(false);
  },

  /**
   * Bootstrap the autonomous polling engine. Call exactly once in AppShell.
   *
   * - Fires an immediate sync on call.
   * - Polls every 60 s while the tab is visible.
   * - Pauses the interval when the tab is hidden.
   * - On tab re-focus: fires an immediate resync, then restarts the 60 s loop.
   */
  init() {
    // Immediate first sync
    void this.performSync(false);

    const startPoll = () => {
      _pollTimer = setInterval(() => {
        void SyncService.performSync(false);
      }, POLL_INTERVAL_MS);
    };

    startPoll();

    _visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Tab regained focus — immediate resync burst, restart poll loop
        if (_pollTimer) clearInterval(_pollTimer);
        void SyncService.performSync(false);
        startPoll();
      } else {
        // Tab hidden — pause poll to spare resources
        if (_pollTimer) {
          clearInterval(_pollTimer);
          _pollTimer = null;
        }
      }
    };

    document.addEventListener('visibilitychange', _visibilityHandler);
    log.info('SyncService polling engine started (60 s interval).');
  },

  /**
   * Tear down the polling engine. Call in AppShell cleanup.
   */
  destroy() {
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
    if (_visibilityHandler) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
      _visibilityHandler = null;
    }
    log.info('SyncService polling engine stopped.');
  },

  /**
   * Gateway for persisting user inventory from parsed EE.log.
   */
  async updateUserInventory(items: string[]) {
    const now = Date.now();
    try {
      await db.cache.put({
        key:       'user_inventory',
        data:      items,
        updatedAt: now,
        expiresAt: now + USER_INVENTORY_TTL,
      });
    } catch (error) {
      log.error('Failed to persist user inventory.', error);
      throw error;
    }
  },
};
