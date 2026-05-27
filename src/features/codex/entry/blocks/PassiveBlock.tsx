/**
 * PassiveBlock — warframe/sentinel passive ability description.
 *
 * WFCD's passiveDescription field often contains DE game-engine markup
 * tags (<DT_SLASH_COLOR>, <DT_HEAT_COLOR>, etc.) and placeholder percent
 * signs where actual stat values would be. We strip the tags and surface
 * the text as-is; the raw numbers aren't in WFCD data.
 *
 * Returns null when no passiveDescription is present.
 */

import { useMemo } from 'react';
import type { CodexEntry } from '../../types';
import styles from './PassiveBlock.module.css';

interface PassiveBlockProps {
  entry: CodexEntry;
}

export function PassiveBlock({ entry }: PassiveBlockProps) {
  const text = useMemo(
    () => sanitize(entry.passiveDescription),
    [entry.passiveDescription],
  );
  if (!text) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-passive-label">
      <h2 id="codex-passive-label" className={styles.label}>Passive</h2>
      <p className={styles.body}>{text}</p>
    </section>
  );
}

/** Strip DE colour/formatting tags and normalise whitespace. */
function sanitize(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[A-Z0-9_]+>/g, '')   // <DT_SLASH_COLOR>, <DT_HEAT_COLOR>, …
    .replace(/<\/[A-Z0-9_]+>/g, '') // closing tags if any
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
