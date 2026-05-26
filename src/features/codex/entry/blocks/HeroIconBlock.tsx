/**
 * HeroIconBlock — large portrait panel for the entry.
 *
 * Phase A renders the iconUrl scaled large with a radial backdrop. Once
 * we have proper Warframe render art (separate from the CDN icon), this
 * block can prefer that source while keeping the same shell.
 *
 * Falls back to a circular initial when iconUrl is missing — same
 * pattern as WarframeCard so the visual language stays consistent.
 */

import type { CodexEntry } from '../../types';
import styles from './HeroIconBlock.module.css';

interface HeroIconBlockProps {
  entry: CodexEntry;
}

export function HeroIconBlock({ entry }: HeroIconBlockProps) {
  if (!entry.iconUrl) {
    const initial = entry.name.slice(0, 1).toUpperCase();
    return (
      <section className={styles.root} aria-label={`${entry.name} icon`}>
        <span className={styles.fallback} aria-hidden="true">{initial}</span>
      </section>
    );
  }

  return (
    <section className={styles.root} aria-label={`${entry.name} icon`}>
      <img
        src={entry.thumbUrl ?? entry.iconUrl}
        alt=""
        className={styles.image}
        draggable={false}
        decoding="async"
      />
    </section>
  );
}
