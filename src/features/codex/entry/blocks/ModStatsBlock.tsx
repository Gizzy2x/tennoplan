/**
 * ModStatsBlock — rank slider + per-rank stat lines.
 *
 * Reusable across the modal preview and the future full-page Codex entry.
 * Controlled component: the caller owns `rank` state. The block computes
 * displayDrain (baseDrain + rank, with a stance-mod fallback) and renders
 * the stats array at the current rank.
 *
 * Why controlled: ModDetailModal already owns its rank state; a future
 * full-page view will likely sync rank to the URL. The block stays
 * agnostic.
 */

import { useMemo } from 'react';
import clsx from 'clsx';
import { StatLine } from '@/lib/tennoicons/StatLine';
import styles from './ModStatsBlock.module.css';

interface ModStatsBlockProps {
  /** Per-rank stat lines. levelStats[0] = R0, levelStats[N] = RN. */
  levelStats:   string[][];
  /** Mod's base energy drain at R0 (0 for stance/aura mods). */
  baseDrain:    number;
  /** Currently displayed rank. */
  rank:         number;
  onRankChange: (rank: number) => void;
}

export function ModStatsBlock({
  levelStats, rank, onRankChange,
}: ModStatsBlockProps) {
  const maxRank = Math.max(0, levelStats.length - 1);
  const stats = useMemo(() => levelStats[rank] ?? [], [levelStats, rank]);
  return (
    <div className={styles.root}>
      <div className={styles.rankSection}>
        <div className={styles.rankHeader}>
          <span className={styles.rankLabel}>RANK</span>
          <span className={styles.rankValue}>{rank} / {maxRank}</span>
        </div>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={maxRank}
          step={1}
          value={rank}
          onChange={(e) => onRankChange(Number(e.target.value))}
          aria-label="Mod rank"
        />
        {maxRank > 0 && maxRank <= 15 && (
          <div className={styles.ticks}>
            {Array.from({ length: maxRank + 1 }, (_, i) => (
              <button
                key={i}
                className={clsx(styles.tick, i === rank && styles['tick--active'])}
                onClick={() => onRankChange(i)}
              >
                {i}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.divider} />

      <div className={styles.statsSection}>
        <span className={styles.statsHeader}>STATS AT RANK {rank}</span>
        {stats.length > 0
          ? stats.map((l, i) => <StatLine key={i} as="div" text={l} className={styles.statRow} />)
          : <div className={clsx(styles.statRow, styles.statEmpty)}>No stats at this rank</div>}
      </div>
    </div>
  );
}

/**
 * Helper exported for consumers that need to compute the same drain value
 * the block uses internally (modal meta panel, future full-page summary).
 */
export function computeDisplayDrain(baseDrain: number, rank: number): number {
  return baseDrain > 0 ? baseDrain + rank : rank + 4;
}
