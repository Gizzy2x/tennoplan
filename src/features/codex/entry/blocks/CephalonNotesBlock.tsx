/**
 * CephalonNotesBlock — "Cephalon's Notes", the authored knowledge layer (B1).
 *
 * The wedge no other companion app does: practical, own-words knowledge the
 * game and most tools never surface — how a thing really works, what it stacks
 * with, what it does NOT affect, the gotchas. Sourced from FieldNotes on the
 * entry (authored in CI, keyed by uniqueName).
 *
 * Renders a one-line tl;dr then the points that actually change a decision.
 * A BETA tag flags unverified entries (community-vet loop). Returns null when
 * the entry has no notes — absence is the right signal, no empty box.
 */

import type { CodexEntry } from '../../types';
import styles from './CephalonNotesBlock.module.css';

export function CephalonNotesBlock({ entry }: { entry: CodexEntry }) {
  const notes = entry.fieldNotes;
  if (!notes || (!notes.tldr && !(notes.points && notes.points.length > 0))) return null;

  return (
    <section className={styles.root} aria-labelledby="cephalon-notes-label">
      <div className={styles.header}>
        <h2 id="cephalon-notes-label" className="typo-section-label">Cephalon's Notes</h2>
        {notes.status === 'beta' && (
          <span
            className={styles.beta}
            title="Community-vetted knowledge in progress — a number or detail may be off. Suggestions welcome."
          >
            BETA
          </span>
        )}
      </div>

      {notes.tldr && <p className={styles.tldr}>{notes.tldr}</p>}

      {notes.points && notes.points.length > 0 && (
        <ul className={styles.points}>
          {notes.points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
