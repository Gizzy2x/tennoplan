/**
 * useItemIcon — resolves a Warframe item display-name to its CDN icon URL.
 *
 * This is the canonical version. The one in celestial-pendulum/hooks/ is a
 * legacy copy — import from here instead.
 *
 * Strategy:
 *   1. Module-level Map (survives re-renders, cleared on page reload).
 *   2. Fetch warframestat.us items/search, grab first exact-name match.
 *   3. Build CDN URL via IconResolver.getIconUrl (single source of CDN base).
 *   4. Returns null while loading or on failure — callers render a letter fallback.
 *
 * Deduplication: concurrent calls for the same name share one in-flight Promise.
 */

import { useEffect, useState } from 'react';
import { getIconUrl, getFallbackIconUrl } from '@/lib/icons/IconResolver';

/** Resolved URLs (or null = not found). Persists for the page lifetime. */
const _cache    = new Map<string, string | null>();
/** In-flight Promises so duplicate lookups share one fetch. */
const _inflight = new Map<string, Promise<string | null>>();

async function resolveIcon(name: string): Promise<string | null> {
  try {
    const url = `https://api.warframestat.us/items/search/${encodeURIComponent(name)}?only=name,imageName,uniqueName`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;

    const items = (await res.json()) as Array<{
      name?:       string;
      imageName?:  string;
      uniqueName?: string;
    }>;

    // Prefer an exact case-insensitive name match before falling back to [0]
    const lower = name.toLowerCase();
    const match = items.find(i => i.name?.toLowerCase() === lower) ?? items[0];

    if (match?.imageName) {
      // Use IconResolver so CDN base is defined in exactly one place
      return getIconUrl(match.imageName);
    }
    if (match?.uniqueName) {
      // Last resort: thumbnail endpoint via IconResolver
      return getFallbackIconUrl(match.uniqueName);
    }
    return null;
  } catch {
    return null;
  }
}

export function useItemIcon(name: string): string | null {
  const [url, setUrl] = useState<string | null>(() => _cache.get(name) ?? null);

  useEffect(() => {
    // Already resolved
    if (_cache.has(name)) {
      setUrl(_cache.get(name) ?? null);
      return;
    }

    let cancelled = false;

    // Deduplicate concurrent fetches
    let promise = _inflight.get(name);
    if (!promise) {
      promise = resolveIcon(name).then(result => {
        _cache.set(name, result);
        _inflight.delete(name);
        return result;
      });
      _inflight.set(name, promise);
    }

    promise.then(result => {
      if (!cancelled) setUrl(result);
    });

    return () => { cancelled = true; };
  }, [name]);

  return url;
}
