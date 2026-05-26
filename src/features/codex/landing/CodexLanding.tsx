/**
 * CodexLanding — the Codex tab's home view.
 *
 * Sections (top to bottom):
 *   1. LandingHero          — title + tagline
 *   2. LandingSearch        — global search promise (engine arrives later)
 *   3. FeaturedSpotlight    — weekly rotating item + RecentlyAdded column
 *   4. CollectionsGrid      — 7 category tiles
 *   5. ContinueBrowsing     — persisted history (hidden when empty)
 *   6. Footer               — sync metadata
 *
 * Composition only. Each block owns its own data fetching, layout, and
 * states. The landing routes interactions back up: collection clicks
 * trigger sub-tab navigation, entry clicks fire onSelectEntry, the
 * RecentlyAdded "more" link advances the parent's view state.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import type { CodexHistoryEntry } from '@/store/codexHistory';
import { LandingHero } from './blocks/LandingHero';
import { LandingSearch } from './blocks/LandingSearch';
import { FeaturedSpotlight } from './blocks/FeaturedSpotlight';
import { CollectionsGrid, type CodexCollectionKey } from './blocks/CollectionsGrid';
import { ContinueBrowsing } from './blocks/ContinueBrowsing';
import styles from './CodexLanding.module.css';

interface CodexLandingProps {
  /** Open a codex entry — routes to modal (mods) or detail page (others). */
  onSelectEntry:      (entry: TennoplanItem) => void;
  /** Re-open a history entry — resolver looks up the item from Dexie. */
  onSelectHistory:    (entry: CodexHistoryEntry) => void;
  /** Jump to a category browser (Mods / Warframes for now). */
  onSelectCollection: (key: CodexCollectionKey) => void;
  /** Used by the RecentlyAdded "N more" link — jumps to Mods browser today. */
  onShowMoreRecent?:  () => void;
}

export function CodexLanding({
  onSelectEntry,
  onSelectHistory,
  onSelectCollection,
  onShowMoreRecent,
}: CodexLandingProps) {
  const lastSync = useLiveQuery(
    () => db.syncMetadata.get('codex').then((m) => m?.lastSync),
    [],
  );

  return (
    <div className={styles.root}>
      <div className={styles.section}>
        <LandingHero />
      </div>

      <div className={styles.section}>
        <LandingSearch />
      </div>

      <div className={styles.section}>
        <FeaturedSpotlight
          onSelectEntry={onSelectEntry}
          onShowMore={onShowMoreRecent}
        />
      </div>

      <div className={styles.section}>
        <CollectionsGrid onSelectCollection={onSelectCollection} />
      </div>

      <div className={styles.section}>
        <ContinueBrowsing onSelectEntry={onSelectHistory} />
      </div>

      <div className={styles.section}>
        <LandingFooter lastSync={lastSync} />
      </div>
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

interface LandingFooterProps {
  lastSync: number | undefined;
}

function LandingFooter({ lastSync }: LandingFooterProps) {
  const STALE_MS = 7 * 24 * 60 * 60 * 1000;
  const relative = lastSync ? relativeTime(lastSync) : 'never';
  const stale    = lastSync ? Date.now() - lastSync > STALE_MS : true;

  return (
    <footer className={styles.footer}>
      <span>
        Codex synced{' '}
        <span className={stale ? styles.footerStale : undefined}>{relative}</span>
      </span>
      <span className={styles.footerDot}>·</span>
      <span>Calamity + WFCD</span>
      <span className={styles.footerDot}>·</span>
      <span>Wiki excerpts when present are CC BY-SA</span>
    </footer>
  );
}

function relativeTime(ts: number): string {
  const diffMs  = Date.now() - ts;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1)        return 'just now';
  if (minutes < 60)       return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24)         return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7)           return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}
