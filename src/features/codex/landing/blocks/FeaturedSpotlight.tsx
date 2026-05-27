/**
 * FeaturedSpotlight — the museum centerpiece block.
 *
 * Three panels on wide canvases:
 *   • Art        — large image of the spotlight item
 *   • Meta       — name + classification + description + CTA
 *   • Recently   — the RecentlyAdded sub-block as a third column
 *
 * On medium/narrow canvases the Recently column drops below and then
 * everything stacks. Container queries drive the collapse so the block
 * adapts to its parent's width, not the viewport.
 *
 * Spotlight item selection — data-driven, zero maintenance:
 *   1. Query Dexie for all items that have `introduced.date` populated.
 *   2. Group by update name; pick the group whose newest date is latest.
 *   3. Within that update, keep only "presentable" categories
 *      (Warframe → Weapon → Arcane → Companion → Sentinel).
 *   4. Rotate through those items weekly (same deterministic UTC-week
 *      math as the old pool, just applied to a dynamic array).
 *   5. Fall back to the hand-curated spotlightPool when introduced data
 *      isn't available (fresh install, codex not yet synced).
 *
 * This means Featured automatically highlights the latest DE update's
 * content as soon as the 6-hourly CI codex rebuild runs. No file edits
 * needed when a new update ships.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight } from 'lucide-react';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem, ItemCategory } from '@/core/domain/tennoplanApi';
import {
  SPOTLIGHT_POOL,
  currentSpotlightIndex,
  type SpotlightPoolEntry,
} from '../spotlightPool';
import { RecentlyAdded } from './RecentlyAdded';
import styles from './FeaturedSpotlight.module.css';

// Categories worth featuring, in descending preference order.
const PRESENTABLE: ItemCategory[] = ['Warframe', 'Weapon', 'Arcane', 'Companion', 'Sentinel'];

interface FeaturedSpotlightProps {
  onSelectEntry: (entry: TennoplanItem) => void;
  /** Used by the RecentlyAdded "N more" overflow link. */
  onShowMore?:   () => void;
}

export function FeaturedSpotlight({ onSelectEntry, onShowMore }: FeaturedSpotlightProps) {
  const resolved = useLiveQuery(
    async () => resolveSpotlight(),
    [],
  );

  return (
    <section className={styles.root} aria-labelledby="codex-spotlight-label">
      <div className={styles.header}>
        <h2 id="codex-spotlight-label" className={styles.label}>
          <span className={styles.labelDot} aria-hidden="true" />
          Featured
        </h2>
        {resolved?.updateName && (
          <span className={styles.weekTag}>{resolved.updateName}</span>
        )}
      </div>

      <div className={styles.grid}>
        {resolved === undefined && (
          <div className={styles.loading}>Loading featured entry…</div>
        )}
        {resolved === null && (
          <div className={styles.unavailable}>
            Spotlight unavailable — codex is still syncing. Browse the Collections below to get started.
          </div>
        )}
        {resolved && (
          <SpotlightContent
            entry={resolved.item}
            onSelectEntry={onSelectEntry}
            onShowMore={onShowMore}
          />
        )}
      </div>
    </section>
  );
}

interface SpotlightContentProps {
  entry:         TennoplanItem;
  onSelectEntry: (entry: TennoplanItem) => void;
  onShowMore?:   () => void;
}

