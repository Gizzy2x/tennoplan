import { db } from './db';

// ---------------------------------------------------------------------------
// Cache key constants — shared by SyncService, legacy adapters, feature hooks
// ---------------------------------------------------------------------------

// ETag key — stored alongside worldstate data for conditional GET requests.
export const WS_ETAG_KEY = 'worldstate:etag';

export const WS_CACHE_KEYS = {
  nightwave:         'ws:nightwave',
  sortie:            'ws:sortie',
  archon:            'ws:archon',
  fissures:          'ws:fissures',
  cycleCetus:        'ws:cycle:cetus',
  cycleVallis:       'ws:cycle:vallis',
  cycleCambion:      'ws:cycle:cambion',
  cycleZariman:      'ws:cycle:zariman',
  cycleEarth:        'ws:cycle:earth',
  cycleDuviri:       'ws:cycle:duviri',
  syndicateMissions: 'ws:syndicateMissions',
  simaris:           'ws:simaris',
  invasions:         'ws:invasions',
  alerts:            'ws:alerts',
  darvoDeals:        'ws:darvoDeals',
  voidTrader:        'ws:voidTrader',
  steelPath:         'ws:steelPath',
  persistentEnemies: 'ws:persistentEnemies',
  news:              'ws:news',
} as const;

// ---------------------------------------------------------------------------
// Result type (used by feature hooks — do NOT remove)
// ---------------------------------------------------------------------------

export interface WorldstateCacheResult<T> {
  data:      T;
  cachedAt:  number;
  expiresAt: number;
  isExpired: boolean;
}

// ---------------------------------------------------------------------------
// Read
// Returns null if no entry exists. Returns stale entries (isExpired: true) so
// callers can decide whether to serve them offline while triggering a refresh.
// ---------------------------------------------------------------------------

export async function getWsCache<T>(key: string): Promise<WorldstateCacheResult<T> | null> {
  const entry = await db.cache.get(key);
  if (!entry) return null;
  return {
    data:      entry.data as T,
    cachedAt:  entry.updatedAt,
    expiresAt: entry.expiresAt,
    isExpired: entry.expiresAt < Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Write
// ttlMs defaults to 24 hours so SyncService can omit it; legacy adapters that
// pass an explicit TTL continue to work unchanged.
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 86_400_000; // 24 h

export async function setWsCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  const now = Date.now();
  await db.cache.put({
    key,
    data:      data as unknown,
    expiresAt: now + ttlMs,
    updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// Delete (used by feature hook forceRefetch callbacks)
// ---------------------------------------------------------------------------

export async function clearWsCache(...keys: string[]): Promise<void> {
  await db.cache.bulkDelete(keys);
}

// ---------------------------------------------------------------------------
// Timestamp helper — reads updatedAt regardless of TTL expiry.
// ---------------------------------------------------------------------------

export async function getWsTimestamp(key: string): Promise<number> {
  const entry = await db.cache.get(key);
  return entry ? entry.updatedAt : 0;
}

// ---------------------------------------------------------------------------
// ETag helpers — used by SyncService for conditional GET (If-None-Match).
// Storing in Dexie means the ETag survives page reloads and app restarts,
// so we skip the 2 MB download whenever the worldstate hasn't changed.
// ---------------------------------------------------------------------------

export async function getWsEtag(): Promise<string | null> {
  const entry = await db.cache.get(WS_ETAG_KEY);
  return entry ? (entry.data as string) : null;
}

export async function setWsEtag(etag: string): Promise<void> {
  const now = Date.now();
  await db.cache.put({
    key:       WS_ETAG_KEY,
    data:      etag,
    expiresAt: now + 86_400_000, // 24 h — refreshed on every successful sync
    updatedAt: now,
  });
}
