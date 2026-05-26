/**
 * ContinueBrowsing — the last 5 codex entries the user inspected.
 *
 * Hidden when empty; the section disappears rather than rendering a
 * "Your history is empty" placeholder. Returning visitors with no
 * history shouldn't see scaffolding for absent features.
 *
 * Each card click re-opens the entry through the same handler that
 * fresh opens use — so re-opening doesn't bypass the history push
 * (it just dedups to the front).
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
      <h2 id="codex-continue-label" className={styles.label}>Continue Browsing</h2>
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
