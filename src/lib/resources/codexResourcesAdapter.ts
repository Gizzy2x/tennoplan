/**
 * codexResourcesAdapter — Dexie-backed view over the Resource category.
 *
 * Resources are crafting materials and farming targets — Orokin Cells,
 * Argon Crystals, Neural Sensors, Forma BPs, planet-specific drops, etc.
 *
 * The browser is search-first because the resource catalogue is broad
 * and lookups dominate browsing. A rarity filter handles the secondary
 * use case ("find me all the rare resources I should be farming"); the
 * rarity field is populated upstream from the drop-table inference in
 * the worker enricher.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem, ItemRarity } from '@/core/domain/tennoplanApi';

/** All resources in the codex, sorted by display name. */
export function useAllResources(): TennoplanItem[] | undefined {
  return useLiveQuery(
    async () => {
      const rows = await db.tennoplanItems
        .where('category')
        .equals('Resource')
        .toArray();
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
  );
}

/** Lookup one resource by uniqueName. */
export function useResourceByUniqueName(
  uniqueName: string | null | undefined,
): TennoplanItem | null {
  const resources = useAllResources();
  const byUniqueName = useMemo(() => {
    const m = new Map<string, TennoplanItem>();
    for (const r of resources ?? []) m.set(r.uniqueName, r);
    return m;
  }, [resources]);
  return uniqueName ? byUniqueName.get(uniqueName) ?? null : null;
}

// ─── Pure search / filter helper ──────────────────────────────────────────────

export interface ResourceSearchOpts {
  query?:  string;
  rarity?: ItemRarity | 'all';
}

export function filterResources(
  resources: readonly TennoplanItem[],
  opts: ResourceSearchOpts,
): TennoplanItem[] {
  const { query = '', rarity = 'all' } = opts;
  const q = query.toLowerCase().trim();
  return resources.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (rarity !== 'all' && r.rarity !== rarity) return false;
    return true;
  });
}
