/**
 * WorldActivityDetail — anchored hero for the selected world.
 *
 * Composition over containment: the planet (in its draining ring) anchors the
 * left; the state, activity intel and live countdown radiate across the middle;
 * the key resources stack as an editorial rail on the right. No inner boxes —
 * the three zones are separated by rhythm and a single hairline, not cards.
 */

import { memo } from 'react';
import type { CycleStatus } from '@/core/domain/cycles';
import type { CycleUrgency } from '../hooks/useWorldCycles';
import type { CycleActivity, KeyResource, WorldMeta } from '../cycleActivity';
import { formatClock, formatCoarse } from '../cycleActivity';
import { CycleRing } from './CycleRing';
import styles from '../CelestialPendulum.module.css';

interface WorldActivityDetailProps {
  meta:      WorldMeta;
  status:    CycleStatus;
  urgency?:  CycleUrgency;
  activity:  CycleActivity;
  accent:    string;
  resources: KeyResource[];
  staleData: boolean;
}

export const WorldActivityDetail = memo(function WorldActivityDetail({
  meta,
  status,
  urgency,
  activity,
  accent,
  resources,
  staleData,
}: WorldActivityDetailProps) {
  const state     = status.cycle.state;
  const nextState = urgency?.nextStateKey.split('-')[1] ?? '';
  const isPreHeat = urgency?.isPreHeat ?? false;

  return (
    <section
      className={styles.detail}
      style={{ ['--accent' as string]: accent } as React.CSSProperties}
      aria-label={`${meta.label} cycle detail`}
    >
      {/* ── Anchor: planet + draining ring ───────────────────────────── */}
      <div className={styles.detailAnchor}>
        <CycleRing
          progress={status.progress}
          size={132}
          stroke={5}
          color={accent}
          pulse={isPreHeat || activity.isPrime}
        >
          {meta.art ? (
            <img
              src={meta.art}
              alt={meta.label}
              width={116}
              height={116}
              className={styles.detailPlanet}
              style={{ objectPosition: meta.artPosition, transform: `scale(${meta.artScale ?? 1})` }}
            />
          ) : (
            <span
              className={styles.detailPlanetFallback}
              style={{ ['--accent' as string]: accent } as React.CSSProperties}
              aria-hidden="true"
            />
          )}
        </CycleRing>
      </div>

      {/* ── Intel: identity, state, activity, countdown ──────────────── */}
      <div className={styles.detailIntel}>
        <div className={styles.detailIdentity}>
          <span className={styles.detailWorld}>{meta.label}</span>
          <span className={styles.detailRegion}>{meta.region}</span>
        </div>

        <h2 className={styles.detailState} style={{ color: accent }}>
          {state}
        </h2>

        <div className={styles.detailActivityRow}>
          {activity.isPrime && <span className={styles.detailPrime}>◆ PRIME WINDOW</span>}
          <span className={styles.detailActivity}>{activity.label}</span>
        </div>

        {activity.blurb && <p className={styles.detailBlurb}>{activity.blurb}</p>}

        <div className={styles.detailClockRow}>
          <span className={styles.detailClock} style={{ color: accent }}>
            {formatClock(status.msRemaining)}
          </span>
          <span className={styles.detailClockUnit}>left in {state}</span>
          {staleData && (
            <span className={styles.detailStale} title="Cycle data is more than 3 minutes old — may lag the live game state.">
              stale
            </span>
          )}
        </div>

        {nextState && (
          <div className={styles.detailNext}>
            <span className={styles.detailNextLabel}>NEXT</span>
            <span className={styles.detailNextState}>{nextState}</span>
            <span className={styles.detailNextDur}>in {formatCoarse(status.msRemaining)}</span>
          </div>
        )}
      </div>

      {/* ── Editorial rail: key resources ────────────────────────────── */}
      {resources.length > 0 && (
        <div className={styles.detailRail}>
          <span className={styles.railLabel}>KEY RESOURCES</span>
          <ul className={styles.railList}>
            {resources.slice(0, 5).map((r) => (
              <li key={r.name} className={styles.railItem}>
                <span className={styles.railName}>{r.name}</span>
                <span className={styles.railSource}>{r.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
});
