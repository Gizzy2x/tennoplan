/**
 * BestFarmsBlock — top-5 farm efficiency picks for this entry.
 *
 * Reads `entry.bestFarms` (computed by the worker enricher as chance ÷
 * estimated runtime, scored 0–100). Renders ranked rows with a subtle
 * efficiency bar at the bottom — the bar is a visual reinforcement,
 * not the primary signal. The primary signal is the chance percentage
 * (gold serif, large) and the rank ordinal (1–5, gold).
 *
 * Each row also carries a circular planet thumb derived from the drop
 * location (open-world labels collapse to their parent planet — Cetus
 * → Earth, Fortuna → Venus, etc.). When the source can't be planet-
 * anchored (sortie / arbitration / relic / mod-by-enemy), the slot
 * stays empty so the grid layout doesn't drift across rows.
 *
 * Null when there are no recommendations — quiet, no "no data" copy.
 */

import clsx from 'clsx';
import type { CodexEntry } from '../../types';
import type { BestFarmRecommendation } from '@/core/domain/tennoplanApi';
import { getPlanetArt, getPlanetCrop, planetFromDropLocation } from '@/lib/planets/planetArt';
import styles from './BestFarmsBlock.module.css';

interface BestFarmsBlockProps {
  entry: CodexEntry;
}

export function BestFarmsBlock({ entry }: BestFarmsBlockProps) {
  const farms = entry.bestFarms;
  if (!farms || farms.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-bestfarms-label">
      <h2 id="codex-bestfarms-label" className="typo-section-label">Best Farms</h2>
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
  const planet = planetFromDropLocation(farm.location);
  const planetArt = getPlanetArt(planet);

  return (
    <li className={styles.row}>
      <span className={styles.rank} aria-hidden="true">{rank}</span>

      <div className={styles.planetSlot} aria-hidden="true">
        {planetArt && (
          <div
            className={styles.planetThumb}
            style={{ backgroundImage: `url(${planetArt})`, backgroundPosition: getPlanetCrop(planet).position }}
            title={planet ?? undefined}
          />
        )}
      </div>

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
          style={{ transform: `scaleX(${clampScale(farm.efficiencyScore)})` }}
        />
      </div>
    </li>
  );
}

/**
 * Clamp the 0–100 efficiency score into the 0–1 scale that scaleX()
 * expects. NaN and negative values fall back to 0; values above 100
 * clamp to 1 (full bar) rather than over-scaling beyond the track.
 */
function clampScale(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n / 100));
}
