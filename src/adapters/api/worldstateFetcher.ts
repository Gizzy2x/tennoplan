/**
 * Shared worldstate fetcher — single source of truth for all adapters.
 *
 * All adapters that previously fetched from api.warframestat.us/pc/...
 * now call fetchWorldstate() and extract the relevant field. This:
 *   - Eliminates dozens of individual network requests
 *   - Stops the 404 storm from the old API endpoints
 *   - Deduplicates parallel adapter calls into one in-flight request
 *   - Stores the full packet in Dexie so adapters can read from cache
 */

import { getWsCache, setWsCache } from '../storage/worldstateCache';

const MASTER_KEY = 'worldstate_master';
const MASTER_TTL = 60_000; // 60 s

/** In-flight dedup: multiple adapters mounting at once share one fetch */
let inflight: Promise<Record<string, unknown>> | null = null;

export async function fetchWorldstate(): Promise<Record<string, unknown>> {
  // 1. Fresh Dexie cache — return immediately, no network
  const cached = await getWsCache<Record<string, unknown>>(MASTER_KEY);
  if (cached && !cached.isExpired) return cached.data;

  // 2. Stale cache — return while triggering a background re-fetch
  //    (the background fetch updates the cache; next call gets fresh data)
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch('/api/worldstate');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as Record<string, unknown>;
        await setWsCache(MASTER_KEY, data, MASTER_TTL);
        return data;
      } finally {
        inflight = null;
      }
    })();
  }

  // If we have stale data, return it now and let the inflight update in background
  if (cached) return cached.data;

  // No cache at all — wait for the live fetch
  return inflight;
}
