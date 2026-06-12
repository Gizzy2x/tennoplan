/**
 * PlacesRail — the Observatory's persistent navigation.
 *
 * The orrery reborn as a vertical list of PLACES. Each cycle world keeps its
 * draining ring (time made visible) so the whole rail is a live dashboard you
 * navigate; static givers (Sanctum / Höllvania) show a steady glyph — always
 * open, no clock. Selecting a place drives the detail pane to the right.
 *
 * Two-colour discipline (Codex-consistent): jade = interactive / selected,
 * gold = the prime window. World identity comes from planet art + name, not
 * from a per-world accent — so a theme swap recolours the whole rail at once.
 */

import { memo } from 'react';
import { formatClock } from '../cycleActivity';
import { CycleRing } from './CycleRing';
import { OVERVIEW_KEY, type Place } from '../placesModel';
import styles from '../CelestialPendulum.module.css';

const JADE = 'var(--color-accent-jade)';
const GOLD = 'var(--color-accent-gold)';

interface PlacesRailProps {
  places:     Place[];
  selectedKey: string;
  onSelect:   (key: string) => void;
}

export const PlacesRail = memo(function PlacesRail({ places, selectedKey, onSelect }: PlacesRailProps) {
  return (
    <nav className={styles.rail} aria-label="Places">
      {/* Global "All worlds" overview — the rail's home, above the places. */}
      <button
        type="button"
        className={`${styles.place} ${styles.overviewNav}`}
        data-selected={selectedKey === OVERVIEW_KEY || undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect(OVERVIEW_KEY)}
        aria-pressed={selectedKey === OVERVIEW_KEY}
        aria-label="All worlds overview"
      >
        <span className={styles.placeAnchor}>
          <span className={styles.placeGlyph} aria-hidden="true">◈</span>
        </span>
        <span className={styles.placeBody}>
          <span className={styles.compactLabel}>Overview</span>
          <span className={styles.placeSub}>All worlds</span>
        </span>
      </button>

      {places.map((p) => {
        const selected = p.key === selectedKey;
        const isPrime  = p.activity?.isPrime ?? false;
        const isPreHeat = p.urgency?.isPreHeat ?? false;
        const accent   = isPrime ? GOLD : JADE;
        const tierCount = p.giver?.bounties.length ?? 0;

        return (
          <button
            key={p.key}
            type="button"
            className={styles.place}
            data-selected={selected || undefined}
            data-prime={isPrime || undefined}
            data-preheat={isPreHeat || undefined}
            style={{ ['--accent' as string]: accent } as React.CSSProperties}
            // Block mouse-focus scroll-into-view (kept the page from jumping).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(p.key)}
            aria-pressed={selected}
            aria-label={
              p.status
                ? `${p.label}, ${p.status.cycle.state}, ${formatClock(p.status.msRemaining)} remaining`
                : `${p.label}, ${p.npc ?? 'bounties'}`
            }
          >
            <span className={styles.placeAnchor}>
              {p.status && p.meta ? (
                <CycleRing
                  progress={p.status.progress}
                  size={46}
                  stroke={3}
                  color={accent}
                  pulse={isPreHeat || isPrime}
                >
                  {p.meta.art ? (
                    <img
                      src={p.meta.art}
                      alt=""
                      width={38}
                      height={38}
                      className={styles.placePlanet}
                      style={{ objectPosition: p.meta.artPosition, transform: `scale(${p.meta.artScale ?? 1})` }}
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.placePlanetFallback} aria-hidden="true" />
                  )}
                </CycleRing>
              ) : (
                <span className={styles.placeGlyph} aria-hidden="true">◇</span>
              )}
            </span>

            <span className={styles.placeBody}>
              <span className={styles.placeTopRow}>
                <span className={styles.compactLabel}>{p.label}</span>
                {isPrime && <span className={styles.placePip} title="Prime window">◆</span>}
              </span>

              {p.status ? (
                <>
                  <span className={styles.placeState} style={{ color: accent }}>
                    {p.status.cycle.state}
                  </span>
                  <span className={styles.placeClock}>{formatClock(p.status.msRemaining)}</span>
                </>
              ) : (
                <>
                  <span className={styles.placeNpc}>{p.npc}</span>
                  <span className={styles.placeSub}>
                    {tierCount > 0 ? `${tierCount} tier${tierCount === 1 ? '' : 's'} · always open` : 'always open'}
                  </span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
});
