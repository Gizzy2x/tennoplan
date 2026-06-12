/**
 * CodexLanding — the Codex tab's home view.
 *
 * Sections (top to bottom):
 *   1. LandingHero          — title + tagline + inline search + meta strip
 *   2. CollectionsGrid      — 7 category tiles (primary nav, lifted up)
 *   3. FeaturedSpotlight    — anchored composition (.impeccable.md §3a)
 *   4. RecentlyAdded        — high-density tiles, ModCardV3 for Mods
 *   5. ContinueBrowsing     — persisted history (hidden when empty)
 *   6. Footer               — sync metadata + Pixel-glyph bullets
 *
 * Collections sits ABOVE the spotlight so the primary navigation
 * surface is the first thing the user sees after the hero — not
 * something they have to scroll past Featured + Recently Added to
 * find. LandingSearch is now rendered inline inside LandingHero;
 * it doesn't need a full row to convey what it needs.
 *
 * Composition only. Each block owns its own data fetching, layout, and
 * states. The landing routes interactions back up: collection clicks
 * trigger sub-tab navigation, entry clicks fire onSelectEntry, the
 * RecentlyAdded "more" link advances the parent's view state.
 */

import { type RefObject } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import type { ModEntry } from '@/lib/mods/codexModsAdapter';
import type { CodexHistoryEntry } from '@/store/codexHistory';
import { LandingHero } from './blocks/LandingHero';
import { FeaturedSpotlight } from './blocks/FeaturedSpotlight';
import { RecentlyAdded } from './blocks/RecentlyAdded';
import { CollectionsGrid, type CodexCollectionKey } from './blocks/CollectionsGrid';
import { ContinueBrowsing } from './blocks/ContinueBrowsing';
import styles from './CodexLanding.module.css';

interface CodexLandingProps {
  /** Open a non-mod codex entry — routes to the full detail page. */
  onSelectEntry:      (entry: TennoplanItem) => void;
  /**
   * Open a mod via its projected ModEntry — same modal path the
   * ModsBrowser uses. RecentlyAdded calls this when a Mod-category
   * tile (now rendered as ModCardV3) is clicked, so we avoid an
   * extra Dexie round-trip + projection on the hot path.
   */
  onSelectMod:        (mod: ModEntry) => void;
  /** Re-open a history entry — resolver looks up the item from Dexie. */
  onSelectHistory:    (entry: CodexHistoryEntry) => void;
  /** Jump to a category browser (Mods / Warframes for now). */
  onSelectCollection: (key: CodexCollectionKey) => void;
  /** Used by the RecentlyAdded "N more" link — jumps to Mods browser today. */
  onShowMoreRecent?:  () => void;
  /** Handle on the search input so CodexPage's `/` shortcut can focus it. */
  searchInputRef?:    RefObject<HTMLInputElement | null>;
}

export function CodexLanding({
  onSelectEntry,
  onSelectMod,
  onSelectHistory,
  onSelectCollection,
  onShowMoreRecent,
  searchInputRef,
}: CodexLandingProps) {
  const lastSync = useLiveQuery(
    () => db.syncMetadata.get('codex').then((m) => m?.lastSync),
    [],
  );

  return (
    <div className={styles.root}>
      <div className={styles.section}>
        <LandingHero searchInputRef={searchInputRef} />
      </div>

      <div className={styles.section}>
        <CollectionsGrid onSelectCollection={onSelectCollection} />
      </div>

      {/* FeaturedSpotlight has its own borders + gradient background;
          it intentionally reads as a "band" running across the landing
          rather than another section in the gap rhythm. */}
      <div className={`${styles.section} ${styles.sectionBand}`}>
        <FeaturedSpotlight onSelectEntry={onSelectEntry} />
      </div>

      <div className={styles.section}>
        <RecentlyAdded
          onSelectEntry={onSelectEntry}
          onSelectMod={onSelectMod}
          onShowMore={onShowMoreRecent}
        />
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
      <span className={styles.footerGlyph} aria-hidden="true">▢</span>
      <span>
        Codex synced{' '}
        <span className={stale ? styles.footerStale : undefined}>{relative}</span>
      </span>
      <span className={styles.footerSep} aria-hidden="true">▢</span>
      <span>Calamity + WFCD</span>
      <span className={styles.footerSep} aria-hidden="true">▢</span>
      <span>Wiki excerpts CC BY-SA</span>
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
