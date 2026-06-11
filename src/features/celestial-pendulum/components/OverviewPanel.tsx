/**
 * OverviewPanel — the Observatory's default "All worlds" view.
 *
 * The zero-click landing: every cycle's live state + countdown in one board,
 * and the next prime windows across ALL worlds (dated) so the most common
 * question — "what's good now / what's next?" — is answered without drilling
 * into a place. Each surface drills into its place dossier on click.
 */

import { memo, useMemo } from 'react';
import type { CycleId } from '@/core/domain/cycles';
import { useGameClock } from '@/hooks/useGameClock';
import { formatClock, formatCoarse } from '../cycleActivity';
import { formatMsHuman } from '@/core/services/cycleService';
import { forecastCycle } from '../cycleForecast';
import { CycleRing } from './CycleRing';
import type { Place } from '../placesModel';
import styles from '../CelestialPendulum.module.css';

const JADE = 'var(--color-accent-jade)';
const GOLD = 'var(--color-accent-gold)';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
function dayPrefix(ms: number): string {
  const startOf = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const diff = Math.round((startOf(ms) - startOf(Date.now())) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

interface AggPrime { world: string; cycleId: CycleId; state: string; label: string; startMs: number; }

interface OverviewPanelProps {
  places:   Place[];
  onSelect: (key: string) => void;
}

export const OverviewPanel = memo(function OverviewPanel({ places, onSelect }: OverviewPanelProps) {
  const now = useGameClock();
  const cyclePlaces = useMemo(() => places.filter((p) => p.cycleId && p.status && p.meta), [places]);

  // Next prime windows across every world, merged + sorted + dated. Recompute
  // only when a cycle actually flips (the window timestamps are stable).
  const fingerprint = cyclePlaces.map((p) => `${p.cycleId}:${p.status?.cycle.expiryMs}`).join('|');
  const primes = useMemo<AggPrime[]>(() => {
    const out: AggPrime[] = [];
    for (const p of cyclePlaces) {
      if (!p.status || !p.cycleId || !p.meta) continue;
      for (const w of forecastCycle(p.status.cycle, Date.now(), { horizonMs: 7 * 24 * 60 * 60_000, maxWindows: 60 })) {
        if (w.isPrime) out.push({ world: p.meta.label, cycleId: p.cycleId, state: w.state, label: w.label, startMs: w.startMs });
      }
    }
    out.sort((a, b) => a.startMs - b.startMs);
    return out.slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return (
    <section className={styles.overview}>
      <span className="typo-section-label">All worlds</span>

      <div className={styles.overviewGrid}>
        {cyclePlaces.map((p) => {
          const status   = p.status!;
          const isPrime  = p.activity?.isPrime ?? false;
          const accent   = isPrime ? GOLD : JADE;
          const nextState = p.urgency?.nextStateKey.split('-')[1] ?? '';
          return (
            <button
              key={p.key}
              type="button"
              className={styles.overviewCard}
              data-prime={isPrime || undefined}
              style={{ ['--accent' as string]: accent } as React.CSSProperties}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(p.key)}
            >
              <CycleRing progress={status.progress} size={44} stroke={3} color={accent} pulse={isPrime || (p.urgency?.isPreHeat ?? false)}>
                {p.meta!.art ? (
                  <img
                    src={p.meta!.art}
                    alt=""
                    width={36}
                    height={36}
                    className={styles.overviewPlanet}
                    style={{ objectPosition: p.meta!.artPosition, transform: `scale(${p.meta!.artScale ?? 1})` }}
                    loading="lazy"
                  />
                ) : <span className={styles.placePlanetFallback} aria-hidden="true" />}
              </CycleRing>

              <span className={styles.overviewCardBody}>
                <span className={styles.overviewCardTop}>
                  <span className={styles.compactLabel}>{p.label}</span>
                  {isPrime && <span className={styles.placePip} title="Prime window">◆</span>}
                </span>
                <span className={styles.overviewState} style={{ color: accent }}>{cap(status.cycle.state)}</span>
                <span className={styles.overviewClock}>{formatClock(status.msRemaining)}</span>
                {nextState && (
                  <span className={styles.overviewNext}>→ {cap(nextState)} · {formatCoarse(status.msRemaining)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {primes.length > 0 && (
        <>
          <span className={`typo-section-label ${styles.overviewPrimesLabel}`}>Next prime windows</span>
          <ul className={styles.overviewPrimes}>
            {primes.map((pr) => (
              <li key={`${pr.cycleId}-${pr.startMs}`}>
                <button
                  type="button"
                  className={styles.overviewPrimeRow}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelect(pr.cycleId)}
                >
                  <span className={styles.overviewPrimeDot} aria-hidden="true" />
                  <span className={styles.overviewPrimeAct}>{pr.label}</span>
                  <span className={styles.overviewPrimeWorld}>{pr.world}</span>
                  <span className={styles.overviewPrimeWhen}>{dayPrefix(pr.startMs)} · {timeLabel(pr.startMs)}</span>
                  <span className={styles.overviewPrimeIn}>in {formatMsHuman(Math.max(0, pr.startMs - now))}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
});
