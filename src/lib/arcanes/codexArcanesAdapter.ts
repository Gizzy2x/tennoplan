/**
 * codexArcanesAdapter — Dexie-backed view over the Arcane category.
 *
 * Returns TennoplanItem[] directly. Arcanes carry levelStats (per-rank
 * stat lines, same shape as mods) and rarity; the browser exposes rarity
 * as the primary filter because Legendary arcanes (Magus / Virtuos /
 * Energize-class) are what players typically hunt.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem, ItemRarity } from '@/core/domain/tennoplanApi';

/** All arcanes in the codex, sorted by display name. */
export function useAllArcanes(): TennoplanItem[] | undefined {
  return useLiveQuery(
    async () => {
      const rows = await db.tennoplanItems
        .where('category')
        .equals('Arcane')
        .toArray();
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
  );
}

/** Lookup one arcane by uniqueName. */
export function useArcaneByUniqueName(
  uniqueName: string | null | undefined,
): TennoplanItem | null {
  const arcanes = useAllArcanes();
  const byUniqueName = useMemo(() => {
    const m = new Map<string, TennoplanItem>();
    for (const a of arcanes ?? []) m.set(a.uniqueName, a);
    return m;
  }, [arcanes]);
  return uniqueName ? byUniqueName.get(uniqueName) ?? null : null;
}

// ─── Pure search / filter helper ──────────────────────────────────────────────

export interface ArcaneSearchOpts {
  query?:  string;
  rarity?: ItemRarity | 'all';
}

export function filterArcanes(
  arcanes: readonly TennoplanItem[],
  opts: ArcaneSearchOpts,
): TennoplanItem[] {
  const { query = '', rarity = 'all' } = opts;
  const q = query.toLowerCase().trim();
  return arcanes.filter((a) => {
    if (q && !a.name.toLowerCase().includes(q)) return false;
    if (rarity !== 'all' && a.rarity !== rarity) return false;
    return true;
  });
}
