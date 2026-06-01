/**
 * ContinueBrowsing — the last 5 codex entries the user inspected.
 *
 * Hidden when empty; the section disappears rather than rendering a
 * "Your history is empty" placeholder. Returning visitors with no
 * history shouldn't see scaffolding for absent features.
 *
 * v3: header rail matches the other landing sections (Pixel-Square
 * glyph + label); cards use a horizontal thumbnail-anchored layout
 * distinct from RecentlyAdded's vertical tiles so the two sections
 * are visually differentiated even when their content overlaps.
 */

import { useCodexHistory, type CodexHistoryEntry } from '@/store/codexHistory';
import styles from './ContinueBrowsing.module.css';

interface ContinueBrowsingProps {
  onSelectEntry: (entry: CodexHistoryEntry) => void;
}

export function ContinueBrowsing({ onSelectEntry }: ContinueBrowsingProps) {
  const entries = useCodexHistory((s) => s.entries);

  if (entries.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-continue-label">
      <header className={styles.header}>
        <h2 id="codex-continue-label" className={`typo-section-label ${styles.label}`}>
          <span className={styles.labelGlyph} aria-hidden="true">▢</span>
          Continue Browsing
        </h2>
        <span className={styles.headerMeta}>{entries.length} recent</span>
      </header>

      <div className={styles.strip}>
        {entries.map((e) => (
          <HistoryCard key={e.uniqueName} entry={e} onClick={() => onSelectEntry(e)} />
        ))}
      </div>
    </section>
  );
}

function HistoryCard({
  entry, onClick,
}: { entry: CodexHistoryEntry; onClick: () => void }) {
  const initial = entry.name.slice(0, 1).toUpperCase();
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={`Re-open ${entry.name}`}
    >
      <span className={styles.thumb} aria-hidden="true">
        {entry.iconUrl
          ? <img src={entry.iconUrl} alt="" loading="lazy" decoding="async" draggable={false} />
          : <span className={styles.thumbPlaceholder}>{initial}</span>
        }
      </span>
      <span className={styles.meta}>
        <span className={styles.name}>{entry.name}</span>
        <span className={styles.category}>{entry.category}</span>
      </span>
    </button>
  );
}
