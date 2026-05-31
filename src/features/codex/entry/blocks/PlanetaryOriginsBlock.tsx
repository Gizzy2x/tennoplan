/**
 * PlanetaryOriginsBlock — cinematic planet treatment for Resource entries.
 *
 * Visual structure:
 *   1. Primary planet hero — the planet with the highest best-chance for
 *      this resource. Full-bleed stylized art as backdrop with a dark
 *      vignette + gradient overlay; the resource icon floats centred in
 *      a gold-ringed orb with a soft halo. Planet label, best drop chance,
 *      and node count overlay the bottom-left.
 *   2. Secondary planets strip — every other planet that drops this
 *      resource, ranked by best chance. Each chip carries a circular
 *      planet thumb, name, best chance %, and Steel Path indicator
 *      when present.
 *
 * The block renders nothing if the resource has no resolvable planet
 * data (relic-content rewards, mod-by-drop, etc.) — the entry shell's
 * empty-block rule keeps the page clean.
 *
 * Motion: the primary planet does a slow ambient breathe (scale 1.00 →
 * 1.03 over 9s, reversed) so the page feels alive without distracting.
 * Respects `prefers-reduced-motion` via the .module.css media query.
 */

import { useMemo } from 'react';
import clsx from 'clsx';
import type { CodexEntry } from '../../types';
import { aggregateDropsByPlanet } from '@/lib/planets/planetArt';
import styles from './PlanetaryOriginsBlock.module.css';

interface PlanetaryOriginsBlockProps {
  entry: CodexEntry;
}

export function PlanetaryOriginsBlock({ entry }: PlanetaryOriginsBlockProps) {
  const planets = useMemo(
    () => aggregateDropsByPlanet(entry.dropLocations),
    [entry.dropLocations],
  );

  if (planets.length === 0) return null;

  const [primary, ...secondary] = planets;
  if (!primary) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-planet-origins-label">
      <h2 id="codex-planet-origins-label" className={styles.label}>
        Planetary Origins
      </h2>

      <PrimaryHero planet={primary} entry={entry} planetCount={planets.length} />

      {secondary.length > 0 && (
        <div className={styles.alsoOnRow}>
          <span className={styles.alsoOnLabel}>Also drops on</span>
          <div className={styles.secondaryStrip} role="list">
            {secondary.map((p) => (
              <SecondaryChip key={p.planet} planet={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Primary hero ────────────────────────────────────────────────────

interface PrimaryHeroProps {
  planet:      ReturnType<typeof aggregateDropsByPlanet>[number];
  entry:       CodexEntry;
  planetCount: number;
}

function PrimaryHero({ planet, entry, planetCount }: PrimaryHeroProps) {
  const chancePct = (planet.bestChance * 100).toFixed(2);

  return (
    <div className={styles.hero}>
      {/* Layer 1 — planet art backdrop (full-bleed, breathing scale) */}
      <div
        className={styles.heroPlanet}
        style={{ backgroundImage: `url(${planet.art})` }}
        aria-hidden="true"
      />

      {/* Layer 2 — vignette / gradient overlays for readability */}
      <div className={styles.heroVignette} aria-hidden="true" />
      <div className={styles.heroGradient} aria-hidden="true" />

      {/* Layer 3 — resource icon orb, centred */}
      <div className={styles.heroOrb}>
        <div className={styles.heroOrbHalo} aria-hidden="true" />
        <div className={styles.heroOrbRing} aria-hidden="true" />
        {entry.iconUrl ? (
          <img
            src={entry.iconUrl}
            alt=""
            className={styles.heroOrbIcon}
            draggable={false}
            decoding="async"
          />
        ) : (
          <span className={styles.heroOrbFallback} aria-hidden="true">
            {entry.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Layer 4 — textual overlay (bottom-left) */}
      <div className={styles.heroMeta}>
        <span className={styles.heroPrimaryLabel}>Primary source</span>
        <span className={styles.heroPlanetName}>{planet.planet}</span>
        <div className={styles.heroStatsRow}>
          <Stat label="Best chance" value={`${chancePct}%`} />
          <Stat label="Nodes" value={String(planet.nodeCount)} />
          {planetCount > 1 && (
            <Stat
              label="Worlds"
              value={String(planetCount)}
              title={`Drops on ${planetCount} planets total`}
            />
          )}
          {planet.steelPath && (
            <span className={styles.steelPathPill} title="Drops in Steel Path">
              Steel Path
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className={styles.heroStat} title={title}>
      <span className={styles.heroStatValue}>{value}</span>
      <span className={styles.heroStatLabel}>{label}</span>
    </div>
  );
}

// ─── Secondary chips ─────────────────────────────────────────────────

function SecondaryChip({
  planet,
}: {
  planet: ReturnType<typeof aggregateDropsByPlanet>[number];
}) {
  const chancePct = (planet.bestChance * 100).toFixed(1);
  return (
    <div className={styles.secondaryChip} role="listitem" title={`${planet.planet} — best chance ${chancePct}% across ${planet.nodeCount} node${planet.nodeCount === 1 ? '' : 's'}`}>
      <div
        className={styles.secondaryThumb}
        style={{ backgroundImage: `url(${planet.art})` }}
        aria-hidden="true"
      >
        {planet.steelPath && (
          <span className={styles.secondarySteelDot} aria-label="Steel Path" />
        )}
      </div>
      <div className={styles.secondaryCopy}>
        <span className={styles.secondaryName}>{planet.planet}</span>
        <span className={clsx(styles.secondaryChance, planet.bestChance < 0.05 && styles.secondaryChanceLow)}>
          {chancePct}%
        </span>
      </div>
    </div>
  );
}
