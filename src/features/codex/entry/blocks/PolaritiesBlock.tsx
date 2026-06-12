/**
 * PolaritiesBlock — mod slot polarity indicators.
 *
 * Polarity values arrive in one of two shapes depending on data source:
 *   • lowercase friendly names — "madurai", "vazarin", etc. (WFCD)
 *   • DE internal codes — "AP_ATTACK", "AP_DEFENSE", etc. (calamity raw)
 * The normalizer maps both to a canonical token used to look up the
 * inline SVG sigil. Unknown tokens render a muted glyph rather than
 * disappearing — better to surface the gap than hide it.
 *
 * Aura slot detection: when `auraPolarity` is set OR the first item
 * appears to be an aura type, that slot gets a teal ring. Otherwise
 * all polarities render uniformly.
 */

import clsx from 'clsx';
import {
  getPolarityIcon,
  POLARITY_LABEL,
} from '../../components/modFrameAssetsV3';
import type { CodexEntry } from '../../types';
import styles from './PolaritiesBlock.module.css';

interface PolaritiesBlockProps {
  entry: CodexEntry;
}

export function PolaritiesBlock({ entry }: PolaritiesBlockProps) {
  const hasPolarities = entry.polarities && entry.polarities.length > 0;
  const hasAura       = !!entry.auraPolarity;
  if (!hasPolarities && !hasAura) return null;

  const aura      = entry.auraPolarity ? normalizePolarity(entry.auraPolarity) : null;
  const equipable = (entry.polarities ?? []).map(normalizePolarity);

  return (
    <section className={styles.root} aria-labelledby="codex-polarities-label">
      <h2 id="codex-polarities-label" className="typo-section-label">Polarities</h2>
      <div className={styles.row}>
        {aura && (
          <PolaritySlot key="aura" polarity={aura} isAura />
        )}
        {equipable.map((p, i) => (
          <PolaritySlot
            key={`${p}-${i}`}
            polarity={p}
            isAura={false}
          />
        ))}
      </div>
    </section>
  );
}

interface PolaritySlotProps {
  polarity: string;
  isAura:   boolean;
}

function PolaritySlot({ polarity, isAura }: PolaritySlotProps) {
  const svg   = getPolarityIcon(polarity);
  const label = POLARITY_LABEL[polarity] ?? '?';
  const name  = polarity.charAt(0).toUpperCase() + polarity.slice(1);
  const known = svg !== null || POLARITY_LABEL[polarity] != null;

  return (
    <span
      className={clsx(
        styles.slot,
        isAura && styles['slot--aura'],
        !known && styles.muted,
      )}
      tabIndex={0}
      aria-label={`${isAura ? 'Aura: ' : ''}${name}`}
    >
      {svg
        ? <span className={styles.icon} dangerouslySetInnerHTML={{ __html: svg }} />
        : <span className={styles.iconText}>{label}</span>}
      <span className={styles.tooltip} role="tooltip">
        {isAura ? `Aura · ${name}` : name}
      </span>
    </span>
  );
}

// DE internal-code → friendly token map. Covers warframe + companion
// polarity codes encountered in the wild. Anything missing falls
// through to the input verbatim so a future code will still render
// as a label (just without an icon).
const POLARITY_CODE_MAP: Record<string, string> = {
  AP_ATTACK:    'madurai',
  AP_DEFENSE:   'vazarin',
  AP_TACTIC:    'naramon',
  AP_POWER:     'zenurik',
  AP_WARD:      'unairu',
  AP_PRECEPT:   'penjaga',
  AP_UMBRA:     'umbra',
  AP_ANY:       'universal',
  AP_UNIVERSAL: 'universal',
};

function normalizePolarity(raw: string): string {
  if (POLARITY_CODE_MAP[raw]) return POLARITY_CODE_MAP[raw]!;
  return raw.toLowerCase();
}
