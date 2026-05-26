/**
 * RecentlyAdded — codex entries introduced within the last 90 days.
 *
 * Reads `introduced.date` from each TennoplanItem (populated by the
 * worker enricher from WFCD's `introduced` field). Items without that
 * data are silently skipped — non-mod categories don't have it yet, so
 * the list will be mod-dominated on Phase A and broaden as coverage
 * grows.
 *
 * Sort: newest first. Cap: NUM_VISIBLE rows. Below that, a "N more"
 * link surfaces the rest — for v1 it routes to the mods browser since
 * mods carry the data; later it'll deep-link to a "Recently Added"
 * filter view.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem, ItemCategory } from '@/core/domain/tennoplanApi';
import styles from './RecentlyAdded.module.css';

const WINDOW_DAYS = 90;
const NUM_VISIBLE = 6;

const CATEGORY_TAG: Partial<Record<ItemCategory, string>> = {
  Mod:       'Mod',
  Warframe:  'WF',
  Weapon:    'Wpn',
  Companion: 'Comp',
  Sentinel:  'Snt',
  Arcane:    'Arc',
  Relic:     'Rlc',
  Resource:  'Res',
};

interface RecentlyAddedProps {
  onSelectEntry: (entry: TennoplanItem) => void;
  /** Optional jump-to-more handler. Hidden when omitted. */
  onShowMore?:   () => void;
}

export function RecentlyAdded({ onSelectEntry, onShowMore }: RecentlyAddedProps) {
  const items = useLiveQuery(
    async () => {
      const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const all    = await db.tennoplanItems.toArray();
      return all
        .filter((it) => {
          const iso = it.introduced?.date;
          if (!iso) return false;
          const t = Date.parse(iso);
          return Number.isFinite(t) && t >= cutoff;
        })
        .sort((a, b) => Date.parse(b.introduced!.date!) - Date.parse(a.introduced!.date!));
    },
    [],
  );

  const totalRecent = items?.length ?? 0;
  const visible     = items?.slice(0, NUM_VISIBLE) ?? [];
  const overflow    = Math.max(0, totalRecent - NUM_VISIBLE);

  return (
    <aside className={styles.root} aria-labelledby="codex-recent-label">
      <h2 id="codex-recent-label" className={styles.label}>Recently Added</h2>
      <div className={styles.divider} />

      {items === undefined && (
        <p className={styles.empty}>Loading…</p>
      )}
      {items && visible.length === 0 && (
        <p className={styles.empty}>Nothing new in the last 90 days.</p>
      )}

      {visible.length > 0 && (
        <div className={styles.list}>
          {visible.map((entry) => (
            <button
              key={entry.uniqueName}
              type="button"
              className={styles.row}
              onClick={() => onSelectEntry(entry)}
            >
              <span className={styles.name}>{entry.name}</span>
              <span className={styles.tag}>
                {CATEGORY_TAG[entry.category] ?? entry.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {overflow > 0 && onShowMore && (
        <button type="button" className={styles.footerLink} onClick={onShowMore}>
          {overflow} more this window →
        </button>
      )}
    </aside>
  );
}
