/**
 * LandingHero — top rail of the Codex landing.
 *
 * Hosts:
 *   • Title + tagline (identity, left)
 *   • Search input    (inline, center — absorbs what used to be a
 *                      full-row LandingSearch block; the bar never
 *                      needs a dedicated line)
 *   • Meta strip      (entries · sync, right)
 *
 * The h1 sits at --density-h1 (28/24px), not the old marketing-page
 * `clamp(2.5rem, 4.4vw, 3.5rem)` scale. The whole row collapses to a
 * stacked layout on narrow canvases via container queries.
 */

import { type RefObject } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { LandingSearch } from './LandingSearch';
import styles from './LandingHero.module.css';

interface LandingHeroProps {
  /** Forwarded to LandingSearch so CodexPage's `/` shortcut can focus the bar. */
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function LandingHero({ searchInputRef }: LandingHeroProps = {}) {
  const totalEntries = useLiveQuery(() => db.tennoplanItems.count(), [], 0);
  const lastSync     = useLiveQuery(
    () => db.syncMetadata.get('codex').then((m) => m?.lastSync),
    [],
  );

  const totalFormatted = totalEntries > 0 ? totalEntries.toLocaleString() : '—';
  const syncRelative   = lastSync ? relativeTime(lastSync) : 'pending';

  return (
    <header className={styles.root}>
      <div className={styles.identity}>
        <h1 className={styles.title}>Codex</h1>
        <p className={styles.tagline}>
          Every reference for every system. Curated for clarity.
        </p>
      </div>

      <div className={styles.search}>
        <LandingSearch inputRef={searchInputRef} />
      </div>

      <dl className={styles.meta} aria-label="Codex status">
        <div className={styles.metaCell}>
          <dt className={styles.metaLabel}>Entries</dt>
          <dd className={styles.metaValue}>{totalFormatted}</dd>
        </div>
        <span className={styles.metaSep} aria-hidden="true">▢</span>
        <div className={styles.metaCell}>
          <dt className={styles.metaLabel}>Synced</dt>
          <dd className={styles.metaValue}>{syncRelative}</dd>
        </div>
      </dl>
    </header>
  );
}

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
