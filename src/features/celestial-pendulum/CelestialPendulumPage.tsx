import { useState } from 'react';
import { useWorldCycles }       from './hooks/useWorldCycles';
import { useSyndicateMissions } from './hooks/useSyndicateMissions';
import { CinematicCyclePanel }  from './components/CinematicCyclePanel';
import { WorldSelectorTabs }    from './components/WorldSelectorTabs';
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

// All 6 worlds in display order
const WORLD_ORDER: CycleId[] = ['cetus', 'vallis', 'cambion', 'zariman', 'duviri', 'earth'];

export function CelestialPendulumPage() {
  const [selectedId, setSelectedId] = useState<CycleId>('cetus');

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

  // Build lookup: cycleId → SyndicateMission
  const missionByName    = Object.fromEntries(missions.map(m => [m.syndicate, m]));
  const missionByCycleId = Object.fromEntries(
    (Object.entries(CYCLE_TO_SYNDICATE) as [CycleId, string][])
      .map(([id, name]) => [id, missionByName[name] ?? null])
  );

  // Keep tab order stable: use WORLD_ORDER to sort statuses
  const byId      = Object.fromEntries(statuses.map(s => [s.cycle.id, s]));
  const orderedStatuses = WORLD_ORDER.map(id => byId[id]).filter(Boolean);

  const selectedStatus = byId[selectedId] ?? null;

  return (
    <div
      className="-mx-12 -mt-24 relative flex flex-col"
      style={{ minHeight: '100vh', overflowX: 'hidden' }}
    >

      {/* ── Watermark title ────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none select-none"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        <h1
          className="font-headline font-black leading-none whitespace-nowrap"
          style={{
            fontSize:      'clamp(4rem, 13vw, 11rem)',
            color:         'rgba(227,195,114,0.04)',
            paddingLeft:   '0.75rem',
            paddingTop:    '0.15rem',
            letterSpacing: '-0.02em',
          }}
        >
          CELESTIAL PENDULUM
        </h1>
      </div>

      {/* ── First-launch / no-data state ───────────────────────────────── */}
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

      {/* ── Main content ───────────────────────────────────────────────── */}
      {statuses.length > 0 && (
        <>
          {/* World selector tab bar — sits just below the AppShell header */}
          <div style={{ paddingTop: 80, zIndex: 10, flexShrink: 0 }}>
            <WorldSelectorTabs
              statuses={orderedStatuses}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />
          </div>

          {/* Single-world cinematic panel — fills remaining viewport height */}
          <div
            className="relative flex"
            style={{
              flex:      '1 0 0',
              minHeight: 'clamp(380px, 56vh, 760px)',
              zIndex:    5,
            }}
          >
            {selectedStatus && (
              <CinematicCyclePanel
                key={selectedId}
                status={selectedStatus}
                syndicateMission={missionByCycleId[selectedId]}
                now={now}
              />
            )}
          </div>

          {/* ── Below-the-fold: Syndicate Dispatches + Simaris ─────────── */}
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

      {/* ── Offline / stale-cache banner ──────────────────────────────── */}
      {isStale && statuses.length > 0 && (
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

      {/* ── Corner sync indicator ─────────────────────────────────────── */}
      {statuses.length > 0 && !isStale && (
        <div
          className="absolute flex items-center gap-2"
          style={{ top: 88, right: 24, zIndex: 12 }}
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
