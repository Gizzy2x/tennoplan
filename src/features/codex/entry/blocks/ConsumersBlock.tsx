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

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import type { CodexEntry } from '../../types';
import { getConsumersOf, type ResolvedConsumer } from './consumerIndex';
import styles from './ConsumersBlock.module.css';

/**
 * Default visible cards before collapse — kicks in for popular resources
 * (Orokin Cell, Plastids, …) which can have 40–60+ consumers. Mirrors
 * DropsBlock's threshold so the codex's expander affordance is uniform.
 */
const COLLAPSE_THRESHOLD = 12;

interface ConsumersBlockProps {
  entry:          CodexEntry;
  onSelectEntry?: (entry: TennoplanItem) => void;
}

export function ConsumersBlock({ entry, onSelectEntry }: ConsumersBlockProps) {
  const targetName = entry.name;
  const [expanded, setExpanded] = useState(false);

  // Track the codex sync timestamp via useLiveQuery so the inverse
  // index in consumerIndex.ts knows when to rebuild after a fresh CI
  // codex blob lands. -1 default = "no sync yet known" which still
  // works since the index keys off any non-null syncedAt value.
  const syncedAt = useLiveQuery(
    () => db.syncMetadata.get('codex').then((m) => m?.lastSync ?? 0),
    [],
    0,
  );

  const consumers = useLiveQuery(
    async () => {
      const all = await getConsumersOf(targetName, syncedAt);
      // Same-item guard — don't list "Orokin Cell" as a consumer of itself
      // when synthesized component rows refer to themselves via name.
      const filtered = all.filter((c) => c.item.uniqueName !== entry.uniqueName);
      // Sort: bigger consumers first (visually anchors the grid), then alpha.
      return [...filtered].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.item.name.localeCompare(b.item.name);
      });
    },
    [targetName, entry.uniqueName, syncedAt],
  );

  if (!consumers || consumers.length === 0) return null;

  const overflow = Math.max(0, consumers.length - COLLAPSE_THRESHOLD);
  const visible  = expanded || overflow === 0
    ? consumers
    : consumers.slice(0, COLLAPSE_THRESHOLD);

  return (
    <section className={styles.root} aria-labelledby="codex-consumers-label">
      <div className={styles.header}>
        <h2 id="codex-consumers-label" className="typo-section-label">
          Used in
        </h2>
        <span className={styles.headerCount}>
          {consumers.length} item{consumers.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className={styles.grid}>
        {visible.map((c) => (
          <ConsumerCard
            key={c.item.uniqueName}
            consumer={c}
            onClick={() => onSelectEntry?.(c.item)}
            interactive={typeof onSelectEntry === 'function'}
          />
        ))}
      </div>

      {overflow > 0 && (
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded
              ? <>Show top {COLLAPSE_THRESHOLD} only <ChevronUp size={13} strokeWidth={2.25} /></>
              : <>Show all {consumers.length} consumers <ChevronDown size={13} strokeWidth={2.25} /></>}
          </button>
        </div>
      )}
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
