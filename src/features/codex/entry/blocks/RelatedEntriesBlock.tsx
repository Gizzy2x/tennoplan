/**
 * RelatedEntriesBlock — "More from this set / category" tail block.
 *
 * Lives just before WikiFooterBlock so the entry page doesn't end on
 * the CC BY-SA attribution line. Carries one of two reads, in order
 * of preference:
 *
 *   1. **Same update siblings** — items that share the current entry's
 *      `introduced.name` (e.g. everything that shipped with "Dante
 *      Unbound"). Reads as "what else came with this", which is the
 *      most editorial pairing.
 *
 *   2. **Recent in category** — fall-back when the current entry has
 *      no introduced data or no siblings: the N most recently
 *      introduced items in the same category. Always useful for
 *      exploration; degrades gracefully even on partial codex data.
 *
 * Returns null when neither path can produce 2+ items — a single
 * lonely row reads as broken, not curated.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import type { CodexEntry } from '../../types';
import styles from './RelatedEntriesBlock.module.css';

const MAX_RELATED = 5;

interface RelatedEntriesBlockProps {
  entry:          CodexEntry;
  onSelectEntry?: (entry: TennoplanItem) => void;
}

interface RelatedRead {
  /** Section label shown above the strip — varies per resolution path. */
  label:   string;
  /** Up to MAX_RELATED sibling entries. Sorted newest-first when known. */
  items:   TennoplanItem[];
}

export function RelatedEntriesBlock({ entry, onSelectEntry }: RelatedEntriesBlockProps) {
  const read = useLiveQuery(
    () => resolveRelated(entry),
    [entry.uniqueName, entry.category, entry.introduced?.name],
  );

  if (!read || read.items.length < 2) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-related-label">
      <h2 id="codex-related-label" className="typo-section-label">{read.label}</h2>
      <ul className={styles.list}>
        {read.items.map((item) => (
          <li key={item.uniqueName} className={styles.row}>
            <button
              type="button"
              className={styles.card}
              onClick={() => onSelectEntry?.(item)}
              aria-label={`Open ${item.name} in codex`}
              disabled={!onSelectEntry}
            >
              {item.iconUrl ? (
                <img
                  src={item.iconUrl}
                  alt=""
                  className={styles.cardIcon}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <span className={styles.cardIconFallback} aria-hidden="true">
                  {item.name.charAt(0)}
                </span>
              )}
              <span className={styles.cardCopy}>
                <span className={styles.cardName}>{item.name}</span>
                <span className={styles.cardMeta}>
                  {item.introduced?.name ?? item.category}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Resolution ──────────────────────────────────────────────────

async function resolveRelated(entry: CodexEntry): Promise<RelatedRead | null> {
  // Path 1: same update siblings.
  const updateName = entry.introduced?.name;
  if (updateName) {
    const siblings = await db.tennoplanItems
      .where('category').equals(entry.category)
      .toArray();
    const filtered = siblings
      .filter((it) => it.uniqueName !== entry.uniqueName)
      .filter((it) => it.introduced?.name === updateName)
      .filter((it) => !!it.iconUrl)
      .slice(0, MAX_RELATED);

    if (filtered.length >= 2) {
      return { label: `More from ${updateName}`, items: filtered };
    }
  }

  // Path 2: recent in category. The category index lets us scope the
  // scan to ~120 warframes / ~1.1k weapons / etc. rather than the
  // full 8k catalogue.
  const sameCategory = await db.tennoplanItems
    .where('category').equals(entry.category)
    .toArray();

  const recent = sameCategory
    .filter((it) => it.uniqueName !== entry.uniqueName)
    .filter((it) => !!it.iconUrl)
    .sort((a, b) => {
      const ta = a.introduced?.date ? Date.parse(a.introduced.date) : 0;
      const tb = b.introduced?.date ? Date.parse(b.introduced.date) : 0;
      return tb - ta;
    })
    .slice(0, MAX_RELATED);

  if (recent.length < 2) return null;

  return {
    label: `More ${pluralCategory(entry.category)}`,
    items: recent,
  };
}

function pluralCategory(category: TennoplanItem['category']): string {
  // Mirrors the SUBTAB_LABEL map in CodexPage but with category-singular
  // input. Categories not surfaced through a browser fall back to the
  // raw string so the block still reads as something coherent.
  switch (category) {
    case 'Warframe':  return 'Warframes';
    case 'Weapon':    return 'Weapons';
    case 'Companion': return 'Companions';
    case 'Sentinel':  return 'Sentinels';
    case 'Mod':       return 'Mods';
    case 'Arcane':    return 'Arcanes';
    case 'Resource':  return 'Resources';
    case 'Blueprint': return 'Blueprints';
    case 'Equipment': return 'Equipment';
    case 'Key':       return 'Keys';
    case 'Relic':     return 'Relics';
    default:          return String(category);
  }
}
