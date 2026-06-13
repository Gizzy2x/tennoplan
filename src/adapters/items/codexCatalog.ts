/**
 * codexCatalog — codex-first item lookups (name / uniqueName → item).
 *
 * The authoritative, CURRENT replacement for `itemsAdapter`: backed by the live
 * codex (`db.tennoplanItems`, auto-updated every 6h), cached in memory, primed
 * on boot and rebuilt when the codex row count changes (after a sync). Falls
 * back to the frozen `items-map` (via `itemsAdapter`) for the cosmetic long tail
 * the codex doesn't carry (Skins/Glyphs/Sigils/…) and for the brief pre-prime
 * window on first launch.
 *
 * Resolution order (everywhere): codex → items-map fallback → undefined.
 *
 * This module is the SOLE intended consumer of `itemsAdapter` (the frozen
 * fallback layer). New code should resolve through here, never import
 * `itemsAdapter` directly. Synchronous API so render-path consumers can call it
 * inline — returns the items-map fallback until the codex cache is primed.
 *
 * Distinct from `dropResolverAdapter` (which keeps owning bounty drop
 * resolution); kept separate to avoid a god-object.
 */

import { db } from '@/adapters/storage/db';
import {
  findByName as legacyFindByName,
  findByUniqueName as legacyFindByUniqueName,
} from '@/adapters/items/itemsAdapter';
import { getIconUrl } from '@/lib/icons/IconResolver';
import type { WarframeItem } from '@/core/domain/items';

export interface CatalogItem {
  uniqueName: string;
  name:       string;
  category:   string;
  /** Resolved CDN/local icon URL. '' when the codex row carries no icon
   *  (synthesized items) — render by `uniqueName` so ItemIcon can chain to its
   *  own fallbacks. */
  iconUrl:    string;
}

interface Cache {
  count:        number;
  byUniqueName: Map<string, CatalogItem>;
  byName:       Map<string, CatalogItem>;   // key = name.toLowerCase()
}

let cache: Cache | null = null;

/** Map a frozen items-map row into the shared shape (resolving its imageName). */
function fromLegacy(w: WarframeItem | undefined): CatalogItem | undefined {
  if (!w) return undefined;
  return {
    uniqueName: w.uniqueName,
    name:       w.name,
    category:   w.category as string,
    iconUrl:    w.imageName ? getIconUrl(w.imageName) : '',
  };
}

async function build(): Promise<Cache> {
  const count = await db.tennoplanItems.count();
  if (cache && cache.count === count) return cache;

  const byUniqueName = new Map<string, CatalogItem>();
  const byName       = new Map<string, CatalogItem>();
  if (count > 0) {
    const rows = await db.tennoplanItems.toArray();
    for (const r of rows) {
      const item: CatalogItem = {
        uniqueName: r.uniqueName,
        name:       r.name,
        category:   r.category,
        iconUrl:    r.iconUrl,
      };
      byUniqueName.set(r.uniqueName, item);
      byName.set(r.name.toLowerCase(), item);   // last wins (matches itemsAdapter)
    }
  }
  cache = { count, byUniqueName, byName };
  return cache;
}

/** Prime/refresh the codex index. Call on boot and after each codex sync. */
export async function primeCodexCatalog(): Promise<void> {
  await build();
}

/** Codex-first, items-map fallback. */
export function findByName(name: string): CatalogItem | undefined {
  return cache?.byName.get(name.toLowerCase()) ?? fromLegacy(legacyFindByName(name));
}

/** Codex-first, items-map fallback. */
export function findByUniqueName(uniqueName: string): CatalogItem | undefined {
  return cache?.byUniqueName.get(uniqueName) ?? fromLegacy(legacyFindByUniqueName(uniqueName));
}

/** Test/maintenance hook — drop the cached index. */
export function clearCodexCatalogCache(): void {
  cache = null;
}
