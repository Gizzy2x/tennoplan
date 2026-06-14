/**
 * CharacteristicsBlock — computed Advantages / Disadvantages (the wiki
 * "Characteristics" section), generated from stats in CI by ranking each item
 * against its peer cohort. Reads entry.characteristics; renders nothing when
 * absent (categories without comparable stats, or unremarkable items).
 *
 * Two columns: advantages (jade) and disadvantages (red), each a band-labelled
 * bullet ("Very high magazine (209)"). Collapses to one column when narrow.
 */

import type { CodexEntry } from '../../types';
import styles from './CharacteristicsBlock.module.css';

export function CharacteristicsBlock({ entry }: { entry: CodexEntry }) {
  const c = entry.characteristics;
  if (!c || (c.advantages.length === 0 && c.disadvantages.length === 0)) return null;

  return (
    <section className={styles.root} aria-labelledby="characteristics-label">
      <h2 id="characteristics-label" className="typo-section-label">Characteristics</h2>
      <div className={styles.columns}>
        {c.advantages.length > 0 && (
          <div className={styles.col}>
            <div className={styles.colHeader} data-kind="adv">Advantages</div>
            <ul className={styles.list}>
              {c.advantages.map((a, i) => (
                <li key={i} className={styles.adv}>{a.text}</li>
              ))}
            </ul>
          </div>
        )}
        {c.disadvantages.length > 0 && (
          <div className={styles.col}>
            <div className={styles.colHeader} data-kind="dis">Disadvantages</div>
            <ul className={styles.list}>
              {c.disadvantages.map((a, i) => (
                <li key={i} className={styles.dis}>{a.text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
