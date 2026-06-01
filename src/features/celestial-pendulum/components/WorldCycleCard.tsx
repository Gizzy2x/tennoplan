/**
 * WorldCycleCard — one world in the Orrery grid.
 *
 * Composition: the planet thumb is the anchor; a draining ring orbits it
 * (time made visible); the state, activity and live countdown radiate from
 * the right. Prime windows (Eidolon Hunt, Exploiter Orb, Fass) carry a gold
 * marker so the high-value moment reads at a glance.
 */

import { memo } from 'react';
import type { CycleId, CycleStatus } from '@/core/domain/cycles';
import type { CycleUrgency } from '../hooks/useWorldCycles';
import type { CycleActivity, WorldMeta } from '../cycleActivity';
import { formatClock } from '../cycleActivity';
import { CycleRing } from './CycleRing';
import styles from '../CelestialPendulum.module.css';

interface WorldCycleCardProps {
  id:       CycleId;
  meta:     WorldMeta;
  status:   CycleStatus;
  urgency?: CycleUrgency;
  activity: CycleActivity;
  accent:   string;
  selected: boolean;
  onSelect: (id: CycleId) => void;
}

export const WorldCycleCard = memo(function WorldCycleCard({
  id,
  meta,
  status,
  urgency,
  activity,
  accent,
  selected,
  onSelect,
}: WorldCycleCardProps) {
  const state     = status.cycle.state;
  const isPreHeat = urgency?.isPreHeat ?? false;

  return (
    <button
      type="button"
      className={styles.card}
      data-selected={selected || undefined}
      data-prime={activity.isPrime || undefined}
      data-preheat={isPreHeat || undefined}
      style={{ ['--accent' as string]: accent } as React.CSSProperties}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={`${meta.label}, ${state}, ${activity.label}, ${formatClock(status.msRemaining)} remaining`}
    >
      <CycleRing
        progress={status.progress}
        size={58}
        stroke={3}
        color={accent}
        pulse={isPreHeat || activity.isPrime}
      >
        {meta.art ? (
          <img
            src={meta.art}
            alt=""
            width={50}
            height={50}
            className={styles.cardPlanet}
            style={{ objectPosition: meta.artPosition, transform: `scale(${meta.artScale ?? 1})` }}
            loading="lazy"
          />
        ) : (
          <span
            className={styles.cardPlanetFallback}
            style={{ ['--accent' as string]: accent } as React.CSSProperties}
            aria-hidden="true"
          />
        )}
      </CycleRing>

      <span className={styles.cardBody}>
        <span className={styles.cardTopRow}>
          <span className={styles.cardWorld}>{meta.label}</span>
          {activity.isPrime && (
            <span className={styles.cardPrimePip} title="Prime window">◆</span>
          )}
        </span>

        <span className={styles.cardState} style={{ color: accent }}>
          {state}
        </span>

        <span className={styles.cardActivity}>{activity.label}</span>

        <span className={styles.cardClock}>{formatClock(status.msRemaining)}</span>
      </span>
    </button>
  );
});
