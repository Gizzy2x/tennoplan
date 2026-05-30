/**
 * WeaponSummaryCard — sticky right-rail summary for Weapon entries.
 *
 * Three stat groups, deliberately ordered:
 *   1. Combat       — Damage, Fire Rate, Crit Chance, Crit Multiplier,
 *                     Status Chance. The numbers a player squints at to
 *                     judge whether to slot this weapon.
 *   2. Operation    — Magazine + Reload + Accuracy (ranged)
 *                     OR Range + Combo Duration + Follow Through +
 *                     Blocking Angle + Slam (melee). Group switches based
 *                     on the presence of melee-only stats — no weapon-class
 *                     string matching needed; absence drives the layout.
 *   3. Classification — Riven Disposition (numeric + 1–5 dots, the
 *                       in-game display), Mastery Rank, Trigger, Noise.
 *
 * The damage-type strip replaces Warframe's ability-tile row. Each present
 * damage type renders as an icon chip with its absolute number, sorted
 * descending so the dominant type lands left. This is the strongest
 * at-a-glance signal for "what kind of weapon is this".
 *
 * Riven disposition dot bands (community-canonical):
 *   1 dot: ≤ 0.74   |   2 dots: 0.75–0.99   |   3 dots: 1.00–1.21
 *   4 dots: 1.22–1.41   |   5 dots: ≥ 1.42
 * Source: wiki.warframe.com/w/Riven_Mods#Disposition. Bands shift slightly
 * across patches but the numeric multiplier is always authoritative.
 */

import clsx from 'clsx';
import type { CodexEntry } from '../../types';
import { TENNOICON_MAP } from '@/lib/tennoicons/tennoIconMap';
import styles from './WeaponSummaryCard.module.css';

interface WeaponSummaryCardProps {
  entry: CodexEntry;
}

