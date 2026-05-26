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
 * Spotlight item selection lives in [spotlightPool.ts]: weekly UTC
 * rotation with a fallback walk through the pool if the picked item
 * isn't in Dexie yet (e.g. on a fresh install before the codex syncs).
 *
 * Click on the art or the CTA both fire the same `onSelectEntry`
 * callback — the parent decides whether to open a modal (mods) or a
 * full detail page (warframes / other categories).
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight } from 'lucide-react';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import {
  SPOTLIGHT_POOL,
  currentSpotlightIndex,
  type SpotlightPoolEntry,
} from '../spotlightPool';
import { RecentlyAdded } from './RecentlyAdded';
import styles from './FeaturedSpotlight.module.css';

interface FeaturedSpotlightProps {
  onSelectEntry: (entry: TennoplanItem) => void;
  /** Used by the RecentlyAdded "N more" overflow link. */
  onShowMore?:   () => void;
}

export function FeaturedSpotlight({ onSelectEntry, onShowMore }: FeaturedSpotlightProps) {
  const resolved = useLiveQuery(
    async () => resolveSpotlightFromDexie(),
    [],
  );

  const weekNum = weekOfYear(new Date());

  return (
    <section className={styles.root} aria-labelledby="codex-spotlight-label">
      <div className={styles.header}>
        <h2 id="codex-spotlight-label" className={styles.label}>
          <span className={styles.labelDot} aria-hidden="true" />
          Featured
        </h2>
        <span className={styles.weekTag}>Week {weekNum}</span>
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
  // Sanitize the description: strip `<TAG>` markers and unescape line breaks
  // from DE's worldstate text. Keep the result clamped via CSS rather than
  // truncating the string itself, so we don't lose data.
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

// ─── Selection / resolution ──────────────────────────────────────────────────

/**
 * Walk the curated pool starting at the current UTC week's index.
 * Returns the first pool entry that resolves to a TennoplanItem in
 * Dexie, or null if none are present (codex never synced).
 */
async function resolveSpotlightFromDexie(): Promise<
  { entry: SpotlightPoolEntry; item: TennoplanItem } | null
> {
  const start = currentSpotlightIndex();
  for (let i = 0; i < SPOTLIGHT_POOL.length; i++) {
    const idx = (start + i) % SPOTLIGHT_POOL.length;
    const pool = SPOTLIGHT_POOL[idx];
    if (!pool) continue;
    const item = await db.tennoplanItems.get(pool.uniqueName);
    if (item) return { entry: pool, item };
  }
  return null;
}

function weekOfYear(d: Date): number {
  // ISO week — close enough for a visual "Week N" tag, no need for the full
  // ISO calendar dance here.
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const diff = d.getTime() - start;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}
