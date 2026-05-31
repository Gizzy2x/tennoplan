/**
 * ConsumersBlock — "Used in" reverse-join.
 *
 * For a given resource / ingredient / component, scans every item in
 * Dexie and surfaces the ones whose `buildRequirements[].item` matches
 * the current entry's display name. Mirrors the ComponentsBlock pattern
 * but goes the opposite direction (parent → children there, child →
 * parents here).
 *
 * Why this matters: a player landing on Orokin Cell currently sees
 * where to FARM it, but not WHY they need it. This block answers
 * "what does this resource craft?" — turning the catalogue into a
 * decision-support surface (the gap the wiki Resources page fills via
 * hand-curated cross-references).
 *
 * Performance: one Dexie `.toArray()` walk on ~8k rows, then a per-row
 * `buildRequirements.some()` check. ~ms even on slow devices. Memoised
 * via useLiveQuery — only re-runs when the entry name changes.
 *
 * Render shape: panel matching ComponentsBlock + grid of compact cards.
 * Cards show the consumer's icon, name, category pill, and "N× needed"
 * badge. Click bubbles via `onSelectEntry` so users can drill into
 * "what is that thing?" without leaving the codex.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import type { CodexEntry } from '../../types';
import styles from './ConsumersBlock.module.css';

interface ConsumersBlockProps {
  entry:          CodexEntry;
  onSelectEntry?: (entry: TennoplanItem) => void;
}

interface ResolvedConsumer {
  item:  TennoplanItem;
  count: number;
}

/** Categories worth surfacing as "consumers" — pure ingredients ($→$)
 *  don't add value, but crafted items do. */
const SURFACEABLE_CATEGORIES = new Set<TennoplanItem['category']>([
  'Warframe',
  'Weapon',
  'Companion',
  'Sentinel',
  'Blueprint',
  'Equipment',
  'Resource',     // some Resources are intermediate parts (e.g. "Ash Chassis")
  'Key',
  'Arcane',
]);

export function ConsumersBlock({ entry, onSelectEntry }: ConsumersBlockProps) {
  const targetName = entry.name;

  const consumers = useLiveQuery(
    async () => {
      const all = await db.tennoplanItems.toArray();
      const out: ResolvedConsumer[] = [];
      for (const item of all) {
        if (!SURFACEABLE_CATEGORIES.has(item.category)) continue;
        if (!item.buildRequirements?.length) continue;
        // Same-item guard — don't list "Orokin Cell" as a consumer of itself
        // when synthesized component rows refer to themselves via name.
        if (item.uniqueName === entry.uniqueName) continue;

        const req = item.buildRequirements.find(
          (r) => r.item === targetName && r.count > 0,
        );
        if (req) out.push({ item, count: req.count });
      }
      // Sort: bigger consumers first (visually anchors the grid), then alpha.
      out.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.item.name.localeCompare(b.item.name);
      });
      return out;
    },
    [targetName, entry.uniqueName],
  );

  if (!consumers || consumers.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-consumers-label">
      <div className={styles.header}>
        <h2 id="codex-consumers-label" className={styles.label}>
          Used in
        </h2>
        <span className={styles.headerCount}>
          {consumers.length} item{consumers.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className={styles.grid}>
        {consumers.map((c) => (
          <ConsumerCard
            key={c.item.uniqueName}
            consumer={c}
            onClick={() => onSelectEntry?.(c.item)}
            interactive={typeof onSelectEntry === 'function'}
          />
        ))}
      </div>
    </section>
  );
}

interface ConsumerCardProps {
  consumer:    ResolvedConsumer;
  onClick:     () => void;
  interactive: boolean;
}

function ConsumerCard({ consumer, onClick, interactive }: ConsumerCardProps) {
  const { item, count } = consumer;
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      className={styles.card}
      onClick={interactive ? onClick : undefined}
      aria-label={interactive ? `Open ${item.name} in codex` : undefined}
    >
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
          alt=""
          className={styles.cardIcon}
          draggable={false}
          decoding="async"
          loading="lazy"
        />
      ) : (
        <div className={styles.cardIconFallback} aria-hidden="true">
          {item.name.charAt(0)}
        </div>
      )}
      <div className={styles.cardCopy}>
        <span className={styles.cardName}>{item.name}</span>
        <span className={styles.cardCategory}>{item.category}</span>
      </div>
      {count > 1 && (
        <span className={styles.cardCount} title={`Requires ${count} of this resource`}>
          ×{count}
        </span>
      )}
    </Tag>
  );
}
