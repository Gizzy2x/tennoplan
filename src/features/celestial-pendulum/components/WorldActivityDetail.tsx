/**
 * WorldActivityDetail — compact live strip for the selected world.
 *
 * The global header now carries the world-cycle pills, so this is no longer a
 * tall hero. It's a low, horizontal live strip: a small draining `CycleRing`
 * anchors the left; state, countdown and activity lay across a tight row or
 * two; key resources collapse into a compact disclosure. The cinematic art
 * stays as a subtle right-bleed anchor, not a banner.
 */

import { memo, useState } from 'react';
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
  /** Cinematic world/state art, anchored behind this composition (bleeds from
   *  the right, dissolves into the base on the left). Empty → clean base. */
  artUrl?:   string;
}

export const WorldActivityDetail = memo(function WorldActivityDetail({
  meta,
  status,
  urgency,
  activity,
  accent,
  resources,
  staleData,
  artUrl,
}: WorldActivityDetailProps) {
  const state     = status.cycle.state;
  const nextState = urgency?.nextStateKey.split('-')[1] ?? '';
  const isPreHeat = urgency?.isPreHeat ?? false;

  const [resourcesOpen, setResourcesOpen] = useState(false);
  const hasResources = resources.length > 0;

  return (
    <section
      className={styles.detail}
      style={{ ['--accent' as string]: accent } as React.CSSProperties}
      aria-label={`${meta.label} cycle detail`}
    >
      {/* ── Anchored art: a subtle right-bleed gestalt anchor (§3a), kept low so
           it reads as texture, not a banner. The page supplies the ambient
           glow; this just tints the strip. ─────────────────────────────── */}
      {artUrl && (
        <>
          <img
            key={artUrl}
            src={artUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={styles.detailArt}
          />
          <div aria-hidden="true" className={styles.detailArtScrim} />
        </>
      )}

      {/* ── Live row: ring + state + clock + activity, all on one band ──── */}
      <div className={styles.detailLive}>
        <div className={styles.detailAnchor}>
          <CycleRing
            progress={status.progress}
            size={72}
            stroke={4}
            color={accent}
            pulse={isPreHeat || activity.isPrime}
          >
            {meta.art ? (
              <img
                src={meta.art}
                alt={meta.label}
                width={62}
                height={62}
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

        <div className={styles.detailIntel}>
          <div className={styles.detailIdentity}>
            <span className="typo-section-label">{meta.label}</span>
            <span className={styles.detailRegion}>{meta.region}</span>
          </div>

          <div className={styles.detailStateRow}>
            <h2 className={styles.detailState} style={{ color: accent }}>
              {state}
            </h2>
            <span className={styles.detailClock} style={{ color: accent }}>
              {formatClock(status.msRemaining)}
            </span>
            <span className={styles.detailClockUnit}>left</span>
            {staleData && (
              <span className={styles.detailStale} title="Cycle data is more than 3 minutes old — may lag the live game state.">
                stale
              </span>
            )}
            {nextState && (
              <span className={styles.detailNext}>
                <span className={styles.detailNextLabel}>NEXT</span>
                <span className={styles.detailNextState}>{nextState}</span>
                <span className={styles.detailNextDur}>· {formatCoarse(status.msRemaining)}</span>
              </span>
            )}
          </div>

          <div className={styles.detailActivityRow}>
            {activity.isPrime && <span className={styles.detailPrime}>◆ PRIME WINDOW</span>}
            <span className={styles.detailActivity}>{activity.label}</span>
          </div>
        </div>
      </div>

      {/* ── Key resources: compact collapsible chip list, not a tall rail ─ */}
      {hasResources && (
        <div className={styles.detailRail}>
          <button
            type="button"
            className={styles.detailResToggle}
            aria-expanded={resourcesOpen}
            onClick={() => setResourcesOpen((o) => !o)}
          >
            <span className="typo-section-label">KEY RESOURCES</span>
            <span className={styles.detailResCaret} aria-hidden="true">
              {resourcesOpen ? '▾' : '▸'}
            </span>
          </button>
          {resourcesOpen && (
            <ul className={styles.railList}>
              {resources.slice(0, 6).map((r) => (
                <li key={r.name} className={styles.railItem}>
                  <span className={styles.railName}>{r.name}</span>
                  <span className={styles.railSource}>{r.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
});
