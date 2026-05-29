/**
 * WarframeSummaryCard — the at-a-glance card that lives in the codex
 * entry page's sticky right rail for Warframe (and Prime-frame) entries.
 *
 * Three stat groups, deliberately ordered:
 *   1. Intrinsic  — Energy / Health / Shield / Sprint Speed (from data)
 *   2. Baselines  — Duration / Efficiency / Range / Strength at 100%
 *                   (static — the mod-system multipliers a future build
 *                   planner will mutate; showing them now primes the eye
 *                   and reserves the slots)
 *   3. Derived    — Armor / Damage Reduction / Effective Hit Points
 *                   (computed; formulas documented on hover via title)
 *
 * Formulas (deliberately transparent — labels carry the math in `title`):
 *   DR  = Armor / (Armor + 300)            … as a percentage
 *   EHP = Shield + Health × (1 + Armor/300)
 *
 * Both formulas match the community-canonical math. Overframe sometimes
 * publishes different EHP figures because it folds in passive uptime or
 * shield-gating assumptions; we deliberately don't, because those are
 * build-context and belong in a future planner — not the codex card.
 *
 * Ability icons currently render as static tiles. They become real
 * buttons once the ability detail view ships; that's why the tiles are
 * laid out as an interactive grid (consistent surface) but carry no
 * onClick yet — fake interactivity is worse than honest stillness.
 */

import clsx from 'clsx';
import type { CodexEntry } from '../../types';
import { getIconUrl } from '@/lib/icons/IconResolver';
import styles from './WarframeSummaryCard.module.css';

/**
 * Per-stat value tint. Only the three intrinsic stats carry an in-game
 * UI colour worth honouring (HP / shield / energy). Sprint, armor, and
 * the derived/baseline rows stay gold so the visual weight of accent
 * colour stays bounded — see .impeccable.md "Gold is accent" rule.
 */
type StatVariant = 'health' | 'shield' | 'energy';

interface WarframeSummaryCardProps {
  entry: CodexEntry;
}

export function WarframeSummaryCard({ entry }: WarframeSummaryCardProps) {
  const s = entry.stats;
  // No stats = no summary. The shell will fall back to single-column.
  if (!s) return null;

  const dr  = computeDamageReduction(s.armor);
  const ehp = computeEffectiveHitPoints(s.health, s.shield, s.armor);

  return (
    <aside className={styles.root} aria-label={`${entry.name} summary`}>
      <Portrait entry={entry} />
      <Identity category={entry.category} />
      <AbilityStrip entry={entry} />

      {/* ─── Group 1: intrinsic stats ─────────────────────────── */}
      <dl className={styles.statGroup}>
        {s.energy      != null && <StatRow label="Energy"       value={fmtInt(s.energy)} variant="energy" />}
        {s.health      != null && <StatRow label="Health"       value={fmtInt(s.health)} variant="health" />}
        {s.shield      != null && <StatRow label="Shield"       value={fmtInt(s.shield)} variant="shield" />}
        {s.sprintSpeed != null && <StatRow label="Sprint Speed" value={s.sprintSpeed.toFixed(2)} />}
      </dl>

      {/* ─── Group 2: mod-system baselines (static 100%) ──────── */}
      <dl className={styles.statGroup}>
        <StatRow label="Duration"   value="100" unit="%" />
        <StatRow label="Efficiency" value="100" unit="%" />
        <StatRow label="Range"      value="100" unit="%" />
        <StatRow label="Strength"   value="100" unit="%" />
      </dl>

      {/* ─── Group 3: derived (only render rows we can compute) ── */}
      {(s.armor != null || dr != null || ehp != null) && (
        <dl className={styles.statGroup}>
          {s.armor != null && (
            <StatRow label="Armor" value={fmtInt(s.armor)} />
          )}
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
  // data-prime attribute drives the gold-vs-teal radial glow in CSS —
  // the visual "this is a Prime" cue that doesn't lean on a word badge.
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
 * Atmospheric name watermark behind the portrait.
 *
 * Layout:
 *   • Base name on top, large, fills the container width via SVG textLength.
 *   • For Prime variants, "PRIME" renders as a smaller line below — its
 *     own SVG, centred, narrower so it reads as a subtitle, not a second
 *     headline. The portrait's gold radial glow (driven by data-prime on
 *     the container) is the primary non-text "this is a Prime" cue; the
 *     PRIME text simply continues the name in a wiki-familiar two-line
 *     form. The page header and aria-label carry the real semantic name.
 */
function NameBackdrop({ name }: { name: string }) {
  const isPrime  = /\bPrime\b/i.test(name);
  const baseName = isPrime ? name.replace(/\s*Prime\s*$/i, '').trim() : name;

  return (
    <div className={styles.nameBackdrop} aria-hidden="true">
      <svg
        className={styles.nameBackdropMain}
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
      >
        <text
          x="50"
          y="20"
          textAnchor="middle"
          textLength="98"
          lengthAdjust="spacingAndGlyphs"
          className={styles.nameBackdropText}
        >
          {baseName.toUpperCase()}
        </text>
      </svg>

      {isPrime && (
        <svg
          className={styles.nameBackdropSuffix}
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
        >
          <text
            x="50"
            y="8"
            textAnchor="middle"
            textLength="55"
            lengthAdjust="spacingAndGlyphs"
            className={styles.nameBackdropSuffixText}
          >
            PRIME
          </text>
        </svg>
      )}
    </div>
  );
}

function Identity({ category }: { category: string }) {
  return (
    <div className={styles.identity}>
      <span className={styles.category}>{category}</span>
    </div>
  );
}

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
  variant?:    StatVariant;
}

function StatRow({ label, labelTitle, value, unit, variant }: StatRowProps) {
  const valueClass = clsx(
    styles.statValue,
    variant && styles[`statValue--${variant}`],
  );
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

// ─── Formulas ────────────────────────────────────────────────────

/** Damage Reduction (%) — undefined when armor is missing. */
function computeDamageReduction(armor: number | null | undefined): number | null {
  if (armor == null) return null;
  return (armor / (armor + 300)) * 100;
}

/**
 * Effective Hit Points — community-canonical formula.
 * Shields are unarmored (added raw), health is armored. We deliberately
 * skip shield-gating math: it depends on build state, not base stats.
 */
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
