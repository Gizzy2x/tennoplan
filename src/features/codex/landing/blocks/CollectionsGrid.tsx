/**
 * CollectionsGrid — 7 category tiles, one per major codex domain.
 *
 * v3 rebuild (.impeccable.md §10.8 fix): the previous tiles were
 * 220×160 with a 22px icon — the canonical dead-space-with-tiny-icon
 * anti-pattern. This rebuild uses tighter horizontal tiles where the
 * icon : tile area ratio is honest, in a 7-col-friendly rail that
 * fits on a 1080p row without stretching.
 *
 * Each tile shows: icon (left anchor), name (h3 serif), count (mono
 * tabular), and a status mark — Geist Pixel-Square for Ready,
 * Pixel-Triangle for Coming Soon. Ready tiles route to the
 * corresponding browser sub-tab; Coming Soon tiles are disabled.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import {
  Sparkles, Hexagon, Crosshair, PawPrint, Archive, Gem, Boxes,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { db } from '@/adapters/storage/db';
import type { ItemCategory } from '@/core/domain/tennoplanApi';
import styles from './CollectionsGrid.module.css';

export type CodexCollectionKey =
  | 'mods' | 'warframes' | 'weapons' | 'companions' | 'relics' | 'arcanes' | 'resources';

interface CollectionDef {
  key:      CodexCollectionKey;
  name:     string;
  icon:     LucideIcon;
  /** Maps the tile to a TennoplanItem.category for the live count query. */
  category: ItemCategory;
  /** Currently-shipping (clickable) vs forthcoming (disabled). */
  ready:    boolean;
}

// NOTE: the `companions` tile counts only TennoplanItem.category === 'Companion'
// (i.e. pets), but the corresponding browser surfaces Companion + Sentinel
// together to match Warframe's in-game equipment grouping. The tile count
// therefore under-reports vs the browser's grid — that's intentional for
// landing-page legibility; the browser's own counter shows the union.
const COLLECTIONS: CollectionDef[] = [
  { key: 'mods',       name: 'Mods',       icon: Sparkles,  category: 'Mod',       ready: true  },
  { key: 'warframes',  name: 'Warframes',  icon: Hexagon,   category: 'Warframe',  ready: true  },
  { key: 'weapons',    name: 'Weapons',    icon: Crosshair, category: 'Weapon',    ready: true  },
  { key: 'companions', name: 'Companions', icon: PawPrint,  category: 'Companion', ready: true  },
  // Relics intentionally stays coming-soon — deferred for bespoke treatment
  // (see feedback_relic_rail_deferred.md in memory).
  { key: 'relics',     name: 'Relics',     icon: Archive,   category: 'Relic',     ready: false },
  { key: 'arcanes',    name: 'Arcanes',    icon: Gem,       category: 'Arcane',    ready: true  },
  { key: 'resources',  name: 'Resources',  icon: Boxes,     category: 'Resource',  ready: true  },
];

interface CollectionsGridProps {
  /** Called when a Ready tile is clicked. The parent switches view + sub-tab. */
  onSelectCollection: (key: CodexCollectionKey) => void;
}

export function CollectionsGrid({ onSelectCollection }: CollectionsGridProps) {
  return (
    <section className={styles.root} aria-labelledby="codex-collections-label">
      <header className={styles.header}>
        <h2 id="codex-collections-label" className={`typo-section-label ${styles.label}`}>
          <span className={styles.labelGlyph} aria-hidden="true">▢</span>
          Collections
        </h2>
      </header>

      <div className={styles.grid}>
        {COLLECTIONS.map((c) => (
          <CollectionTile
            key={c.key}
            collection={c}
            onClick={() => c.ready && onSelectCollection(c.key)}
          />
        ))}
      </div>
    </section>
  );
}

interface CollectionTileProps {
  collection: CollectionDef;
  onClick:    () => void;
}

function CollectionTile({ collection, onClick }: CollectionTileProps) {
  // Live count per category. db.tennoplanItems has a `category` index so
  // this is an indexed range scan, fast enough to run per tile per render.
  const count = useLiveQuery(
    () => db.tennoplanItems.where('category').equals(collection.category).count(),
    [collection.category],
    0,
  );

  const Icon      = collection.icon;
  const formatted = count > 0 ? count.toLocaleString() : '—';

  return (
    <button
      type="button"
      className={clsx(styles.tile, !collection.ready && styles['tile--soon'])}
      disabled={!collection.ready}
      onClick={onClick}
      aria-label={
        collection.ready
          ? `Open ${collection.name} — ${formatted} entries`
          : `${collection.name} — coming soon`
      }
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon size={26} strokeWidth={1.5} />
      </span>
      <div className={styles.body}>
        <h3 className={styles.name}>{collection.name}</h3>
        <p className={clsx(styles.count, count === 0 && styles['count--empty'])}>
          {formatted}
        </p>
      </div>
      <span
        className={clsx(
          styles.status,
          collection.ready ? styles['status--ready'] : styles['status--soon'],
        )}
        aria-hidden="true"
      >
        {collection.ready ? '▢' : '△'}
      </span>
    </button>
  );
}
