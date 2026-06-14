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

  const primary = primaryDamageSummary(entry.damageTypes);

  return (
    <section className={styles.root} aria-labelledby="characteristics-label">
      <h2 id="characteristics-label" className="typo-section-label">Stat Profile</h2>
      {primary && <p className={styles.summary}>{primary}</p>}
      <div className={styles.columns}>
        {c.advantages.length > 0 && (
          <div className={styles.col}>
            <div className={styles.colHeader} data-kind="adv">Strengths</div>
            <ul className={styles.list}>
              {c.advantages.map((a, i) => (
                <li key={i} className={styles.adv}>{a.text}</li>
              ))}
            </ul>
          </div>
        )}
        {c.disadvantages.length > 0 && (
          <div className={styles.col}>
            <div className={styles.colHeader} data-kind="dis">Weaknesses</div>
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

/**
 * "Deals primarily X and Y damage" from the damage-type breakdown — the wiki's
 * Characteristics opener. Picks the types that each contribute >=20% of the
 * total (max 3), so a pure-element weapon reads "primarily Heat" and a physical
 * one reads "primarily Puncture and Impact".
 */
function primaryDamageSummary(damageTypes: Record<string, number> | undefined): string | null {
  if (!damageTypes) return null;
  const entries = Object.entries(damageTypes).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const top = entries
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v / total >= 0.2)
    .slice(0, 3)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
  if (top.length === 0) return null;
  const list =
    top.length === 1 ? top[0]
    : `${top.slice(0, -1).join(', ')} and ${top[top.length - 1]}`;
  return `Deals primarily ${list} damage.`;
}