export function WeaponSummaryCard({ entry }: WeaponSummaryCardProps) {
  const s = entry.stats;
  if (!s) return null;

  // Melee detection: presence of any melee-only numeric. Cheaper and more
  // robust than productCategory string-matching (handles arch-melee too).
  const isMelee =
    s.comboDuration   != null ||
    s.followThrough   != null ||
    s.blockingAngle   != null ||
    s.range           != null;

  return (
    <aside className={styles.root} aria-label={`${entry.name} summary`}>
      <Portrait entry={entry} />
      <Identity entry={entry} />
      <DamageStrip damageTypes={entry.damageTypes} />

      {/* ─── Group 1: combat profile ──────────────────────────── */}
      <dl className={styles.statGroup}>
        {s.damage != null && (
          <StatRow label="Damage" value={fmtNum(s.damage)} />
        )}
        {s.fireRate != null && (
          <StatRow
            label={isMelee ? 'Attack Speed' : 'Fire Rate'}
            value={s.fireRate.toFixed(2)}
            unit={isMelee ? '' : '/s'}
          />
        )}
        {s.critChance != null && (
          <StatRow
            label="Crit Chance"
            value={fmtPercent(s.critChance)}
            unit="%"
          />
        )}
        {s.critMultiplier != null && (
          <StatRow
            label="Crit Multiplier"
            value={s.critMultiplier.toFixed(1)}
            unit="x"
          />
        )}
        {s.statusChance != null && (
          <StatRow
            label="Status Chance"
            value={fmtPercent(s.statusChance)}
            unit="%"
          />
        )}
      </dl>

      {/* ─── Group 2: operation — ranged vs melee variant ─────── */}
      <OperationGroup stats={s} isMelee={isMelee} />

      {/* ─── Group 3: classification ──────────────────────────── */}
      <ClassificationGroup entry={entry} />
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
 * Watermark behind the weapon icon — same atmosphere as the warframe rail.
 * "Prime" is stripped because the gold radial glow already announces it.
 */
function NameBackdrop({ name }: { name: string }) {
  const baseName = name.replace(/\s*Prime\s*$/i, '').trim();
  return (
    <svg
      className={styles.nameBackdrop}
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      aria-hidden="true"
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
  );
}

/**
 * Identity row — weapon type (Rifle/Polearm/etc.) as the small subtitle
 * line, parallel to Warframe's category label. Falls back to the generic
 * category when no type is present.
 */
function Identity({ entry }: { entry: CodexEntry }) {
  const label = entry.type ?? entry.category;
  return (
    <div className={styles.identity}>
      <span className={styles.category}>{label}</span>
    </div>
  );
}

/**
 * Damage-type strip — one chip per non-zero damage type, sorted descending
 * so the dominant element (slash, impact, heat...) lands left. Renders
 * nothing if WFCD didn't ship a `damage` map (common for melee weapons
 * with attack-mode arrays, which are deferred to a later iteration).
 */
function DamageStrip({ damageTypes }: { damageTypes: Record<string, number> | undefined }) {
  if (!damageTypes) return null;

  const entries = Object.entries(damageTypes)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className={styles.damageStrip} role="list" aria-label="Damage breakdown">
      {entries.map(([type, value]) => {
        const iconUrl = damageIconFor(type);
        const pct = (value / total) * 100;
        return (
          <div
            key={type}
            className={styles.damageChip}
            role="listitem"
            title={`${prettyDamageType(type)} — ${value.toFixed(1)} (${pct.toFixed(0)}%)`}
          >
            {iconUrl && (
              <img
                src={iconUrl}
                alt={prettyDamageType(type)}
                className={styles.damageIcon}
                draggable={false}
                decoding="async"
              />
            )}
            <span className={styles.damageValue}>{Math.round(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function OperationGroup({ stats, isMelee }: { stats: NonNullable<CodexEntry['stats']>; isMelee: boolean }) {
  const s = stats;

  if (isMelee) {
    const hasAny =
      s.range != null || s.comboDuration != null || s.followThrough != null ||
      s.blockingAngle != null || s.slamAttack != null;
    if (!hasAny) return null;

    return (
      <dl className={styles.statGroup}>
        {s.range != null && (
          <StatRow label="Range" value={s.range.toFixed(1)} unit="m" />
        )}
        {s.comboDuration != null && (
          <StatRow label="Combo Duration" value={s.comboDuration.toFixed(1)} unit="s" />
        )}
        {s.followThrough != null && (
          <StatRow label="Follow Through" value={fmtPercent(s.followThrough)} unit="%" />
        )}
        {s.blockingAngle != null && (
          <StatRow label="Block Angle" value={fmtNum(s.blockingAngle)} unit="°" />
        )}
        {s.slamAttack != null && (
          <StatRow label="Slam Attack" value={fmtNum(s.slamAttack)} />
        )}
      </dl>
    );
  }

  const hasAny = s.magazine != null || s.reload != null || s.accuracy != null;
  if (!hasAny) return null;

  return (
    <dl className={styles.statGroup}>
      {s.magazine != null && (
        <StatRow label="Magazine" value={fmtNum(s.magazine)} />
      )}
      {s.reload != null && (
        <StatRow label="Reload" value={s.reload.toFixed(1)} unit="s" />
      )}
      {s.accuracy != null && (
        <StatRow label="Accuracy" value={s.accuracy.toFixed(1)} />
      )}
    </dl>
  );
}

function ClassificationGroup({ entry }: { entry: CodexEntry }) {
  const s = entry.stats;
  const hasRiven   = s?.rivenDisposition != null;
  const hasMastery = entry.masteryRank != null;
  const hasTrigger = entry.weaponTrigger != null;
  const hasNoise   = entry.weaponNoise != null;

  if (!hasRiven && !hasMastery && !hasTrigger && !hasNoise) return null;

  return (
    <dl className={styles.statGroup}>
      {hasRiven && (
        <RivenRow disposition={s!.rivenDisposition!} />
      )}
      {hasMastery && (
        <StatRow label="Mastery Rank" value={String(entry.masteryRank)} />
      )}
      {hasTrigger && (
        <StatRow label="Trigger" value={entry.weaponTrigger!} variant="text" />
      )}
      {hasNoise && (
        <StatRow label="Noise" value={entry.weaponNoise!} variant="text" />
      )}
    </dl>
  );
}

/** Riven disposition row — combines the precise multiplier with the
 *  community-familiar 1–5 dot display. */
function RivenRow({ disposition }: { disposition: number }) {
  const dots = rivenDots(disposition);
  return (
    <div className={styles.statRow}>
      <dt
        className={styles.statLabel}
        title="Riven disposition: 1–5 dots driven by omegaAttenuation (0.50–1.55). Higher = stronger Riven rolls."
      >
        Riven Disposition
      </dt>
      <dd className={styles.statValue}>
        <span className={styles.dotStrip} aria-label={`${dots} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={clsx(styles.dot, n <= dots && styles.dotFilled)}
              aria-hidden="true"
            />
          ))}
        </span>
        <span className={styles.rivenNumeric} title="omegaAttenuation">
          {disposition.toFixed(2)}×
        </span>
      </dd>
    </div>
  );
}

interface StatRowProps {
  label:    string;
  value:    string;
  unit?:    string;
  variant?: 'numeric' | 'text';
}

function StatRow({ label, value, unit, variant = 'numeric' }: StatRowProps) {
  return (
    <div className={styles.statRow}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={clsx(styles.statValue, variant === 'text' && styles.statValueText)}>
        {value}
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </dd>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * WFCD damage keys → tennoicon URLs. Keys are lowercased element names
 * straight from the WFCD `damage` object; the tennoicon map uses DE's
 * historical token names (FIRE/POISON/etc.) under the hood.
 */
function damageIconFor(type: string): string | undefined {
  const key = type.toLowerCase();
  // Map WFCD's element keys to DE's tennoicon tokens.
  switch (key) {
    case 'impact':       return TENNOICON_MAP['<DT_IMPACT_COLOR>'];
    case 'puncture':     return TENNOICON_MAP['<DT_PUNCTURE_COLOR>'];
    case 'slash':        return TENNOICON_MAP['<DT_SLASH_COLOR>'];
    case 'heat':         return TENNOICON_MAP['<DT_FIRE_COLOR>'];
    case 'cold':         return TENNOICON_MAP['<DT_FREEZE_COLOR>'];
    case 'electricity':  return TENNOICON_MAP['<DT_ELECTRICITY_COLOR>'];
    case 'toxin':        return TENNOICON_MAP['<DT_POISON_COLOR>'];
    case 'blast':        return TENNOICON_MAP['<DT_EXPLOSION_COLOR>'];
    case 'radiation':    return TENNOICON_MAP['<DT_RADIATION_COLOR>'];
    case 'gas':          return TENNOICON_MAP['<DT_GAS_COLOR>'];
    case 'magnetic':     return TENNOICON_MAP['<DT_MAGNETIC_COLOR>'];
    case 'viral':        return TENNOICON_MAP['<DT_VIRAL_COLOR>'];
    case 'corrosive':    return TENNOICON_MAP['<DT_CORROSIVE_COLOR>'];
    case 'void':         return TENNOICON_MAP['<DT_RADIANT_COLOR>'];
    case 'true':         return TENNOICON_MAP['<DT_TRUE_COLOR>'];
    default:             return undefined;
  }
}

function prettyDamageType(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Community-canonical Riven disposition bands (out of 5 dots).
 * Bands are inclusive on the lower bound; the upper bound is the start of
 * the next band. Numbers shift slightly between patches but the multiplier
 * itself is always authoritative — the dots are decoration.
 */
function rivenDots(d: number): number {
  if (d >= 1.42) return 5;
  if (d >= 1.22) return 4;
  if (d >= 1.00) return 3;
  if (d >= 0.75) return 2;
  return 1;
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
}

/** WFCD ships crit/status/follow-through as fractions (0.45 = 45%). */
function fmtPercent(n: number): string {
  return (n * 100).toFixed(1);
}
