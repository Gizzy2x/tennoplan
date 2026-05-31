/**
 * codexCompanionsAdapter — Dexie-backed view over Companion + Sentinel.
 *
 * Warframe's in-game "Companions" equipment tab groups Pets and Sentinels
 * together, so the codex follows suit: one Collections tile, one browser,
 * with a filter chip to scope down. The underlying TennoplanItem categories
 * remain distinct ('Companion' for pets, 'Sentinel' for sentinels) — the
 * adapter does the union here so consumers see a single sorted list.
 *
 * Loading semantics:
 *   • `undefined` while either query is still resolving
 *   • `[]` when both categories are empty (codex not synced yet)
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';

export type CompanionKind = 'pet' | 'sentinel';

/**
 * All companions in the codex — Pets and Sentinels combined, sorted by
 * display name. The `category` field on each row preserves the distinction
 * so filtering and the rail dispatch still see the original category.
 */
export function useAllCompanions(): TennoplanItem[] | undefined {
  return useLiveQuery(
    async () => {
      // Dexie's where().anyOf() runs as an indexed multi-equals scan,
      // so this is two index hits rather than a full-table sweep.
      const rows = await db.tennoplanItems
        .where('category')
        .anyOf('Companion', 'Sentinel')
        .toArray();
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
  );
}

/** Lookup one companion (pet or sentinel) by uniqueName. */
export function useCompanionByUniqueName(
  uniqueName: string | null | undefined,
): TennoplanItem | null {
  const companions = useAllCompanions();
  const byUniqueName = useMemo(() => {
    const m = new Map<string, TennoplanItem>();
    for (const c of companions ?? []) m.set(c.uniqueName, c);
    return m;
  }, [companions]);
  return uniqueName ? byUniqueName.get(uniqueName) ?? null : null;
}

export function companionKind(entry: TennoplanItem): CompanionKind {
  return entry.category === 'Sentinel' ? 'sentinel' : 'pet';
}

// ─── Pure search / filter helper ──────────────────────────────────────────────

export interface CompanionSearchOpts {
  query?: string;
  kind?:  CompanionKind | 'all';
  /** 'all' | 'prime' | 'base'. Helios Prime / Kavasa Prime collar exist. */
  variant?: 'all' | 'prime' | 'base';
}

export function filterCompanions(
  companions: readonly TennoplanItem[],
  opts: CompanionSearchOpts,
): TennoplanItem[] {
  const { query = '', kind = 'all', variant = 'all' } = opts;
  const q = query.toLowerCase().trim();
  return companions.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (kind !== 'all' && companionKind(c) !== kind) return false;
    if (variant === 'prime' && !/\bPrime\b/.test(c.name)) return false;
    if (variant === 'base'  &&  /\bPrime\b/.test(c.name)) return false;
    return true;
  });
}