function SpotlightContent({ entry, onSelectEntry, onShowMore }: SpotlightContentProps) {
  const description = (entry.description ?? '')
    .replace(/<[A-Z0-9_]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const initial = entry.name.slice(0, 1).toUpperCase();

  return (
    <>
      <button
        type="button"
        className={`${styles.panel} ${styles.art}`}
        onClick={() => onSelectEntry(entry)}
        aria-label={`Open ${entry.name}`}
      >
        {entry.iconUrl
          ? <img src={entry.iconUrl} alt="" className={styles.artImage} draggable={false} />
          : <span className={styles.artFallback} aria-hidden="true">{initial}</span>}
      </button>

      <div className={styles.panel}>
        <h3 className={styles.name}>{entry.name}</h3>
        <div className={styles.subtitle}>
          <span>{entry.category}</span>
          {entry.masteryRank != null && entry.masteryRank > 0 && (
            <>
              <span className={styles.subtitleDot}>·</span>
              <span>MR {entry.masteryRank}</span>
            </>
          )}
          {entry.vaulted && (
            <>
              <span className={styles.subtitleDot}>·</span>
              <span className={styles.vaultedBadge}>Vaulted</span>
            </>
          )}
          {entry.introduced?.name && (
            <>
              <span className={styles.subtitleDot}>·</span>
              <span>{entry.introduced.name}</span>
            </>
          )}
        </div>
        <hr className={styles.rule} aria-hidden="true" />
        {description.length > 0 && (
          <p className={styles.description}>{description}</p>
        )}
        <div className={styles.action}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onSelectEntry(entry)}
          >
            Open in Codex
            <ArrowRight size={14} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className={`${styles.panel} ${styles.recent}`}>
        <RecentlyAdded onSelectEntry={onSelectEntry} onShowMore={onShowMore} />
      </div>
    </>
  );
}

// ─── Resolution ───────────────────────────────────────────────────────────────

interface SpotlightResult {
  item:        TennoplanItem;
  /** Update name shown in the header tag, e.g. "Dante Unbound". */
  updateName?: string;
}

/**
 * Primary strategy: find the most recently-introduced update in Dexie,
 * pick the best presentable item from it, rotate weekly.
 *
 * Falls back to the hand-curated pool when introduced data is absent
 * (codex not yet synced, or pre-introduced-field build in KV).
 */
async function resolveSpotlight(): Promise<SpotlightResult | null> {
  const all = await db.tennoplanItems.toArray();

  // ── Strategy 1: data-driven from introduced.date ─────────────────
  const updateResult = resolveFromUpdates(all);
  if (updateResult) return updateResult;

  // ── Strategy 2: fall back to hand-curated pool ───────────────────
  return resolveFromPool(all);
}

/**
 * Group items by update name, find the most recently-introduced update
 * that has at least one presentable item, rotate through those weekly.
 */
function resolveFromUpdates(all: TennoplanItem[]): SpotlightResult | null {
  // Build: updateName → { latestDate, presentableItems[] }
  const updates = new Map<string, { latestDate: number; items: TennoplanItem[] }>();

  for (const item of all) {
    const iso  = item.introduced?.date;
    const name = item.introduced?.name;
    if (!iso || !name) continue;
    if (!PRESENTABLE.includes(item.category)) continue;
    if (!item.iconUrl) continue;

    const t = Date.parse(iso);
    if (!Number.isFinite(t)) continue;

    const bucket = updates.get(name);
    if (!bucket) {
      updates.set(name, { latestDate: t, items: [item] });
    } else {
      bucket.items.push(item);
      if (t > bucket.latestDate) bucket.latestDate = t;
    }
  }

  if (updates.size === 0) return null;

  // Sort updates newest-first
  const sorted = [...updates.entries()].sort((a, b) => b[1].latestDate - a[1].latestDate);

  // Take the newest update with presentable items (already filtered above)
  for (const [updateName, { items }] of sorted) {
    if (items.length === 0) continue;

    // Sort alphabetically for consistency, then rotate weekly
    const pool = [...items].sort((a, b) => a.name.localeCompare(b.name));
    const idx  = currentSpotlightIndex() % pool.length;
    const item = pool[idx];
    if (!item) continue;

    return { item, updateName };
  }

  return null;
}

/**
 * Legacy fallback: walk the hand-curated SPOTLIGHT_POOL, returning the
 * first entry found in Dexie. Used when no items have introduced data.
 */
async function resolveFromPool(all: TennoplanItem[]): Promise<SpotlightResult | null> {
  const byName = new Map(all.map(it => [it.uniqueName, it]));
  const start  = currentSpotlightIndex();

  for (let i = 0; i < SPOTLIGHT_POOL.length; i++) {
    const idx:   number            = (start + i) % SPOTLIGHT_POOL.length;
    const entry: SpotlightPoolEntry | undefined = SPOTLIGHT_POOL[idx];
    if (!entry) continue;
    const item = byName.get(entry.uniqueName);
    if (item) return { item };
  }

  return null;
}
