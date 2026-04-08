import { useWorldCycles } from './hooks/useWorldCycles';
import { CycleCard } from './components/CycleCard';
import { SyndicateMissionsPanel } from './components/SyndicateMissionsPanel';
import { SimarisPanel } from './components/SimarisPanel';
import { formatCacheAge } from '@/core/services/WorldstateService';
import type { CycleId } from '@/core/domain/cycles';

// Row 1 — the three main open-world farming cycles (featured, taller cards)
const ROW_1: CycleId[] = ['cetus', 'vallis', 'cambion'];

// Row 2 — three secondary cycles (standard height)
const ROW_2: CycleId[] = ['zariman', 'duviri', 'earth'];

export function CelestialPendulumPage() {
  const {
    statuses,
    isLoading,
    isError,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    lastSync,
    forceRefetch,
  } = useWorldCycles();

  const byId = Object.fromEntries(statuses.map(s => [s.cycle.id, s]));

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const syncState = isLoading ? 'SYNCING' : isError ? 'OFFLINE' : 'ONLINE';
  const syncWidth = isLoading ? '45%' : isError ? '12%' : '100%';

  return (
    <>
      {/* ── Celestial Asymmetry Header ─────────────────────────────── */}
      <section className="mb-10 grid grid-cols-12 gap-8 items-end">
        <div className="col-span-8">
          <span className="font-label text-xs uppercase tracking-[0.4em] text-primary mb-4 block">
            Orbital Trajectory 00.12
          </span>
          <div className="flex items-end gap-6">
            <h2 className="font-headline text-7xl font-black text-on-surface tracking-tighter leading-none">
              CELESTIAL
              <br />
              <span className="text-primary italic">PENDULUM</span>
            </h2>
            <span className="font-label text-xs uppercase tracking-[0.3em] text-primary/40 whitespace-nowrap mb-2">
              — World Cycle Chronometer
            </span>
          </div>
        </div>

        <div className="col-span-4 text-right">
          <div className="inline-block p-4 border-l border-primary/20 text-left">
            <p className="font-label text-[10px] text-secondary opacity-40 uppercase tracking-widest">
              Chronometry Sync
            </p>
            <p className="font-headline text-3xl font-bold text-primary">
              {syncState}
            </p>
            <p className="font-label text-[10px] text-secondary/30 uppercase tracking-widest mt-0.5">
              {lastSync ? `Updated ${lastSyncLabel}` : 'No sync yet'}
            </p>
            <div className="w-full h-px bg-surface-container-highest mt-2 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 h-full bg-primary shadow-[0_0_8px_#E3C372]"
                style={{ width: syncWidth, transition: 'width 0.5s ease' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Somatic divider */}
      <div className="somatic-line mb-8" />

      {/* ── Sync status + force refresh ───────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1" />
        <button
          onClick={forceRefetch}
          className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/35 hover:text-primary/70 transition-colors cursor-pointer"
          title="Force refresh cycle data"
        >
          ↻ Refresh
        </button>
        <div className={`w-1.5 h-1.5 rounded-full ${isStale ? 'bg-error/50' : 'bg-success'}`} />
        <span className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/35">
          {isStale ? 'STALE' : 'LIVE'}
        </span>
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {isLoading && statuses.length === 0 && (
        <div className="glass-panel p-8 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
            Establishing somatic link — fetching world states…
          </p>
        </div>
      )}

      {/* ── First-launch onboarding (no cache, no network) ──────────── */}
      {!hasEverLoaded && (
        <div className="glass-panel p-8 flex flex-col gap-4" style={{ borderColor: 'rgba(186,195,254,0.12)' }}>
          <p className="font-label text-xs uppercase tracking-[0.3em] text-tertiary/60">
            First Sync Required
          </p>
          <p className="font-label text-sm text-secondary/50 max-w-lg leading-relaxed">
            Tennoplan needs one network connection to initialize the Celestial Pendulum.
            After that, all cycle data persists locally — timers extrapolate forward
            and work fully offline.
          </p>
          <p className="font-label text-[10px] uppercase tracking-[0.28em] text-secondary/25">
            Connect to a network and this panel will populate automatically.
          </p>
        </div>
      )}

      {/* ── Section A: World Cycles ────────────────────────────────── */}
      {statuses.length > 0 && (
        <div className="space-y-3">

          {/* Row 1: Plains of Eidolon | Orb Vallis | Cambion Drift */}
          <div className="grid grid-cols-3 gap-3">
            {ROW_1.map(id =>
              byId[id] ? (
                <CycleCard key={id} status={byId[id]} featured />
              ) : null
            )}
          </div>

          {/* Row 2: Zariman | Duviri | Earth */}
          <div className="grid grid-cols-3 gap-3">
            {ROW_2.map(id =>
              byId[id] ? (
                <CycleCard key={id} status={byId[id]} />
              ) : null
            )}
          </div>

        </div>
      )}

      {/* ── Offline / stale-cache banner ─────────────────────────── */}
      {isStale && statuses.length > 0 && (
        <div className="flex items-center gap-3 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-error/50" />
          <p className="font-label text-[10px] uppercase tracking-widest text-secondary/30">
            Offline · Cached {formatCacheAge(cacheAgeMs)} · Timers extrapolated
          </p>
          <button
            onClick={forceRefetch}
            className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/25 hover:text-primary/60 transition-colors ml-auto cursor-pointer"
          >
            ↻ Retry
          </button>
        </div>
      )}

      {/* ── Section B: Syndicate Dispatches ──────────────────────── */}
      <div className="mt-10">
        <SyndicateMissionsPanel />
      </div>

      {/* ── Section C: Simaris Sanctuary ─────────────────────────── */}
      <div className="mt-10 mb-8">
        <SimarisPanel />
      </div>
    </>
  );
}
