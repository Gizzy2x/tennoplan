/**
 * LandingHero — the title block at the top of the Codex landing.
 *
 * Editorial, left-aligned. Title and tagline are static — they set the
 * tone for the page and stay constant across sessions.
 */

import styles from './LandingHero.module.css';

export function LandingHero() {
  return (
    <header className={styles.root}>
      <h1 className={styles.title}>Codex</h1>
      <p className={styles.tagline}>
        Every reference for every system. Curated for clarity.
      </p>
    </header>
  );
}
