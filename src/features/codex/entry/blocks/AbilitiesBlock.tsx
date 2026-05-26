/**
 * AbilitiesBlock — numbered list of warframe abilities.
 *
 * Reads from entry.abilities (populated by the worker enricher from
 * calamity raw `abilities` arrays). Skipped when the list is empty —
 * not all categories carry abilities, and a sentinel with one precept
 * still benefits from the same shape.
 */

import { useMemo } from 'react';
import type { CodexEntry } from '../../types';
import styles from './AbilitiesBlock.module.css';

interface AbilitiesBlockProps {
  entry: CodexEntry;
}

export function AbilitiesBlock({ entry }: AbilitiesBlockProps) {
  const abilities = entry.abilities;
  if (!abilities || abilities.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-abilities-label">
      <h2 id="codex-abilities-label" className={styles.label}>Abilities</h2>
      <ol className={styles.list}>
        {abilities.map((ability, idx) => (
          <AbilityRow key={`${ability.name}-${idx}`} index={idx + 1} ability={ability} />
        ))}
      </ol>
    </section>
  );
}

interface AbilityRowProps {
  index:    number;
  ability:  { name: string; description: string };
}

function AbilityRow({ index, ability }: AbilityRowProps) {
  const desc = useMemo(() => sanitize(ability.description), [ability.description]);
  return (
    <li className={styles.ability}>
      <span className={styles.numberBadge} aria-hidden="true">{index}</span>
      <div className={styles.meta}>
        <h3 className={styles.name}>{ability.name}</h3>
        {desc && <p className={styles.description}>{desc}</p>}
      </div>
    </li>
  );
}

function sanitize(raw: string): string {
  return raw
    .replace(/<[A-Z0-9_]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
