/**
 * StaticPlaceHero — the parallel hero for static (no-cycle) givers.
 *
 * Sanctum Anatomica / Höllvania have no day/night clock, but they're full
 * PLACES like the cycle worlds — so they deserve the same composed hero, just
 * clock-less. This reuses WorldActivityDetail's `.detail*` classes verbatim so
 * the two heroes are structurally identical: a static (full, non-draining) ring
 * anchors an emblem on the left; identity + headline + activity + a set-once
 * editorial blurb radiate across the middle.
 *
 * Single accent — jade (always open / interactive), per the Codex two-colour
 * discipline. No per-giver accent.
 */

import { memo } from 'react';
import { CycleRing } from './CycleRing';
import styles from '../CelestialPendulum.module.css';

const JADE = 'var(--color-accent-jade)';

interface StaticPlaceHeroProps {
  /** Short place label, e.g. "SANCTUM". */
  label:  string;
  /** Region / hub, e.g. "Sanctum Anatomica". */
  region: string;
  /** Bounty-giver NPC, e.g. "Fibonacci". */
  npc?:   string;
  /** Set-once editorial line. */
  blurb?: string;
}

export const StaticPlaceHero = memo(function StaticPlaceHero({ label, region, npc, blurb }: StaticPlaceHeroProps) {
  return (
    <section
      className={styles.detail}
      style={{ ['--accent' as string]: JADE } as React.CSSProperties}
      aria-label={`${region} detail`}
    >
      {/* ── Anchor: a static, full (non-draining) ring around the emblem ─── */}
      <div className={styles.detailAnchor}>
        <CycleRing progress={0} size={132} stroke={5} color={JADE} pulse={false}>
          <span
            className={styles.detailPlanetFallback}
            style={{ ['--accent' as string]: JADE } as React.CSSProperties}
            aria-hidden="true"
          />
        </CycleRing>
      </div>

      {/* ── Intel: identity, headline, activity, blurb ───────────────────── */}
      <div className={styles.detailIntel}>
        <div className={styles.detailIdentity}>
          <span className="typo-section-label">{label}</span>
          <span className={styles.detailRegion}>{region}</span>
        </div>

        <h2 className={styles.detailState} style={{ color: JADE }}>
          {npc ?? 'Always Open'}
        </h2>

        <div className={styles.detailActivityRow}>
          <span className={styles.detailActivity}>Standing bounties · resets daily</span>
        </div>

        {blurb && <p className={styles.detailBlurb}>{blurb}</p>}
      </div>
    </section>
  );
});
