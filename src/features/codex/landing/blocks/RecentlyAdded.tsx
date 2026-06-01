/**
 * RecentlyAdded — codex entries introduced within the last 90 days.
 *
 * Structure (Option B — chosen 2026-05-31):
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │ ▢ RECENTLY ADDED         LAST 90 DAYS · 10      │
 *   │                                                 │
 *   │ ▢ Hotfix 42.0.6 · 3d ago                        │
 *   │ [MD][MD][MD] [WF] [WP][WP]                      │
 *   │                                                 │
 *   │ ▢ Hotfix 42.0.5 · 8d ago                        │
 *   │ [MD][MD] [AR]                                   │
 *   └─────────────────────────────────────────────────┘
 *
 *   1. Filter items to the last WINDOW_DAYS by `introduced.date`.
 *   2. Group by `introduced.name` (the WFCD update name).
 *   3. Sort groups by newest item's date — freshest update first.
 *   4. WITHIN each group, sort by category so MODS (tall ModCardV3
 *      tiles) cluster on the left and entry-tile categories follow.
 *      This collapses the ragged-bottom problem to a single step at
 *      the boundary between the mod cluster and the entry-tile
 *      cluster, instead of randomly mid-row.
 *   5. Stop adding new groups once the running item count reaches
 *      NUM_VISIBLE — never split a group mid-way, so the last
 *      visible group always appears in full.
 *
 * Tile vocabularies:
 *   • Mod entries  → ModCardV3 (expanded state, canonical mod rep)
 *   • Other items  → EntryTile (thumbnail-anchored inventory tile)
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem, ItemCategory } from '@/core/domain/tennoplanApi';
import { projectMod, type ModEntry } from '@/lib/mods/codexModsAdapter';
import { ModCardV3 } from '../../components/ModCardV3';
import styles from './RecentlyAdded.module.css';

const WINDOW_DAYS = 90;
const NUM_VISIBLE = 12;

/**
 * Category sort order within an update group. Mods first because
 * ModCardV3 is the tallest tile vocabulary — clustering them on the
 * left means the ragged bottom edge between mods and entry tiles
 * happens exactly once per group (at the cluster boundary), not
 * randomly across every row.
 */
const CATEGORY_RANK: Record<ItemCategory, number> = {
  Mod:        0,
  Warframe:   1,
  Weapon:     2,
  Companion:  3,
  Sentinel:   4,
  Arcane:     5,
  Relic:      6,
  Resource:   7,
  Blueprint:  8,
  Equipment:  9,
  Ingredient:10,
  Key:       11,
  Fish:      12,
  Sigil:     13,
  Glyph:     14,
  Cosmetic:  15,
};

/**
 * Two-letter category chip rendered in the corner of every EntryTile.
 */
const CATEGORY_TAG: Partial<Record<ItemCategory, string>> = {
  Mod:       'MD',
  Warframe:  'WF',
  Weapon:    'WP',
  Companion: 'CP',
  Sentinel:  'SN',
  Arcane:    'AR',
  Relic:     'RL',
  Resource:  'RS',
};

interface UpdateGroup {
  /** Update name from WFCD, e.g. "Hotfix 42.0.6" or "Dante Unbound". */
  name:        string;
  /** Newest item date in the group — used to sort groups newest-first. */
  newestMs:    number;
  /** Items sorted by category (mods first), then alphabetically. */
  items:       TennoplanItem[];
}

interface RecentlyAddedProps {
  onSelectEntry: (entry: TennoplanItem) => void;
  /** Same handler the ModsBrowser uses — preserves the modal route. */
  onSelectMod:   (mod: ModEntry) => void;
  /** Optional jump-to-more handler. Hidden when omitted. */
  onShowMore?:   () => void;
}

