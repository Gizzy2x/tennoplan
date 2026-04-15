import { db } from '../adapters/storage/db';
import { setWsCache, getWsCache, getWsEtag, setWsEtag } from '../adapters/storage/worldstateCache';
import { logger } from '../core/utils/logger';

const log = logger.scope('SyncService');

// ---------------------------------------------------------------------------
// Endpoint config
//
// Primary:  Cloudflare Worker (set VITE_WORLDSTATE_WORKER_URL in .env).
//           The Worker pulls warframestat.us once per minute via a scheduled
//           cron, stores the result in KV, and serves it to all clients.
//           At scale, 200k users = 200k cheap KV reads, not 200k upstream calls.
//
// Fallback: Direct warframestat.us — used during local dev (no Worker URL set)
//           or if the Worker itself is unreachable.
// ---------------------------------------------------------------------------

const CF_WORKER_URL   = import.meta.env.VITE_WORLDSTATE_WORKER_URL as string | undefined;
const DIRECT_URL      = 'https://api.warframestat.us/pc';
const PRIMARY_URL     = CF_WORKER_URL?.replace(/\/$/, '') ?? DIRECT_URL;
// Only add a fallback when the Worker is primary — otherwise direct IS the primary
const FALLBACK_URL    = CF_WORKER_URL ? DIRECT_URL : null;

const REQUEST_TIMEOUT_MS   = 10_000;
const USER_INVENTORY_TTL   = 24 * 60 * 60 * 1000;

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
    // Quota exceeded — Dexie is authoritative, LS is just the cold-start seed.
  }
}

// ---------------------------------------------------------------------------
// Fetch helper — AbortController timeout + optional ETag header
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

    // 304 Not Modified — data hasn't changed, skip the 2 MB parse
    if (res.status === 304) {
      return { data: null, source: 'Unchanged', etag: storedEtag };
    }

    if (!res.ok) throw new Error(`Primary returned HTTP ${res.status}`);

    return { data: await res.json(), source: sourceName, etag: res.headers.get('ETag') };
  } catch (primaryErr) {
    if (!FALLBACK_URL) throw primaryErr;

    log.warn('CF Worker unreachable — falling back to warframestat.us directly.', primaryErr);
    const res = await fetchWithTimeout(FALLBACK_URL, storedEtag, REQUEST_TIMEOUT_MS);

    if (res.status === 304) {
      return { data: null, source: 'Unchanged', etag: storedEtag };
    }

    if (!res.ok) throw new Error(`Direct fallback returned HTTP ${res.status}`);

    return { data: await res.json(), source: 'Direct', etag: res.headers.get('ETag') };
  }
}

// ---------------------------------------------------------------------------
// SyncService
// ---------------------------------------------------------------------------

export const SyncService = {
  /**
   * The single entry-point for all worldstate network requests.
   *
   * Flow:
   *  1. Seed Dexie from LocalStorage snapshot if Dexie is cold (black-screen guard).
   *  2. Load stored ETag from Dexie — sent as If-None-Match.
   *  3. If 304 Not Modified: skip parse/write, return Dexie data instantly.
   *  4. If 200 OK: persist new ETag + data to Dexie, update LS snapshot.
   *  5. On total failure: return stale Dexie data.
   *
   * Rate limiting is handled by the CF Worker (one upstream pull per minute).
   * This client does no artificial throttling — each call is cheap either way:
   * a 304 is ~200 bytes; the Worker's KV read is sub-millisecond.
   *
   * @param force - unused, kept for call-site compatibility
   */
  async performSync(_force = false) {
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

      // 3. 304 Not Modified — serve existing Dexie data, nothing to write
      if (source === 'Unchanged') {
        log.info('Worldstate unchanged (304 Not Modified). Serving from Cache.');
        return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
      }

      // 4. 200 OK — persist new data and ETag
      await setWsCache('worldstate_master', data, 3_600_000);
      if (etag) await setWsEtag(etag);
      lsWriteSnapshot(data);

      log.success(`Worldstate synced. Source: ${source}`);
      return data;
    } catch (error) {
      log.error('All endpoints failed — serving stale data from Cache.', error);
      return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
    }
  },

  /**
   * Gateway for persisting user inventory from parsed EE.log.
   * The only place in the app that writes user_inventory to cache.
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
