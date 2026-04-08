import { useWorldCycles } from './hooks/useWorldCycles';
import { CinematicCyclePanel } from './components/CinematicCyclePanel';
import { WorldSelectorTabs } from './components/WorldSelectorTabs';
import { formatCacheAge } from '@/core/services/WorldstateService';
import type { CycleId } from '@/core/domain/cycles';

const ROW_1: CycleId[] = ['cetus', 'vallis', 'cambion'];
const ROW_2: CycleId[] = ['zariman', 'duviri', 'earth'];

export function CelestialPendulumPage() {
  const {
    statuses,
    isLoading,
    isError,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    forceRefetch,
  } = useWorldCycles();

  const byId = Object.fromEntries(statuses.map(s => [s.cycle.id, s]));
  const row1Statuses = ROW_1.map(id => byId[id]).filter(Boolean);
  const row2Statuses = ROW_2.map(id => byId[id]).filter(Boolean);
  const allStatuses  = [...row1Statuses, ...row2Statuses];

  return (
    // Break out of AppShell's px-12 pt-24 padding for a full-bleed cinematic layout
    <div className="-mx-12 -mt-24 relative flex flex-col overflow-hidden" style={{ minHeight: '100vh' }}>

      {/* Giant watermark title — renders behind panels */}
      <div
        className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none select-none"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        <h1
          className="font-headline font-black leading-none whitespace-nowrap"
          style={{
            fontSize:   'clamp(4rem, 12vw, 10rem)',
            color:      'rgba(242,242,242,0.03)',
            paddingLeft: '0.5rem',
          }}
        >
          CELESTIAL PENDIUM
        </h1>
      </div>

      {/* ── First-launch / no-data states ──────────────────────────── */}
      {!hasEverLoaded && (
        <div className="flex-1 flex items-center justify-center" style={{ zIndex: 5 }}>
          <div className="glass-panel p-10 max-w-lg text-center flex flex-col gap-4">
            {isLoading ? (
              <>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse mx-auto" />
                <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
                  Establishing somatic link — fetching world states…
                </p>
              </>
            ) : (
              <>
                <p className="font-label text-xs uppercase tracking-[0.3em] text-tertiary/60">
                  First Sync Required
                </p>
                <p className="font-label text-sm text-secondary/50 leading-relaxed">
                  Tennoplan needs one network connection to initialize the Celestial Pendulum.
                  After that, all cycle data persists locally — timers extrapolate forward
                  and work fully offline.
                </p>
                <button
                  onClick={forceRefetch}
                  className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/30 hover:text-primary/70 transition-colors cursor-pointer mx-auto"
                >
                  ↻ Retry
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Cinematic panels ────────────────────────────────────────── */}
      {statuses.length > 0 && (
        <>
          {/* Row 1: Plains of Eidolon | Orb Vallis | Cambion Drift */}
          <div
            className="relative flex"
            style={{ height: '50vh', minHeight: 300, zIndex: 5 }}
          >
            {row1Statuses.map(s => (
              <CinematicCyclePanel key={s.cycle.id} status={s} />
            ))}
          </div>

          {/* Thin somatic divider between the two rows */}
          <div
            style={{
              height:     1,
              background: 'linear-gradient(to right, transparent 0%, rgba(227,195,114,0.18) 20%, rgba(227,195,114,0.18) 80%, transparent 100%)',
              flexShrink: 0,
              zIndex:     5,
            }}
          />

          {/* Row 2: Zariman Ten Zero | Duviri | Earth */}
          <div
            className="relative flex"
            style={{ height: '50vh', minHeight: 280, zIndex: 5 }}
          >
            {row2Statuses.map(s => (
              <CinematicCyclePanel key={s.cycle.id} status={s} />
            ))}
          </div>

          {/* World selector tabs */}
          {allStatuses.length > 0 && (
            <div style={{ zIndex: 5, flexShrink: 0 }}>
              <WorldSelectorTabs statuses={allStatuses} />
            </div>
          )}
        </>
      )}

      {/* ── Offline / stale-cache banner ────────────────────────────── */}
      {isStale && statuses.length > 0 && (
        <div
          className="flex items-center gap-3 px-8 py-2"
          style={{
            zIndex:     6,
            background: 'rgba(13,13,13,0.85)',
            borderTop:  '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-error/50 flex-shrink-0" />
          <p className="font-label text-[9px] uppercase tracking-widest text-secondary/30 flex-1">
            Offline · Cached {formatCacheAge(cacheAgeMs)} · Timers extrapolated
          </p>
          <button
            onClick={forceRefetch}
            className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/25 hover:text-primary/60 transition-colors cursor-pointer"
          >
            ↻ Retry
          </button>
        </div>
      )}

      {/* ── Corner sync indicator (non-intrusive) ───────────────────── */}
      {statuses.length > 0 && !isStale && (
        <div
          className="absolute top-6 right-6 flex items-center gap-2"
          style={{ zIndex: 10 }}
        >
          {isLoading && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
          {!isError && !isLoading && (
            <button
              onClick={forceRefetch}
              title="Force refresh"
              className="font-label text-[8px] uppercase tracking-[0.3em] text-secondary/20 hover:text-primary/50 transition-colors cursor-pointer"
            >
              ↻
            </button>
          )}
        </div>
      )}

    </div>
  );
}
