/**
 * BuildCostBlock — foundry craft cost (credits + build time + rush platinum),
 * from PE+ ExportRecipes. The wiki buries this; we surface "how much and how
 * long to build this" right above the components. Renders nothing for items
 * with no recipe (uncraftable).
 */

import type { CodexEntry } from '../../types';
import styles from './BuildCostBlock.module.css';

export function BuildCostBlock({ entry }: { entry: CodexEntry }) {
  const b = entry.buildCost;
  if (!b) return null;

  return (
    <section className={styles.root} aria-labelledby="buildcost-label">
      <h2 id="buildcost-label" className="typo-section-label">Build Cost</h2>
      <div className={styles.row}>
        {b.credits > 0 && <Stat label="Credits" value={b.credits.toLocaleString()} />}
        <Stat label="Build time" value={formatBuildTime(b.buildTime)} />
        {b.rushPlatinum != null && <Stat label="Rush" value={`${b.rushPlatinum} pl`} />}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/** Seconds → "3d" / "12h" / "1h" / "5m" (foundry timers are whole hours/days). */
function formatBuildTime(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
  if (hours >= 1) return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`;
  return `${Math.max(1, Math.round(seconds / 60))}m`;
}
