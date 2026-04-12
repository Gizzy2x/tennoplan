/**
 * useItemIcon — resolves a Warframe item display-name to its WFCD CDN icon URL.
 *
 * Strategy:
 *   1. Check module-level Map (survives re-renders, cleared on page reload).
 *   2. Fetch from warframestat.us items/search, grab first match's imageName.
 *   3. Build CDN URL: https://cdn.warframestat.us/img/{imageName}
 *   4. Return null while loading or on failure — callers render a letter fallback.
 *
 * Deduplication: concurrent calls for the same name share one in-flight Promise.
 */

import { useEffect, useState } from 'react';

const CDN_BASE = 'https://cdn.warframestat.us/img';

/** Resolved URLs (or null = not found). Persists for the page lifetime. */
const cache    = new Map<string, string | null>();
/** In-flight Promises so duplicate lookups share one fetch. */
const inflight = new Map<string, Promise<string | null>>();

async function resolveIcon(name: string): Promise<string | null> {
  try {
    const url = `https://api.warframestat.us/items/search/${encodeURIComponent(name)}?only=name,imageName`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;

    const items = (await res.json()) as Array<{ name?: string; imageName?: string }>;

    // Prefer an exact case-insensitive name match before falling back to [0]
    const lower = name.toLowerCase();
    const match = items.find(i => i.name?.toLowerCase() === lower) ?? items[0];
    const imageName = match?.imageName;

    return imageName ? `${CDN_BASE}/${imageName}` : null;
  } catch {
    return null;
  }
}

export function useItemIcon(name: string): string | null {
  const [url, setUrl] = useState<string | null>(() => cache.get(name) ?? null);

  useEffect(() => {
    // Already resolved
    if (cache.has(name)) {
      setUrl(cache.get(name) ?? null);
      return;
    }

    let cancelled = false;

    // Deduplicate concurrent fetches
    let promise = inflight.get(name);
    if (!promise) {
      promise = resolveIcon(name).then(result => {
        cache.set(name, result);
        inflight.delete(name);
        return result;
      });
      inflight.set(name, promise);
    }

    promise.then(result => {
      if (!cancelled) setUrl(result);
    });

    return () => { cancelled = true; };
  }, [name]);

  return url;
}
