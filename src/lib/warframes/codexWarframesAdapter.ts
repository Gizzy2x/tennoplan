/**
 * codexWarframesAdapter — Dexie-backed view over warframes.
 *
 * Returns `TennoplanItem[]` directly rather than projecting to a category
 * shape. Warframes flow through `<CodexEntryPage entry={item}>` which
 * reads TennoplanItem fields natively, so no intermediate shape is
 * needed. (Mods have a ModEntry projection only because that shape
 * predates the codex shell.)
 *
 * Loading semantics: `undefined` while Dexie reads, `[]` when the codex
 * is empty (never synced or no warframes passed the validator). The
 * caller decides whether to show a spinner or an "empty codex" message.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';

/**
 * All warframes in the codex, sorted by display name.
 *
 * Includes base + Prime variants — the grid renders them all; filtering
 * to "Prime only" / "Base only" is a UI concern (filter chips).
 */
export function useAllWarframes(): TennoplanItem[] | undefined {
  return useLiveQuery(
    async () => {
      const rows = await db.tennoplanItems.where('category').equals('Warframe').toArray();
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
  );
}

/** Lookup one warframe by uniqueName. Returns null when not found. */
export function useWarframeByUniqueName(
  uniqueName: string | null | undefined,
): TennoplanItem | null {
  const warframes = useAllWarframes();
  const byUniqueName = useMemo(() => {
    const m = new Map<string, TennoplanItem>();
    for (const wf of warframes ?? []) m.set(wf.uniqueName, wf);
    return m;
  }, [warframes]);
  return uniqueName ? byUniqueName.get(uniqueName) ?? null : null;
}

// ─── Pure search / filter helper ──────────────────────────────────────────────

export interface WarframeSearchOpts {
  query?:    string;
  /** 'all' | 'prime' | 'base' */
  variant?:  'all' | 'prime' | 'base';
  /** Filter to specific mastery rank requirement (number) or 'all'. */
  masteryRank?: number | 'all';
}

export function filterWarframes(
  warframes: readonly TennoplanItem[],
  opts: WarframeSearchOpts,
): TennoplanItem[] {
  const { query = '', variant = 'all', masteryRank = 'all' } = opts;
  const q = query.toLowerCase().trim();
  return warframes.filter((wf) => {
    if (q && !wf.name.toLowerCase().includes(q)) return false;
    if (variant === 'prime' && !/\bPrime\b/.test(wf.name)) return false;
    if (variant === 'base'  &&  /\bPrime\b/.test(wf.name)) return false;
    if (masteryRank !== 'all' && (wf.masteryRank ?? 0) !== masteryRank) return false;
    return true;
  });
}

export function isPrimeWarframe(wf: TennoplanItem): boolean {
  return /\bPrime\b/.test(wf.name);
}
