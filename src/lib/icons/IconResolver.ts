/**
 * Icon resolver — pure functions, zero React, zero side-effects.
 *
 * All icons are served from the official WFCD CDN at:
 *   https://cdn.warframestat.us/img/<imageName>
 *
 * Runtime CDN is the default. For fully-offline builds, set the env var
 * VITE_USE_BAKED_ASSETS=true and run `node scripts/bake-icons.mjs` to
 * download PNGs into public/icons/warframe/ and generate baked-icons-map.json.
 */

import type { WarframeItem } from '@/core/domain/items';

const CDN_BASE = 'https://cdn.warframestat.us/img';

// Populated at build time only when VITE_USE_BAKED_ASSETS=true.
// In CDN mode this import resolves to an empty object ({}) via the fallback.
let _bakedMap: Record<string, string> | null = null;

async function getBakedMap(): Promise<Record<string, string>> {
  if (_bakedMap) return _bakedMap;
  try {
    const mod = await import('@/lib/icons/baked-icons-map.json');
    _bakedMap = mod.default as Record<string, string>;
  } catch {
    _bakedMap = {};
  }
  return _bakedMap;
}

const USE_BAKED = import.meta.env.VITE_USE_BAKED_ASSETS === 'true';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the icon URL for a given imageName filename.
 * In CDN mode (default): returns the WFCD CDN URL.
 * In baked mode: returns the local public/ path synchronously (from the cached map).
 *
 * For the synchronous component use-case, prefer `getIconUrl` which always
 * returns a CDN URL immediately. Baked paths are resolved separately.
 */
export function getIconUrl(imageName: string): string {
  return `${CDN_BASE}/${imageName}`;
}

/** Convenience overload that accepts a full WarframeItem. */
export function getIconUrlByItem(item: WarframeItem): string {
  return getIconUrl(item.imageName);
}

/**
 * Resolves the best available URL for an imageName.
 * - CDN mode: immediate CDN URL.
 * - Baked mode: local path if available, CDN fallback otherwise.
 */
export async function resolveIconUrl(imageName: string): Promise<string> {
  if (!USE_BAKED) return getIconUrl(imageName);
  const map = await getBakedMap();
  return map[imageName] ?? getIconUrl(imageName);
}

/**
 * Fallback URL when an item has no imageName.
 * Hits the warframestat.us items API thumbnail endpoint.
 * Only used as a last resort — most items have imageName.
 */
export function getFallbackIconUrl(uniqueName: string): string {
  return `https://api.warframestat.us/pc/items/${encodeURIComponent(uniqueName)}/thumbnail`;
}
