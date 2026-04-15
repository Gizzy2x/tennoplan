/**
 * useDropRates — fetches and caches the full Warframe drop table.
 *
 * Data source: https://drops.warframestat.us/data/all.json
 * Cached in Dexie (key: "drop:all", 24-hour TTL) so the user never
 * re-fetches the ~10 MB payload on every page load.
 *
 * The hook returns the normalised AllDropData object plus helpers for
 * looking up drops by item name or location.
 *
 * Call it once at the page level and pass lookup results down as props,
 * rather than calling it per-card (the data is shared module-level anyway).
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/adapters/storage/db';
import {
  DROPS_API_URL,
  DROP_CACHE_KEY,
  DROP_CACHE_TTL,
  normalisePayload,
  findDropsByItem,
  findDropsByLocation,
  findRelicDropsByItem,
  type AllDropData,
  type DropLocation,
} from '@/core/services/dropRateService';

// ─── Module-level in-flight guard ─────────────────────────────────────────────
// Prevents duplicate network requests when multiple components mount at once.
let _inFlight: Promise<AllDropData | null> | null = null;

async function fetchAndCache(): Promise<AllDropData | null> {
  if (_inFlight) return _inFlight;

  _inFlight = (async () => {
    try {
      // Serve from Dexie cache first (24 h TTL)
      const cached = await db.cache.get(DROP_CACHE_KEY);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as AllDropData;
      }

      // Cache miss or expired — fetch fresh
      const res = await fetch(DROPS_API_URL, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) {
        // Serve stale cache rather than crashing
        if (cached) return cached.data as AllDropData;
        return null;
      }

      const raw = await res.json();
      const data = normalisePayload(raw, Date.now());

      await db.cache.put({
        key:       DROP_CACHE_KEY,
        data,
        expiresAt: Date.now() + DROP_CACHE_TTL,
        updatedAt: Date.now(),
      });

      return data;
    } catch {
      // Network error — serve stale data if available
      const cached = await db.cache.get(DROP_CACHE_KEY);
      return cached ? (cached.data as AllDropData) : null;
    } finally {
      _inFlight = null;
    }
  })();

  return _inFlight;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDropRatesResult {
  data:            AllDropData | null;
  isLoading:       boolean;
  isError:         boolean;
  /** Call to force re-fetch (bypasses cache). */
  refetch:         () => void;
  /** Convenience: find all locations where an item drops (case-insensitive). */
  dropsForItem:    (itemName: string) => DropLocation[];
  /** Convenience: find relic locations where an item drops, sorted by chance. */
  relicsForItem:   (itemName: string) => DropLocation[];
  /** Convenience: find all drops at a specific named location. */
  dropsAtLocation: (locationName: string) => DropLocation | null;
}

export function useDropRates(): UseDropRatesResult {
  const [data,      setData]      = useState<AllDropData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError,   setIsError]   = useState(false);
  const [fetchKey,  setFetchKey]  = useState(0);  // increment to trigger re-fetch

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    fetchAndCache().then(result => {
      if (cancelled) return;
      setData(result);
      setIsLoading(false);
      if (!result) setIsError(true);
    });

    return () => { cancelled = true; };
  }, [fetchKey]);

  const refetch = useCallback(() => {
    // Clear cache entry so next fetchAndCache skips the TTL check
    db.cache.delete(DROP_CACHE_KEY).then(() => setFetchKey(k => k + 1));
  }, []);

  const dropsForItem    = useCallback((item: string)     => data ? findDropsByItem(data, item)      : [], [data]);
  const relicsForItem   = useCallback((item: string)     => data ? findRelicDropsByItem(data, item) : [], [data]);
  const dropsAtLocation = useCallback((loc:  string)     => data ? findDropsByLocation(data, loc)   : null, [data]);

  return { data, isLoading, isError, refetch, dropsForItem, relicsForItem, dropsAtLocation };
}
