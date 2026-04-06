import { useAscension } from './hooks/useAscension';
import { ChallengeCard } from './components/ChallengeCard';
import { SortieCard } from './components/SortieCard';
import {
  KIND_COLOR,
  KIND_LABEL,
  SORTIE_FACTION_COLOR,
} from '@/core/services/ascensionService';
import { formatMsHuman } from '@/core/services/cycleService';
import type { ChallengeKind, ChallengeStatus } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Challenge group section header — overhanging handle tab (matches FissureCard)
// ---------------------------------------------------------------------------

// Per-kind tag palette — mirrors the tier-tag system from FissureCard
const KIND_TAG: Record<ChallengeKind, {
  bg:    string;
  bord:  string;
  color: string;
  topBord: string;
}> = {
  daily: {
    bg:      'rgba(229,226,225,0.92)',
    bord:    'rgba(227,195,114,0.45)',
    topBord: 'rgba(227,195,114,0.70)',
    color:   '#1a1a1a',
  },
  weekly: {
    bg:      'rgba(198,198,199,0.88)',
    bord:    'rgba(186,195,254,0.40)',
    topBord: 'rgba(186,195,254,0.65)',
    color:   '#1a1a1a',
  },
  elite: {
    bg:      'rgba(200,158,8,0.90)',
    bord:    'rgba(255,220,80,0.55)',
    topBord: 'rgba(255,220,80,0.80)',
    color:   '#131313',
  },
};

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
  const tag       = KIND_TAG[kind];

  return (
    <div className="flex items-center gap-3 mb-0 pb-3">
      {/* Handle tab — matches .fissure-variant-tag style: top-rounded, slightly
          overhangs the row, distinct color per kind */}
      <div
        className="fissure-variant-tag flex-shrink-0"
        style={{
          background:  tag.bg,
          borderTop:   `2px solid ${tag.topBord}`,
          borderRight: `1px solid ${tag.bord}`,
          borderBottom:`1px solid ${tag.bord}`,
          borderLeft:  `1px solid ${tag.bord}`,
          color:       tag.color,
          // Thin etched gold line at top gives premium Orokin depth
          boxShadow:   `0 -2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)`,
        }}
      >
        {label}
      </div>
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
                : `${(Math.max(0, standing.earned || 0) / 1000).toFixed(0)}k / ${(Math.max(0, standing.available || 0) / 1000).toFixed(0)}k`}
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
                      {formatMsHuman(sortieStatus.msRemaining)}
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
          {/* Sortie header with section title */}
          <div className="flex items-center gap-4 mb-5">
            <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight leading-none">
              Daily <span style={{ color: sortieColor }} className="italic">Sortie</span>
            </h3>
            {/* Faction badge */}
            <span
              className="font-label text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold"
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

          {/* Nightwave Challenges section title */}
          <div className="flex items-center gap-4 mb-7">
            <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight leading-none">
              Nightwave <span className="text-primary italic">Challenges</span>
            </h3>
            {season > 0 && (
              <span
                className="font-label text-[9px] uppercase tracking-[0.3em] px-2 py-0.5"
                style={{
                  color:           '#E3C372',
                  border:          '1px solid rgba(227,195,114,0.25)',
                  backgroundColor: 'rgba(227,195,114,0.06)',
                }}
              >
                Season {season}
              </span>
            )}
          </div>

          <div className="space-y-8">
            {kindOrder.map(kind => {
              const statuses = grouped[kind];
              if (statuses.length === 0) return null;
              const kColor   = KIND_COLOR[kind];
              return (
                <section key={kind} className="relative" style={{ paddingTop: '2px' }}>
                  <KindHeader kind={kind} statuses={statuses} />

                  {/* Two-column: left visual area + right checklist */}
                  <div className="grid grid-cols-12 gap-5">

                    {/* Left: visual/illustration placeholder — reserved for future Nightwave art */}
                    <div className="col-span-4">
                      <div
                        className="glass-panel h-full flex flex-col items-center justify-center p-6 relative overflow-hidden"
                        style={{
                          minHeight:   '160px',
                          borderColor: `${kColor}18`,
                          borderTop:   `1px solid ${kColor}25`,
                        }}
                      >
                        {/* Radial glow background */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at 50% 60%, ${kColor}2E, transparent 70%)` }}
                        />
                        {/* Filigree corners */}
                        <span
                          className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
                          style={{ borderTop: `1px solid ${kColor}35`, borderLeft: `1px solid ${kColor}35` }}
                        />
                        <span
                          className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none"
                          style={{ borderBottom: `1px solid ${kColor}20`, borderRight: `1px solid ${kColor}20` }}
                        />
                        {/* Kind label watermark */}
                        <p
                          className="font-headline text-4xl font-black text-center leading-tight select-none"
                          style={{ color: kColor, opacity: 0.07, letterSpacing: '-0.02em' }}
                        >
                          {KIND_LABEL[kind].toUpperCase()}
                        </p>
                        {/* Future: Nightwave season illustration */}
                        <p
                          className="font-label text-[8px] uppercase tracking-[0.4em] text-center mt-3"
                          style={{ color: kColor, opacity: 0.22 }}
                        >
                          Nora Night
                        </p>
                      </div>
                    </div>

                    {/* Right: vertical checklist */}
                    <div className="col-span-8 flex flex-col gap-3">
                      {statuses.map(s => (
                        <ChallengeCard key={s.raw.id} status={s} onToggle={toggleComplete} />
                      ))}
                    </div>

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
          {(Math.max(0, standingRemaining || 0) / 1000).toFixed(0)}k standing remaining this week
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
