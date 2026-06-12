/**
 * CompanionSummaryCard — sticky right-rail summary primitive for the
 * Companion AND Sentinel categories. Both ship the same stat shape
 * (health/shield/armor + polarities + masteryReq + abilities), so one
 * card serves both — the category label and the portrait glow flex
 * via `entry.category`.
 *
 * Structure (parallel to WarframeSummaryCard):
 *   1. Portrait + name backdrop (Prime → gold glow, else jade)
 *   2. Identity row — companion type or "SENTINEL" label
 *   3. Ability tile strip — Precepts (sentinels) or pet abilities.
 *      Renders only when present; pets without abilities skip.
 *   4. Intrinsic stats — Health, Shield (when nonzero), Armor
 *   5. Derived stats — Damage Reduction + Effective Hit Points,
 *      same formulas as the Warframe card (community-canonical).
 *
 * The DR / EHP rows reuse the warframe formulas verbatim because the
 * underlying math is identical: armor uses the same 300-cap curve,
 * shields are unarmored, health is armored. The labels carry the
 * formulas in `title` for hover-discovery.
 */

import { getIconUrl } from '@/lib/icons/IconResolver';
import type { CodexEntry } from '../../types';
import { NameBackdrop } from './NameBackdrop';
import styles from './CompanionSummaryCard.module.css';

interface CompanionSummaryCardProps {
  entry: CodexEntry;
}

export function CompanionSummaryCard({ entry }: CompanionSummaryCardProps) {
  const s = entry.stats;
  if (!s) return null;

  const dr  = computeDamageReduction(s.armor);
  const ehp = computeEffectiveHitPoints(s.health, s.shield, s.armor);

  return (
    <aside className={styles.root} aria-label={`${entry.name} summary`}>
      <Portrait entry={entry} />
      <Identity entry={entry} />
      <AbilityStrip entry={entry} />

      {/* ─── Group 1: intrinsic stats ───────────────────────────── */}
      <dl className={styles.statGroup}>
        {s.health != null && (
          <StatRow label="Health" value={fmtInt(s.health)} variant="health" />
        )}
        {s.shield != null && s.shield > 0 && (
          <StatRow label="Shield" value={fmtInt(s.shield)} variant="shield" />
        )}
        {s.armor != null && (
          <StatRow label="Armor" value={fmtInt(s.armor)} />
        )}
        {entry.masteryRank != null && (
          <StatRow label="Mastery Rank" value={String(entry.masteryRank)} />
        )}
      </dl>

      {/* ─── Group 2: derived (only when computable) ─────────────── */}
      {(dr != null || ehp != null) && (
        <dl className={styles.statGroup}>
          {dr != null && (
            <StatRow
              label="Damage Reduction"
              labelTitle="Armor / (Armor + 300)"
              value={dr.toFixed(1)}
              unit="%"
            />
          )}
          {ehp != null && (
            <StatRow
              label="Effective Hit Points"
              labelTitle="Shield + Health × (1 + Armor/300)"
              value={fmtInt(Math.round(ehp))}
            />
          )}
        </dl>
      )}
    </aside>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function Portrait({ entry }: { entry: CodexEntry }) {
  const isPrime = /\bPrime\b/i.test(entry.name);
  const portraitProps = {
    className:    styles.portrait,
    'data-prime': isPrime || undefined,
    'aria-hidden': true as const,
  };

  if (!entry.iconUrl) {
    const initial = entry.name.slice(0, 1).toUpperCase();
    return (
      <div {...portraitProps}>
        <NameBackdrop name={entry.name} />
        <span className={styles.portraitFallback}>{initial}</span>
      </div>
    );
  }
  return (
    <div {...portraitProps}>
      <NameBackdrop name={entry.name} />
      <img
        src={entry.thumbUrl ?? entry.iconUrl}
        alt=""
        className={styles.portraitImage}
        draggable={false}
        decoding="async"
      />
    </div>
  );
}


/**
 * Identity row — shows the companion's specific type (Kubrow / Kavat /
 * Predasite / Vulpaphyla / Moa / Hound) when available, else the broad
 * category. Sentinels just read "SENTINEL".
 */
function Identity({ entry }: { entry: CodexEntry }) {
  const label = entry.category === 'Sentinel'
    ? 'Sentinel'
    : entry.type ?? entry.category;
  return (
    <div className={styles.identity}>
      <span className={styles.category}>{label}</span>
    </div>
  );
}

/**
 * Ability strip — sentinels show Precepts (their pre-installed mod-like
 * powers), pet companions sometimes ship abilities too. Renders nothing
 * when none are present so simple pets stay clean.
 */
function AbilityStrip({ entry }: { entry: CodexEntry }) {
  const abilities = entry.abilities;
  if (!abilities || abilities.length === 0) return null;

  return (
    <div className={styles.abilityStrip} role="list" aria-label="Abilities">
      {abilities.map((ability, idx) => {
        const iconUrl = ability.imageName ? getIconUrl(ability.imageName) : null;
        return (
          <div
            key={`${ability.name}-${idx}`}
            className={styles.abilityTile}
            role="listitem"
            title={ability.name}
          >
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={ability.name}
                className={styles.abilityIcon}
                draggable={false}
                decoding="async"
              />
            ) : (
              <span className={styles.abilityNumber} aria-hidden="true">
                {idx + 1}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StatRowProps {
  label:       string;
  labelTitle?: string;
  value:       string;
  unit?:       string;
  variant?:    'health' | 'shield';
}

function StatRow({ label, labelTitle, value, unit, variant }: StatRowProps) {
  const valueClass = variant
    ? `${styles.statValue} ${styles[`statValue--${variant}`]}`
    : styles.statValue;
  return (
    <div className={styles.statRow}>
      <dt className={styles.statLabel} title={labelTitle}>{label}</dt>
      <dd className={valueClass}>
        {value}
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </dd>
    </div>
  );
}

// ─── Formulas (mirrored from WarframeSummaryCard) ───────────────

function computeDamageReduction(armor: number | null | undefined): number | null {
  if (armor == null) return null;
  return (armor / (armor + 300)) * 100;
}

function computeEffectiveHitPoints(
  health: number | null | undefined,
  shield: number | null | undefined,
  armor:  number | null | undefined,
): number | null {
  if (health == null || armor == null) return null;
  return (shield ?? 0) + health * (1 + armor / 300);
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
