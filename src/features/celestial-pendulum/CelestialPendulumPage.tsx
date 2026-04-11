import { useState } from 'react';
import { useWorldCycles }       from './hooks/useWorldCycles';
import { useSyndicateMissions } from './hooks/useSyndicateMissions';
import { CinematicCyclePanel }  from './components/CinematicCyclePanel';
import { WorldOverviewPanel }   from './components/WorldOverviewPanel';
import { SyndicateMissionsPanel } from './components/SyndicateMissionsPanel';
import { SimarisPanel }         from './components/SimarisPanel';
import { formatCacheAge }       from '@/core/services/WorldstateService';
import type { CycleId }         from '@/core/domain/cycles';

// Maps each primary cycle to its corresponding syndicate name in the API
const CYCLE_TO_SYNDICATE: Partial<Record<CycleId, string>> = {
  cetus:   'Ostron',
  vallis:  'Solaris United',
  cambion: 'Entrati',
  zariman: 'The Holdfasts',
};

const WORLD_ORDER: CycleId[] = ['cetus', 'vallis', 'cambion', 'zariman', 'duviri', 'earth'];

export function CelestialPendulumPage() {
  // null = overview, CycleId = detail view
  const [selectedId, setSelectedId] = useState<CycleId | null>(null);

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

  const missionByName    = Object.fromEntries(missions.map(m => [m.syndicate, m]));
  const missionByCycleId = Object.fromEntries(
    (Object.entries(CYCLE_TO_SYNDICATE) as [CycleId, string][])
      .map(([id, name]) => [id, missionByName[name] ?? null])
  );

  const byId           = Object.fromEntries(statuses.map(s => [s.cycle.id, s]));
  const orderedStatuses = WORLD_ORDER.map(id => byId[id]).filter(Boolean);
  const selectedStatus  = selectedId ? (byId[selectedId] ?? null) : null;

  return (
    <div
      className="-mx-12 -mt-24 relative flex flex-col"
      style={{ minHeight: '100vh', overflowX: 'hidden' }}
    >

      {/* ── First-launch / no-data state ──────────────────────────────────── */}
      {!hasEverLoaded && (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ zIndex: 5, paddingTop: 96 }}
        >
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

      {/* ── Main content ──────────────────────────────────────────────────── */}
      {orderedStatuses.length > 0 && (
        <>
          {/* ════════════════════════════════════════════════════════════════
              DETAIL VIEW — full-bleed single world
          ════════════════════════════════════════════════════════════════ */}
          {selectedId !== null && selectedStatus && (
            <>
              {/* Back button */}
              <div
                className="absolute flex items-center gap-2"
                style={{ top: 88, left: 20, zIndex: 20 }}
              >
                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    fontFamily:    'var(--font-body)',
                    fontSize:      '0.52rem',
                    fontWeight:    700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color:         'rgba(227,195,114,0.60)',
                    background:    'rgba(0,0,0,0.55)',
                    border:        '1px solid rgba(227,195,114,0.18)',
                    padding:       '5px 12px',
                    cursor:        'pointer',
                    backdropFilter: 'blur(6px)',
                    transition:    'color 0.18s, border-color 0.18s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(227,195,114,0.90)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(227,195,114,0.40)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(227,195,114,0.60)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(227,195,114,0.18)';
                  }}
                >
                  ← OVERVIEW
                </button>
              </div>

              {/* Single-world cinematic panel */}
              <div
                className="relative flex"
                style={{
                  flex:      '1 0 0',
                  minHeight: 'clamp(380px, 56vh, 760px)',
                  zIndex:    5,
                  paddingTop: 80,
                }}
              >
                <CinematicCyclePanel
                  key={selectedId}
                  status={selectedStatus}
                  syndicateMission={missionByCycleId[selectedId]}
                  now={now}
                />
              </div>

              {/* Below-the-fold: Syndicate Dispatches + Simaris */}
              <div
                style={{
                  zIndex:     5,
                  flexShrink: 0,
                  borderTop:  '1px solid rgba(227,195,114,0.08)',
                }}
              >
                <div className="px-12 py-8">
                  <SyndicateMissionsPanel />
                </div>
                <div
                  style={{
                    height:     1,
                    background: 'linear-gradient(to right, transparent 0%, rgba(227,195,114,0.14) 20%, rgba(227,195,114,0.14) 80%, transparent 100%)',
                  }}
                />
                <div className="px-12 py-8">
                  <SimarisPanel standaloneSection />
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════
              OVERVIEW — horizontal panel grid
          ════════════════════════════════════════════════════════════════ */}
          {selectedId === null && (
            <div
              className="relative flex flex-col"
              style={{ flex: '1 0 0', minHeight: '100vh' }}
            >
              {/* Giant "CELESTIAL PENDULUM" title */}
              <div
                className="absolute pointer-events-none select-none"
                style={{
                  top:    0,
                  left:   0,
                  right:  0,
                  zIndex: 10,
                  padding: '18px 28px 0',
                }}
                aria-hidden
              >
                <h1
                  style={{
                    fontFamily:    'var(--font-headline)',
                    fontWeight:    900,
                    fontSize:      'clamp(1.4rem, 2.8vw, 3rem)',
                    lineHeight:    1,
                    color:         '#E3C372',
                    letterSpacing: '0.20em',
                    textTransform: 'uppercase',
                    textShadow:    '0 2px 24px rgba(0,0,0,0.90), 0 0 60px rgba(227,195,114,0.18)',
                  }}
                >
                  Celestial Pendulum
                </h1>
                <p
                  style={{
                    fontFamily:    'var(--font-body)',
                    fontSize:      '0.48rem',
                    letterSpacing: '0.40em',
                    color:         'rgba(227,195,114,0.40)',
                    textTransform: 'uppercase',
                    marginTop:     4,
                  }}
                >
                  World Cycle Monitor
                </p>
              </div>

              {/* Horizontal world panels */}
              <div
                className="flex"
                style={{
                  flex:       '1 0 0',
                  minHeight:  'calc(100vh - 0px)',
                }}
              >
                {orderedStatuses.map((status, i) => (
                  <WorldOverviewPanel
                    key={status.cycle.id}
                    status={status}
                    onSelect={(id) => setSelectedId(id as CycleId)}
                    isLast={i === orderedStatuses.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Offline / stale-cache banner ──────────────────────────────────── */}
      {isStale && orderedStatuses.length > 0 && (
        <div
          className="flex items-center gap-3 px-8 py-2"
          style={{
            zIndex:     10,
            background: 'rgba(13,13,13,0.88)',
            borderTop:  '1px solid rgba(255,255,255,0.05)',
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

      {/* ── Corner sync indicator ─────────────────────────────────────────── */}
      {orderedStatuses.length > 0 && !isStale && selectedId === null && (
        <div
          className="absolute flex items-center gap-2"
          style={{ top: 20, right: 24, zIndex: 12 }}
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
