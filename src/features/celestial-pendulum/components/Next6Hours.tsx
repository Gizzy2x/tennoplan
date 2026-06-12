/**
 * Next6Hours — a lazy, per-world "next 6 hours" cycle glance.
 *
 * Replaces the cross-world Timeline: instead of projecting every world far into
 * the future (heavy), this computes ONLY the selected world's next six hours,
 * and only while it's on screen. A Framer Motion "calculating…" loader plays
 * briefly on mount / world-change (the calc is cheap, but the beat makes the
 * reveal feel deliberate), then the bar wipes in.
 *
 * Colour: jade light = day-type phase, deep jade = night-type; gold ring + pip
 * marks prime windows. Reduced-motion skips the loader + wipe.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { CycleId, WorldCycle } from '@/core/domain/cycles';
import { useGameClock } from '@/hooks/useGameClock';
import { forecastCycle } from '../cycleForecast';
import { getActivity } from '../cycleActivity';
import styles from './Next6Hours.module.css';

/** Per-world view span. Fortuna's cycle is short (~15 min total), so a 6-hour
 *  window is a wall of segments — give it 2h. Everything else stays at 6h. */
const WINDOW_HOURS: Partial<Record<CycleId, number>> = { vallis: 2 };
const windowHoursFor = (id: CycleId) => WINDOW_HOURS[id] ?? 6;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clockAt = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Which phase reads as the "lighter" (day-type) band. Keeps day vs night
 *  instantly legible using jade lightness only — no new hues. */
function isLightPhase(id: CycleId, state: string): boolean {
  switch (id) {
    case 'cetus':   return state === 'day';
    case 'vallis':  return state === 'warm';
    case 'cambion': return state === 'fass';
    case 'zariman': return state === 'corpus';
    default:        return true; // duviri moods / unknown → mid jade
  }
}

interface Seg { state: string; isPrime: boolean; startMs: number; endMs: number; }

export function Next6Hours({ cycle, accent }: { cycle: WorldCycle; accent: string }) {
  const reduce = useReducedMotion();
  const now = useGameClock();
  const [ready, setReady] = useState(false);

  const hours = windowHoursFor(cycle.id);
  const windowMs = hours * 60 * 60_000;

  // Fake "calculating" beat on mount / world-change. Reduced-motion → instant.
  useEffect(() => {
    setReady(false);
    if (reduce) { setReady(true); return; }
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, [cycle.id, reduce]);

  // Anchor the 6h window when the cycle (re)loads — NOT every clock tick — so we
  // recompute only on view / flip. The now-line then drifts within the window.
  const anchor = useMemo(() => Date.now(), [cycle.id, cycle.activationMs, cycle.expiryMs, cycle.state]);
  const segs = useMemo<Seg[]>(() => {
    const end = anchor + windowMs;
    const list: Seg[] = [
      { state: cycle.state, isPrime: getActivity(cycle.id, cycle.state).isPrime, startMs: cycle.activationMs, endMs: cycle.expiryMs },
      ...forecastCycle(cycle, anchor, { horizonMs: windowMs, maxWindows: 60 }).map((w) => ({
        state: w.state, isPrime: w.isPrime, startMs: w.startMs, endMs: w.endMs,
      })),
    ];
    return list
      .filter((s) => s.endMs > anchor && s.startMs < end)
      .map((s) => ({ ...s, startMs: Math.max(s.startMs, anchor), endMs: Math.min(s.endMs, end) }));
  }, [cycle, anchor, windowMs]);

  const pct = (ms: number) => ((ms - anchor) / windowMs) * 100;
  const nowPct = Math.max(0, Math.min(100, ((now - anchor) / windowMs) * 100));

  return (
    <section className={styles.root} aria-label="Next six hours" style={{ ['--accent' as string]: accent } as React.CSSProperties}>
      <div className={styles.head}>
        <span className="typo-section-label">Next {hours} hours</span>
        <span className={styles.headNow}>now: <b>{cap(cycle.state)}</b></span>
      </div>

      <AnimatePresence mode="wait">
        {!ready ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className={styles.loading} aria-hidden="true" />
            <span className={styles.loadingText}>Calculating cycle…</span>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            <motion.div
              className={styles.bar}
              initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {segs.map((s) => {
                const left = pct(s.startMs);
                const width = pct(s.endMs) - left;
                if (width <= 0) return null;
                return (
                  <div
                    key={s.startMs}
                    className={styles.seg}
                    data-light={isLightPhase(cycle.id, s.state) || undefined}
                    data-dark={!isLightPhase(cycle.id, s.state) || undefined}
                    data-prime={s.isPrime || undefined}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${cap(s.state)} · ${clockAt(s.startMs)}–${clockAt(s.endMs)}`}
                  >
                    {width > 9 ? cap(s.state) : ''}
                    {s.isPrime && <span className={styles.segPip} aria-hidden="true">◆</span>}
                  </div>
                );
              })}
              <div className={styles.nowLine} style={{ left: `${nowPct}%` }} aria-hidden="true" />
            </motion.div>

            <div className={styles.ticks}>
              <span className={styles.tick}>{clockAt(anchor)}</span>
              <span className={styles.tick}>+{hours / 2}h</span>
              <span className={styles.tick}>{clockAt(anchor + windowMs)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
