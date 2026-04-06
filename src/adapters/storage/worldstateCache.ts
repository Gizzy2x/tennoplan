import { db } from './db';

// ---------------------------------------------------------------------------
// Internal shape stored in Dexie cache.data
// ---------------------------------------------------------------------------

interface StoredWSEntry<T> {
  data:     T;
  cachedAt: number; // ms epoch when last fetched live from API
}

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface WorldstateCacheResult<T> {
  data:      T;
  cachedAt:  number;  // when the data was last fetched from the API
  expiresAt: number;  // TTL boundary (may be in the past for stale entries)
  isExpired: boolean;
}

// ---------------------------------------------------------------------------
// Cache keys — separate namespace from legacy ascensionAdapter entries
// ---------------------------------------------------------------------------

export const WS_CACHE_KEYS = {
  nightwave:    'ws:nightwave',
  sortie:       'ws:sortie',
  archon:       'ws:archon',
  fissures:     'ws:fissures',
  cycleCetus:   'ws:cycle:cetus',
  cycleVallis:  'ws:cycle:vallis',
  cycleCambion: 'ws:cycle:cambion',
  cycleZariman: 'ws:cycle:zariman',
  cycleEarth:   'ws:cycle:earth',
} as const;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * Read a worldstate cache entry. Returns null if no entry exists.
 * Returns stale entries (isExpired: true) so callers can decide whether to
 * serve them offline while triggering a background refresh.
 */
export async function getWsCache<T>(key: string): Promise<WorldstateCacheResult<T> | null> {
  const entry = await db.cache.get(key);
  if (!entry) return null;

  const stored = entry.data as StoredWSEntry<T>;

  // Backward-compat: if the stored payload is not wrapped (legacy entry from
  // ascensionAdapter), fall back to entry.updatedAt as cachedAt.
  const cachedAt =
    stored && typeof stored === 'object' && 'cachedAt' in stored
      ? stored.cachedAt
      : entry.updatedAt;
  const data =
    stored && typeof stored === 'object' && 'data' in stored
      ? stored.data
      : (entry.data as T);

  return {
    data,
    cachedAt,
    expiresAt: entry.expiresAt,
    isExpired: entry.expiresAt < Date.now(),
  };
}

/**
 * Write a worldstate cache entry. Embeds `cachedAt` inside the payload so it
 * survives TTL expiry and can be read even after `expiresAt` has passed.
 */
export async function setWsCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const now    = Date.now();
  const stored: StoredWSEntry<T> = { data, cachedAt: now };
  await db.cache.put({
    key,
    data:      stored,
    expiresAt: now + ttlMs,
    updatedAt: now,
  });
}

/** Delete one or more worldstate cache entries (used by forceRefetch). */
export async function clearWsCache(...keys: string[]): Promise<void> {
  await db.cache.bulkDelete(keys);
}
