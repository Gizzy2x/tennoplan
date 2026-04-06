import { useAscension } from './hooks/useAscension';
import { ChallengeCard } from './components/ChallengeCard';
import { SortieCard } from './components/SortieCard';
import {
  KIND_COLOR,
  KIND_LABEL,
  SORTIE_FACTION_COLOR,
} from '@/core/services/ascensionService';
import { formatMs } from '@/core/services/cycleService';
import type { ChallengeKind, ChallengeStatus } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Challenge group section header
// ---------------------------------------------------------------------------

function KindHeader({
  kind,
  statuses,
}: {
  kind:     ChallengeKind;
  statuses: ChallengeStatus[];
}) {
  const color     = KIND_COLOR[kind];
  const label     = KIND_LABEL[kind];
  const total     = statuses.length;
  const completed = statuses.filter(s => s.completed).length;

  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="font-label text-xs uppercase tracking-[0.35em] font-semibold"
        style={{ color, opacity: 0.65 }}
      >
        {label}
      </span>
      {/* Completion fraction */}
      <span
        className="font-mono text-[10px] tabular-nums px-2 py-0.5 font-bold"
        style={{
          color,
          border:          `1px solid ${color}40`,
          backgroundColor: `${color}10`,
        }}
      >
        {completed} / {total}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}20` }} />
      {/* Mini progress bar */}
      {total > 0 && (
        <div
          className="h-1 overflow-hidden"
          style={{ width: 64, backgroundColor: 'rgba(197,192,190,0.08)' }}
        >
          <div
            className="h-full"
            style={{
              width:           `${(completed / total) * 100}%`,
              backgroundColor: color,
              boxShadow:       completed === total ? `0 0 6px ${color}80` : 'none',
              transition:      'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AscensionRegistryPage() {
  const {
    grouped,
    sortieStatus,
    standing,
    totalChallenges,
    completedCount,
    season,
    seasonTag,
    isLoading,
    isError,
    lastSync,
    toggleComplete,
  } = useAscension();

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString([], {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  const syncState = isLoading ? 'SYNCING' : isError ? 'OFFLINE' : 'ONLINE';
  const syncWidth = isLoading ? '45%' : isError ? '12%' : '100%';

  const sortieColor = sortieStatus
    ? (SORTIE_FACTION_COLOR[sortieStatus.raw.faction] ?? '#C6C6C7')
    : '#C6C6C7';

  // Season display label — strip internal tag prefix if present
  const seasonLabel = season > 0
    ? `Season ${season}`
    : seasonTag || 'Nightwave';

  const standingRemaining = standing.available - standing.earned;

  // Challenge group render order
  const kindOrder: ChallengeKind[] = ['daily', 'weekly', 'elite'];

  return (
    <>
      {/* ── Celestial Asymmetry Header ─────────────────────────────── */}
      <section className="mb-10 grid grid-cols-12 gap-8 items-end">
        <div className="col-span-8">
          <span className="font-label text-xs uppercase tracking-[0.4em] text-primary mb-4 block">
            Protocol Registry 12.8
          </span>
          <div className="flex items-end gap-6">
            <h2 className="font-headline text-7xl font-black text-on-surface tracking-tighter leading-none">
              ASCENSION
              <br />
              <span className="text-primary italic">REGISTRY</span>
            </h2>
            <span className="font-label text-xs uppercase tracking-[0.3em] text-primary/40 whitespace-nowrap mb-2">
              — Mastery &amp; Progression
            </span>
          </div>
        </div>

        <div className="col-span-4 text-right">
          <div className="inline-block p-4 border-l border-primary/20 text-left w-full">
            <p className="font-label text-[10px] text-secondary opacity-40 uppercase tracking-widest">
              {syncState === 'SYNCING' ? 'Chronometry Sync' : 'Weekly Standing'}
            </p>
            <p className="font-headline text-3xl font-bold text-primary">
              {syncState === 'SYNCING' || syncState === 'OFFLINE'
                ? syncState
                : `${(standing.earned / 1000).toFixed(0)}k / ${(standing.available / 1000).toFixed(0)}k`}
            </p>
            <p className="font-label text-[10px] text-secondary/30 uppercase tracking-widest mt-0.5">
              {syncState === 'ONLINE' ? seasonLabel : lastSync ? `Updated ${lastSyncLabel}` : 'No sync yet'}
            </p>

            {/* Standing progress bar */}
            <div className="w-full h-px bg-surface-container-highest mt-2 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 h-full bg-primary shadow-[0_0_8px_#E3C372]"
                style={{ width: syncState === 'ONLINE' ? `${standing.pct * 100}%` : syncWidth, transition: 'width 0.5s ease' }}
              />
            </div>

            {/* Challenge completion summary */}
            {syncState === 'ONLINE' && totalChallenges > 0 && (
              <div
                className="flex gap-6 mt-5 pt-4"
                style={{ borderTop: '1px solid rgba(77,70,56,0.2)' }}
              >
                <div className="flex flex-col gap-0.5">
                  <p className="font-label text-[9px] uppercase tracking-[0.3em] text-primary/40">
                    Completed
                  </p>
                  <p className="font-mono text-xl font-bold tabular-nums leading-none text-primary">
                    {String(completedCount).padStart(2, '0')} / {String(totalChallenges).padStart(2, '0')}
                  </p>
                </div>
                {sortieStatus && (
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="font-label text-[9px] uppercase tracking-[0.3em]"
                      style={{ color: sortieColor, opacity: 0.55 }}
                    >
                      Sortie Reset
                    </p>
                    <p
                      className="font-mono text-xl font-bold tabular-nums leading-none"
                      style={{ color: sortieColor }}
                    >
                      {formatMs(sortieStatus.msRemaining)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Somatic divider */}
      <div className="somatic-line mb-8" />

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {isLoading && totalChallenges === 0 && (
        <div className="glass-panel p-8 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
            Querying Nora Night — fetching active challenges…
          </p>
        </div>
      )}

      {/* ── Hard error (no cache) ────────────────────────────────────── */}
      {isError && totalChallenges === 0 && (
        <div className="glass-panel p-8" style={{ borderColor: 'rgba(255,180,171,0.15)' }}>
          <p className="font-label text-xs uppercase tracking-[0.3em] text-error/60 mb-2">
            Signal Lost
          </p>
          <p className="font-label text-sm text-secondary/40 max-w-lg">
            No cached Nightwave data found. Establish a network connection to
            initialize Ascension Registry.
          </p>
        </div>
      )}

      {/* ── Sortie section ───────────────────────────────────────────── */}
      {sortieStatus && (
        <section className="mb-10">
          {/* Sortie header */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="font-label text-xs uppercase tracking-[0.35em] font-semibold"
              style={{ color: sortieColor, opacity: 0.70 }}
            >
              Daily Sortie
            </span>
            {/* Faction badge */}
            <span
              className="font-label text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 font-semibold"
              style={{
                color:           sortieColor,
                border:          `1px solid ${sortieColor}40`,
                backgroundColor: `${sortieColor}0D`,
              }}
            >
              {sortieStatus.raw.faction}
            </span>
            {/* Boss name */}
            <span
              className="font-label text-[10px] uppercase tracking-[0.2em]"
              style={{ color: '#C6C6C7', opacity: 0.35 }}
            >
              {sortieStatus.raw.boss}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: `${sortieColor}20` }} />
          </div>

          <div className="grid grid-cols-12 gap-5">
            {sortieStatus.raw.variants.map((mission, i) => (
              <div key={i} className="col-span-4">
                <SortieCard
                  mission={mission}
                  index={i}
                  faction={sortieStatus.raw.faction}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Challenge sections ───────────────────────────────────────── */}
      {totalChallenges > 0 && (
        <>
          <div className="somatic-line mb-8" />
          <div className="space-y-10">
            {kindOrder.map(kind => {
              const statuses = grouped[kind];
              if (statuses.length === 0) return null;
              return (
                <section key={kind}>
                  <KindHeader kind={kind} statuses={statuses} />
                  <div className="grid grid-cols-12 gap-4">
                    {statuses.map(s => (
                      <div key={s.raw.id} className="col-span-4">
                        <ChallengeCard status={s} onToggle={toggleComplete} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* ── Standing remaining footer ────────────────────────────────── */}
      {syncState === 'ONLINE' && standingRemaining > 0 && totalChallenges > 0 && (
        <p
          className="font-label text-[10px] uppercase tracking-widest mt-10"
          style={{ color: '#E3C372', opacity: 0.35 }}
        >
          {(standingRemaining / 1000).toFixed(0)}k standing remaining this week
        </p>
      )}

      {/* ── Offline notice ───────────────────────────────────────────── */}
      {isError && totalChallenges > 0 && (
        <p className="font-label text-[10px] uppercase tracking-widest text-secondary/30 mt-6">
          Offline — displaying cached challenge data. Completion state is local.
        </p>
      )}
    </>
  );
}
