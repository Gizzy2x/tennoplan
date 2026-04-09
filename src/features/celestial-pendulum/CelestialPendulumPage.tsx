import { useWorldCycles } from './hooks/useWorldCycles';
import { useSyndicateMissions } from './hooks/useSyndicateMissions';
import { CinematicCyclePanel } from './components/CinematicCyclePanel';
import { SimarisPanel } from './components/SimarisPanel';
import { formatCacheAge } from '@/core/services/WorldstateService';
import type { CycleId } from '@/core/domain/cycles';

// Worlds shown in the primary cinematic strip (with bounty data)
const ROW_1: CycleId[] = ['cetus', 'vallis', 'cambion', 'zariman'];
// Worlds shown in the compact secondary strip (no associated bounties)
const ROW_2: CycleId[] = ['duviri', 'earth'];

// Maps each primary cycle to its corresponding syndicate name in the API
const CYCLE_TO_SYNDICATE: Partial<Record<CycleId, string>> = {
  cetus:   'Ostron',
  vallis:  'Solaris United',
  cambion: 'Entrati',
  zariman: 'The Holdfasts',
};

export function CelestialPendulumPage() {
  const {
    statuses,
    isLoading,
    isError,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    now,
    forceRefetch,
  } = useWorldCycles();

  const { missions } = useSyndicateMissions();

  // Build a fast lookup: cycleId → SyndicateMission
  const missionByName   = Object.fromEntries(missions.map(m => [m.syndicate, m]));
  const missionByCycleId = Object.fromEntries(
    (Object.entries(CYCLE_TO_SYNDICATE) as [CycleId, string][])
      .map(([id, name]) => [id, missionByName[name] ?? null])
  );

  const byId           = Object.fromEntries(statuses.map(s => [s.cycle.id, s]));
  const row1Statuses   = ROW_1.map(id => byId[id]).filter(Boolean);
  const row2Statuses   = ROW_2.map(id => byId[id]).filter(Boolean);

  const divider = (
    <div
      style={{
        height:     1,
        background: 'linear-gradient(to right, transparent 0%, rgba(227,195,114,0.18) 20%, rgba(227,195,114,0.18) 80%, transparent 100%)',
        flexShrink: 0,
        zIndex:     5,
      }}
    />
  );

  return (
    <div className="-mx-12 -mt-24 relative flex flex-col overflow-hidden" style={{ minHeight: '100vh' }}>

      {/* Watermark title — visible enough to anchor the page, not enough to compete */}
      <div
        className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none select-none"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        <h1
          className="font-headline font-black leading-none whitespace-nowrap"
          style={{
            fontSize:    'clamp(4rem, 13vw, 11rem)',
            color:       'rgba(227,195,114,0.055)',
            paddingLeft: '0.75rem',
            paddingTop:  '0.15rem',
            letterSpacing: '-0.02em',
          }}
        >
          CELESTIAL PENDULUM
        </h1>
      </div>

      {/* ── First-launch / no-data state ──────────────────────────────── */}
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

      {/* ── Cinematic panels ─────────────────────────────────────────── */}
      {statuses.length > 0 && (
        <>
          {/* Row 1: Cetus | Orb Vallis | Cambion Drift | Zariman (primary — with bounties) */}
          <div
            className="relative flex"
            style={{ height: '62vh', minHeight: 380, zIndex: 5 }}
          >
            {row1Statuses.map(s => (
              <CinematicCyclePanel
                key={s.cycle.id}
                status={s}
                syndicateMission={missionByCycleId[s.cycle.id]}
                now={now}
              />
            ))}
          </div>

          {divider}

          {/* Row 2: Duviri | Earth (compact — mood/cycle timers only) */}
          <div
            className="relative flex"
            style={{ height: '28vh', minHeight: 200, zIndex: 5 }}
          >
            {row2Statuses.map(s => (
              <CinematicCyclePanel
                key={s.cycle.id}
                status={s}
                now={now}
                compact
              />
            ))}
          </div>

          {divider}

          {/* Simaris Sanctuary */}
          <div className="px-12 py-6" style={{ zIndex: 5, flexShrink: 0 }}>
            <SimarisPanel standaloneSection={false} />
          </div>
        </>
      )}

      {/* ── Offline / stale-cache banner ──────────────────────────────── */}
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

      {/* ── Corner sync indicator (non-intrusive) ────────────────────── */}
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
