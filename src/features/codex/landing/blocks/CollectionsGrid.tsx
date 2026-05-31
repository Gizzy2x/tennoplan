/**
 * CollectionsGrid — 7 category tiles, one per major codex domain.
 *
 * Each tile shows: icon, category name, total item count (gold), and a
 * Ready/Coming Soon status pill. Ready tiles route to the corresponding
 * browser sub-tab; Coming Soon tiles are disabled but kept visible so
 * the codex's planned scope is honestly represented.
 *
 * Counts are read live from Dexie via a single category-keyed query
 * per tile. The codex index makes these O(1)-ish, and useLiveQuery
 * keeps them current as the codex syncs.
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
  /** Currently-shipping (clickable) vs forthcoming (disabled) — keeps the */
  /* "Coming Soon" promise honest as new browsers come online. */
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
  // Relics intentionally stays coming-soon — deferred for a bespoke
  // treatment (see feedback_relic_rail_deferred.md in memory).
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
      <h2 id="codex-collections-label" className={styles.label}>Collections</h2>
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

  const Icon = collection.icon;
  const formatted = count > 0 ? count.toLocaleString() : '—';

  return (
    <button
      type="button"
      className={styles.tile}
      disabled={!collection.ready}
      onClick={onClick}
      aria-label={
        collection.ready
          ? `Open ${collection.name} — ${formatted} entries`
          : `${collection.name} — coming soon`
      }
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon size={22} strokeWidth={1.6} />
      </span>
      <h3 className={styles.name}>{collection.name}</h3>
      <p className={clsx(styles.count, count === 0 && styles['count--empty'])}>
        {formatted}
      </p>
      <span
        className={clsx(
          styles.status,
          collection.ready ? styles['status--ready'] : styles['status--coming'],
        )}
      >
        <span className={styles.statusDot} />
        {collection.ready ? 'Ready' : 'Coming Soon'}
      </span>
    </button>
  );
}