export function RecentlyAdded({ onSelectEntry, onSelectMod, onShowMore }: RecentlyAddedProps) {
  const groups = useLiveQuery(
    async (): Promise<UpdateGroup[]> => {
      const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const all    = await db.tennoplanItems.toArray();

      // 1. Filter to the time window
      const inWindow = all.filter((it) => {
        const iso = it.introduced?.date;
        if (!iso) return false;
        const t = Date.parse(iso);
        return Number.isFinite(t) && t >= cutoff;
      });

      // 2. Group by introduced.name (update name). Items without an
      //    update name fall into a synthetic "Unattributed" bucket.
      const byUpdate = new Map<string, TennoplanItem[]>();
      for (const it of inWindow) {
        const key = it.introduced?.name ?? 'Unattributed';
        const bucket = byUpdate.get(key);
        if (bucket) bucket.push(it);
        else byUpdate.set(key, [it]);
      }

      // 3. Build UpdateGroup[] — sort items within each group by
      //    category rank (mods first), then alphabetically; record
      //    the group's newest item date for the outer sort.
      const built: UpdateGroup[] = [];
      for (const [name, items] of byUpdate) {
        const sorted = items.slice().sort((a, b) => {
          const rankDiff =
            (CATEGORY_RANK[a.category] ?? 99) -
            (CATEGORY_RANK[b.category] ?? 99);
          if (rankDiff !== 0) return rankDiff;
          return a.name.localeCompare(b.name);
        });
        const newestMs = Math.max(
          ...items.map((it) => Date.parse(it.introduced!.date!)),
        );
        built.push({ name, newestMs, items: sorted });
      }

      // 4. Sort groups newest-first
      built.sort((a, b) => b.newestMs - a.newestMs);

      return built;
    },
    [],
  );

  // 5. Compute visible groups: stop once running item count reaches
  //    NUM_VISIBLE. Never split a group — the last visible group
  //    appears in full even if it pushes us a few items over the cap.
  const { visibleGroups, hiddenItemCount, totalItemCount } = useMemo(() => {
    if (!groups) {
      return { visibleGroups: [] as UpdateGroup[], hiddenItemCount: 0, totalItemCount: 0 };
    }
    const total = groups.reduce((acc, g) => acc + g.items.length, 0);
    const visible: UpdateGroup[] = [];
    let running = 0;
    for (const g of groups) {
      if (running >= NUM_VISIBLE) break;
      visible.push(g);
      running += g.items.length;
    }
    const shown = visible.reduce((acc, g) => acc + g.items.length, 0);
    return { visibleGroups: visible, hiddenItemCount: Math.max(0, total - shown), totalItemCount: total };
  }, [groups]);

  return (
    <section className={styles.root} aria-labelledby="codex-recent-label">
      <header className={styles.header}>
        <h2 id="codex-recent-label" className={`typo-section-label ${styles.label}`}>
          <span className={styles.labelGlyph} aria-hidden="true">▢</span>
          Recently Added
        </h2>
        <span className={styles.headerMeta}>
          Last {WINDOW_DAYS} days{totalItemCount > 0 && ` · ${totalItemCount.toLocaleString()}`}
        </span>
      </header>

      {groups === undefined && (
        <p className={styles.empty}>Loading…</p>
      )}
      {groups && visibleGroups.length === 0 && (
        <p className={styles.empty}>Nothing new in the last {WINDOW_DAYS} days.</p>
      )}

      {visibleGroups.map((group) => (
        <UpdateSection
          key={group.name}
          group={group}
          onSelectEntry={onSelectEntry}
          onSelectMod={onSelectMod}
        />
      ))}

      {hiddenItemCount > 0 && onShowMore && (
        <button type="button" className={styles.footerLink} onClick={onShowMore}>
          +{hiddenItemCount.toLocaleString()} more →
        </button>
      )}
    </section>
  );
}

// ─── UpdateSection ──────────────────────────────────────────────────────────

interface UpdateSectionProps {
  group:         UpdateGroup;
  onSelectEntry: (entry: TennoplanItem) => void;
  onSelectMod:   (mod: ModEntry) => void;
}

function UpdateSection({ group, onSelectEntry, onSelectMod }: UpdateSectionProps) {
  const relative = relativeTime(group.newestMs);
  return (
    <div className={styles.updateBlock}>
      <h3 className={`typo-section-label ${styles.updateLabel}`}>
        <span className={styles.updateGlyph} aria-hidden="true">▢</span>
        <span className={styles.updateName}>{group.name}</span>
        <span className={styles.updateDate}>· {relative}</span>
      </h3>

      <div className={styles.grid}>
        {group.items.map((entry) => {
          if (entry.category === 'Mod') {
            const mod = projectMod(entry);
            return (
              <div key={entry.uniqueName} className={styles.modSlot}>
                <ModCardV3
                  mod={mod}
                  state="expanded"
                  size="grid"
                  onClick={() => onSelectMod(mod)}
                />
              </div>
            );
          }
          return (
            <EntryTile
              key={entry.uniqueName}
              entry={entry}
              onSelect={() => onSelectEntry(entry)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── EntryTile (unchanged) ───────────────────────────────────────────────────

interface EntryTileProps {
  entry:    TennoplanItem;
  onSelect: () => void;
}

function EntryTile({ entry, onSelect }: EntryTileProps) {
  const initial = entry.name.slice(0, 1).toUpperCase();
  const tag     = CATEGORY_TAG[entry.category] ?? entry.category.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      className={styles.tile}
      onClick={onSelect}
      aria-label={`Open ${entry.name} (${entry.category})`}
      title={entry.name}
    >
      <span className={styles.thumb} aria-hidden="true">
        {entry.iconUrl
          ? <img src={entry.iconUrl} alt="" loading="lazy" decoding="async" draggable={false} />
          : <span className={styles.thumbFallback}>{initial}</span>}
        <span className={styles.tag}>{tag}</span>
      </span>
      <span className={styles.name}>{entry.name}</span>
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diffMs  = Date.now() - ts;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7)     return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}
