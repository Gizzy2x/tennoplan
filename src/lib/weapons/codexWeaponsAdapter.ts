/**
 * codexWeaponsAdapter — Dexie-backed view over the Weapon category.
 *
 * Returns `TennoplanItem[]` directly — weapons flow straight through
 * `<CodexEntryPage entry={item}>` with no intermediate projection.
 *
 * Loading semantics mirror codexWarframesAdapter:
 *   • `undefined` while Dexie reads (lets caller show a spinner stub)
 *   • `[]` when the codex resolved but produced no weapons
 *
 * Filter helper `filterWeapons` mirrors `filterWarframes`'s shape so the
 * browsers can share UX patterns; the slot taxonomy folds WFCD's
 * `productCategory` field into Primary / Secondary / Melee / Arch buckets
 * that match the in-game equipment slots.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';

/** In-game equipment slot. 'other' catches Amps, K-Drives, MechSuits, etc. */
export type WeaponSlot = 'primary' | 'secondary' | 'melee' | 'arch' | 'other';

/** All weapons in the codex, sorted by display name. */
export function useAllWeapons(): TennoplanItem[] | undefined {
  return useLiveQuery(
    async () => {
      const rows = await db.tennoplanItems
        .where('category')
        .equals('Weapon')
        .toArray();
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
  );
}

/** Lookup one weapon by uniqueName. Returns null when not found. */
export function useWeaponByUniqueName(
  uniqueName: string | null | undefined,
): TennoplanItem | null {
  const weapons = useAllWeapons();
  const byUniqueName = useMemo(() => {
    const m = new Map<string, TennoplanItem>();
    for (const w of weapons ?? []) m.set(w.uniqueName, w);
    return m;
  }, [weapons]);
  return uniqueName ? byUniqueName.get(uniqueName) ?? null : null;
}

// ─── Slot resolution ──────────────────────────────────────────────────────────

/**
 * WFCD productCategory → slot bucket.
 *
 * Source values (lifted from @wfcd/items):
 *   LongGuns       → primary
 *   Pistols        → secondary
 *   Melee          → melee
 *   SpaceGuns      → arch (Arch-Gun)
 *   SpaceMelee     → arch (Arch-Melee)
 *   SentinelWeapons / OperatorAmps / KDrives / MechSuits / Hoverboards → other
 *
 * Unknown subtypes fall through to 'other' rather than throwing — the
 * grid stays populated and the filter stays usable even when DE ships a
 * new equipment class.
 */
export function weaponSlot(entry: TennoplanItem): WeaponSlot {
  const sub = entry.subtype;
  if (!sub) return 'other';
  switch (sub) {
    case 'LongGuns':  return 'primary';
    case 'Pistols':   return 'secondary';
    case 'Melee':     return 'melee';
    case 'SpaceGuns':
    case 'SpaceMelee': return 'arch';
    default:          return 'other';
  }
}

// ─── Pure search / filter helper ──────────────────────────────────────────────

export interface WeaponSearchOpts {
  query?: string;
  slot?:  WeaponSlot | 'all';
  /** 'all' | 'prime' | 'base' */
  variant?: 'all' | 'prime' | 'base';
}

export function filterWeapons(
  weapons: readonly TennoplanItem[],
  opts: WeaponSearchOpts,
): TennoplanItem[] {
  const { query = '', slot = 'all', variant = 'all' } = opts;
  const q = query.toLowerCase().trim();
  return weapons.filter((w) => {
    if (q && !w.name.toLowerCase().includes(q)) return false;
    if (slot !== 'all' && weaponSlot(w) !== slot) return false;
    if (variant === 'prime' && !/\bPrime\b/.test(w.name)) return false;
    if (variant === 'base'  &&  /\bPrime\b/.test(w.name)) return false;
    return true;
  });
}

export function isPrimeWeapon(w: TennoplanItem): boolean {
  return /\bPrime\b/.test(w.name);
}
