/**
 * RightNowHero — the page's lead answer to "what's worth doing this moment?"
 *
 * Turns the six co-equal cycle cards into a decision: it surfaces the
 * high-value, time-gated windows (P0 prestige — Eidolon Hunt, Exploiter Orb,
 * Fass) that are ACTIVE now, sorted by which closes soonest, plus the ones
 * OPENING SOON. Renders nothing when there's nothing time-sensitive, so it
 * behaves like an alert rather than permanent chrome.
 *
 * Countdowns tick because the page re-renders each second (useGameClock drives
 * the cycle statuses) — no local timer here.
 */

import { memo } from 'react';
import type { CycleId } from '@/core/domain/cycles';
import { formatClock, formatCoarse } from '../cycleActivity';
import styles from '../CelestialPendulum.module.css';

export interface HeroActive {
  id:          CycleId;
  world:       string;
  region:      string;
  label:       string;
  blurb:       string;
  msRemaining: number;
  /** Share of the window still remaining (0–1) — drives the draining bar. */
  fraction:    number;
  accent:      string;
}

export interface HeroUpcoming {
  id:          CycleId;
  world:       string;
  label:       string;
  msRemaining: number;
  accent:      string;
}

interface RightNowHeroProps {
  active:   HeroActive[];
  upcoming: HeroUpcoming[];
  onSelect: (id: CycleId) => void;
}

export const RightNowHero = memo(function RightNowHero({ active, upcoming, onSelect }: RightNowHeroProps) {
  if (active.length === 0 && upcoming.length === 0) return null;

  return (
    <section className={styles.rightNow} aria-label="Worth doing right now">
      {active.length > 0 && (
        <>
          <div className={styles.rightNowHead}>
            <span className={styles.rightNowPulse} aria-hidden="true" />
            <span className="typo-section-label">Worth doing now</span>
          </div>
          <div className={styles.rightNowGrid}>
            {active.map((o) => (
              <button
                key={o.id}
                type="button"
                className={styles.rightNowCard}
                style={{ ['--accent' as string]: o.accent } as React.CSSProperties}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(o.id)}
                title={o.blurb}
              >
                <span className={styles.rightNowKicker}>
                  <span className={styles.rightNowKickerDot} aria-hidden="true" />
                  Prime window
                </span>
                <span className={styles.rightNowTitle}>{o.label}</span>
                <span className={styles.rightNowMeta}>{o.world} · {o.region}</span>
                <span className={styles.rightNowClock}>
                  {formatClock(o.msRemaining)} <em>left</em>
                </span>
                {/* Draining bar — the window's remaining share, ticking down
                    each second as the page re-renders. Flair WITH meaning. */}
                <span className={styles.rightNowBar} aria-hidden="true">
                  <span
                    className={styles.rightNowBarFill}
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, o.fraction))})` }}
                  />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <div className={styles.rightNowUpcoming}>
          <span className="typo-section-label">Opening soon</span>
          {upcoming.slice(0, 3).map((u) => (
            <button
              key={u.id}
              type="button"
              className={styles.rightNowUpItem}
              style={{ ['--accent' as string]: u.accent } as React.CSSProperties}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(u.id)}
            >
              <span className={styles.rightNowUpName}>{u.label}</span>
              <span className={styles.rightNowUpWorld}>{u.world}</span>
              <span className={styles.rightNowUpIn}>in {formatCoarse(u.msRemaining)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
});
