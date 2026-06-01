/**
 * BuildBlock — recipe ingredients required to craft this entry.
 *
 * Reads `entry.buildRequirements` (resolved by the worker enricher
 * from `recipe.ingredients` with names looked up via the global
 * name index — so we get display names, not internal uniqueNames).
 *
 * Phase A renders a simple count-and-name list. Phase B can enrich
 * each row with the ingredient's icon (Dexie lookup by name) and
 * make the row clickable to navigate to that ingredient's codex
 * entry — same pattern as Continue Browsing in reverse.
 *
 * Null when there are no requirements (warframes have BPs but mods
 * don't; the block silently skips).
 */

import type { CodexEntry } from '../../types';
import styles from './BuildBlock.module.css';

interface BuildBlockProps {
  entry: CodexEntry;
}

export function BuildBlock({ entry }: BuildBlockProps) {
  const reqs = entry.buildRequirements;
  if (!reqs || reqs.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-build-label">
      <h2 id="codex-build-label" className="typo-section-label">Build Requirements</h2>
      <ul className={styles.list}>
        {reqs.map((req, i) => (
          <li key={`${req.item}-${i}`} className={styles.row}>
            <span className={styles.count}>
              {req.count.toLocaleString()}
              <span className={styles.times}>×</span>
            </span>
            <span className={styles.itemName}>{req.item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
