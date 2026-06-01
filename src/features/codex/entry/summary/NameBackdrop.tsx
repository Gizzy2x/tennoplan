/**
 * NameBackdrop — large low-opacity SVG name watermark behind the
 * summary-card portrait. Single-line text fits any name to the
 * container width via textLength + lengthAdjust ("spacingAndGlyphs").
 *
 * Why a primitive: three summary cards (Warframe / Weapon / Companion)
 * shipped identical copies of this component along with identical
 * .module.css rules. This file is the single source of truth — each
 * card now imports it once, and the typography decisions (gold tint,
 * serif weight, glyph squeezing) live in one place going forward.
 *
 * Why strip "Prime": for Prime variants the gold radial glow on the
 * portrait container is the deliberately wordless "this is a Prime"
 * signal. Echoing the word in the watermark would dilute that.
 */

import styles from './NameBackdrop.module.css';

interface NameBackdropProps {
  /** Display name. "Prime" suffix is stripped before rendering. */
  name: string;
}

export function NameBackdrop({ name }: NameBackdropProps) {
  const baseName = name.replace(/\s*Prime\s*$/i, '').trim();

  return (
    <svg
      className={styles.root}
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
        className={styles.text}
      >
        {baseName.toUpperCase()}
      </text>
    </svg>
  );
}
