/**
 * BestFarmsBlock — top-5 farm efficiency picks for this entry.
 *
 * Reads `entry.bestFarms` (computed by the worker enricher as chance ÷
 * estimated runtime, scored 0–100). Renders ranked rows with a subtle
 * efficiency bar at the bottom — the bar is a visual reinforcement,
 * not the primary signal. The primary signal is the chance percentage
 * (gold serif, large) and the rank ordinal (1–5, gold).
 *
 * Null when there are no recommendations — quiet, no "no data" copy.
 */

import clsx from 'clsx';
import type { CodexEntry } from '../../types';
import type { BestFarmRecommendation } from '@/core/domain/tennoplanApi';
import styles from './BestFarmsBlock.module.css';

interface BestFarmsBlockProps {
  entry: CodexEntry;
}

export function BestFarmsBlock({ entry }: BestFarmsBlockProps) {
  const farms = entry.bestFarms;
  if (!farms || farms.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-bestfarms-label">
      <h2 id="codex-bestfarms-label" className={styles.label}>Best Farms</h2>
      <ol className={styles.list}>
        {farms.map((farm, i) => (
          <FarmRow key={`${farm.location.location}-${i}`} farm={farm} rank={i + 1} />
        ))}
      </ol>
    </section>
  );
}

interface FarmRowProps {
  farm: BestFarmRecommendation;
  rank: number;
}

function FarmRow({ farm, rank }: FarmRowProps) {
  const chancePct = (farm.location.chance * 100).toFixed(2);

  return (
    <li className={styles.row}>
      <span className={styles.rank} aria-hidden="true">{rank}</span>

      <div className={styles.meta}>
        <span className={styles.location}>{farm.location.location}</span>
        <span className={styles.metaRow}>
          <span className={styles.sourceTag}>{farm.location.sourceName}</span>
          {farm.location.rotation && (
            <>
              <span className={styles.metaDot}>·</span>
              <span>Rotation {farm.location.rotation}</span>
            </>
          )}
          {farm.location.isSteelPath && (
            <>
              <span className={styles.metaDot}>·</span>
              <span className={styles.steelPath}>SP</span>
            </>
          )}
          <span className={styles.metaDot}>·</span>
          <span>~{farm.estimatedRuns} runs</span>
        </span>
        {farm.notes && <p className={styles.notes}>{farm.notes}</p>}
      </div>

      <div>
        <div className={styles.chance}>{chancePct}%</div>
        <span className={styles.chanceLabel}>Per run</span>
      </div>

      <div className={styles.efficiency} aria-hidden="true">
        <div
          className={clsx(styles.efficiencyFill)}
          style={{ width: `${clampPct(farm.efficiencyScore)}%` }}
        />
      </div>
    </li>
  );
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
