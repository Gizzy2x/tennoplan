import { useDailiesWeeklies } from './hooks/useDailiesWeeklies';
import { ChallengeCard } from './components/ChallengeCard';
import { SortieCard } from './components/SortieCard';
import { ArchonHuntCard } from './components/ArchonHuntCard';
import {
  KIND_COLOR,
  KIND_LABEL,
  SORTIE_FACTION_COLOR,
} from '@/core/services/ascensionService';
import { formatMsHuman } from '@/core/services/cycleService';
import type { ChallengeKind, ChallengeStatus } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Reset counter pill
// ---------------------------------------------------------------------------

function ResetCounter({
  label,
  msRemaining,
  urgentMs,
}: {
  label:      string;
  msRemaining: number;
  urgentMs:   number;
}) {
  const isUrgent   = msRemaining > 0 && msRemaining < urgentMs;
  const timeColor  = isUrgent ? '#fb923c' : '#E3C372';
  const timeStr    = msRemaining > 0 ? formatMsHuman(msRemaining) : '—';

  return (
    <div
      className="glass-panel px-5 py-3 flex flex-col gap-0.5 relative overflow-hidden"
      style={{ borderColor: `${timeColor}18` }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${timeColor}40, transparent)` }}
      />
      <p className="font-label text-[9px] uppercase tracking-[0.35em] text-secondary/40">
        {label}
      </p>
      <p
        className={['font-mono text-xl font-bold tabular-nums leading-none', isUrgent ? 'orokin-countdown-glow' : ''].filter(Boolean).join(' ')}
        style={{ color: timeColor }}
      >
        {timeStr}
      </p>
      <p className="font-label text-[8px] uppercase tracking-[0.25em] mt-0.5" style={{ color: timeColor, opacity: 0.35 }}>
        {isUrgent ? 'expires soon' : 'remaining'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Challenge group section header
// ---------------------------------------------------------------------------

// Per-kind display config for section headers
const KIND_SECTION: Record<ChallengeKind, {
  bg:      string;
  bord:    string;
  topBord: string;
  color:   string;
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
  const kColor    = KIND_COLOR[kind];
  const label     = KIND_LABEL[kind];
  const total     = statuses.length;
  const completed = statuses.filter(s => s.completed).length;
  const section   = KIND_SECTION[kind];

  return (
    <div className="flex items-center gap-3 mb-5 pb-0" style={{ paddingTop: '2px' }}>
      {/* Handle tab */}
      <div
        className="fissure-variant-tag flex-shrink-0"
        style={{
          background:   section.bg,
          borderTop:    `2px solid ${section.topBord}`,
          borderRight:  `1px solid ${section.bord}`,
          borderBottom: `1px solid ${section.bord}`,
          borderLeft:   `1px solid ${section.bord}`,
          color:        section.color,
          boxShadow:    `0 -2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)`,
        }}
      >
        {label}
      </div>

      {/* Completion fraction badge */}
      <span
        className="font-mono text-[10px] tabular-nums px-2 py-0.5 font-bold"
        style={{
          color:           kColor,
          border:          `1px solid ${kColor}40`,
          backgroundColor: `${kColor}0E`,
        }}
      >
        {completed} / {total}
      </span>

      <div className="flex-1 h-px" style={{ backgroundColor: `${kColor}18` }} />

      {/* Mini progress bar */}
      {total > 0 && (
        <div
          className="h-1 overflow-hidden"
          style={{ width: 64, backgroundColor: 'rgba(197,192,190,0.07)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width:           `${(completed / total) * 100}%`,
              backgroundColor: kColor,
              boxShadow:       completed === total ? `0 0 6px ${kColor}80` : 'none',
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

export function DailiesWeekliesPage() {
  const {
    grouped,
    sortieStatus,
    archonHuntStatus,
    standing,
    totalChallenges,
    completedCount,
    season,
    seasonTag,
    isLoading,
    isError,
    lastSync,
    toggleComplete,
  } = useDailiesWeeklies();

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString([], {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  const syncState  = isLoading ? 'SYNCING' : isError ? 'OFFLINE' : 'ONLINE';
  const syncWidth  = isLoading ? '45%' : isError ? '12%' : '100%';

  const sortieColor  = sortieStatus
    ? (SORTIE_FACTION_COLOR[sortieStatus.raw.faction] ?? '#C6C6C7')
    : '#C6C6C7';

  const seasonLabel = season > 0 ? `Season ${season}` : seasonTag || 'Nightwave';

  const standingRemaining = standing.available - standing.earned;

  // Reset countdowns derived from first challenge in each bucket
  const dailyMs  = grouped.daily[0]?.msRemaining  ?? 0;
  const weeklyMs = grouped.weekly[0]?.msRemaining ?? grouped.elite[0]?.msRemaining ?? 0;

  const kindOrder: ChallengeKind[] = ['daily', 'weekly', 'elite'];

  return (
    <>
      {/* ── Celestial Asymmetry Header ─────────────────────────────── */}
      <section className="mb-10 grid grid-cols-12 gap-8 items-end">
        <div className="col-span-8">
          <span className="font-label text-xs uppercase tracking-[0.4em] text-primary mb-4 block">
            Active Protocols
          </span>
          <h2 className="font-headline text-7xl font-black text-on-surface tracking-tighter leading-none">
            DAILIES &amp;
            <br />
            <span className="text-primary italic">WEEKLIES</span>
          </h2>
          <span className="font-label text-xs uppercase tracking-[0.3em] text-primary/40 block mt-3">
            — Nightwave &amp; Challenges
          </span>
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
                style={{
                  width:      syncState === 'ONLINE' ? `${standing.pct * 100}%` : syncWidth,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            {/* Challenge summary row */}
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

      {/* ── Reset Counters ───────────────────────────────────────────── */}
      {totalChallenges > 0 && syncState === 'ONLINE' && (
        <div className="flex flex-wrap gap-4 mb-6">
          {dailyMs > 0 && (
            <ResetCounter label="Daily Reset" msRemaining={dailyMs} urgentMs={6 * 3600_000} />
          )}
          {weeklyMs > 0 && (
            <ResetCounter label="Weekly Reset" msRemaining={weeklyMs} urgentMs={24 * 3600_000} />
          )}

          {/* Sync status chip */}
          <div className="ml-auto flex items-center gap-2 self-center">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/35">
              LIVE
            </span>
          </div>
        </div>
      )}

      {/* ── Standing Progress Block ──────────────────────────────────── */}
      {totalChallenges > 0 && syncState === 'ONLINE' && (
        <div
          className="glass-panel relative overflow-hidden mb-9 px-6 py-5"
          style={{ borderColor: 'rgba(227,195,114,0.12)' }}
        >
          {/* Background gold glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(227,195,114,0.04), transparent 70%)' }}
          />

          <div className="relative flex items-end justify-between gap-8">
            {/* Left: standing numbers */}
            <div>
              <p className="font-label text-[9px] uppercase tracking-[0.35em] text-primary/40 mb-1">
                Total Potential Standing
              </p>
              <div className="flex items-end gap-3">
                <p className="font-mono font-bold tabular-nums leading-none" style={{ fontSize: '2.4rem', color: '#E3C372' }}>
                  {(Math.max(0, standing.earned) / 1000).toFixed(0)}k
                </p>
                <p className="font-mono text-xl font-bold tabular-nums leading-none mb-0.5" style={{ color: 'rgba(227,195,114,0.40)' }}>
                  / {(Math.max(0, standing.available) / 1000).toFixed(0)}k
                </p>
              </div>
              <p className="font-label text-[9px] uppercase tracking-[0.25em] mt-1" style={{ color: 'rgba(227,195,114,0.35)' }}>
                standing earned this week
              </p>
            </div>

            {/* Right: challenge completion count + pct */}
            <div className="text-right flex-shrink-0">
              <p className="font-label text-[9px] uppercase tracking-[0.35em] text-primary/40 mb-1">
                Challenges Complete
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums leading-none text-primary">
                {String(completedCount).padStart(2, '0')}
                <span className="text-xl" style={{ color: 'rgba(227,195,114,0.35)' }}>
                  &nbsp;/ {String(totalChallenges).padStart(2, '0')}
                </span>
              </p>
              <p className="font-label text-[9px] uppercase tracking-[0.25em] mt-1" style={{ color: 'rgba(227,195,114,0.35)' }}>
                {Math.round(standing.pct * 100)}% of available standing
              </p>
            </div>
          </div>

          {/* Progress bar — full width, prominent */}
          <div
            className="relative mt-5 overflow-hidden"
            style={{ height: 4, backgroundColor: 'rgba(197,192,190,0.07)' }}
          >
            <div
              className="absolute inset-y-0 left-0 h-full transition-all duration-700"
              style={{
                width:      `${standing.pct * 100}%`,
                background: 'linear-gradient(90deg, rgba(227,195,114,0.7), #E3C372)',
                boxShadow:  '0 0 10px rgba(227,195,114,0.50)',
              }}
            />
          </div>
          {standingRemaining > 0 && (
            <p
              className="font-label text-[8px] uppercase tracking-[0.28em] mt-2"
              style={{ color: 'rgba(227,195,114,0.28)' }}
            >
              {(Math.max(0, standingRemaining) / 1000).toFixed(0)}k standing remaining this week
            </p>
          )}
        </div>
      )}

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
            initialize Dailies &amp; Weeklies.
          </p>
        </div>
      )}

      {/* ── Archon Hunt section ──────────────────────────────────────── */}
      {archonHuntStatus && (() => {
        const huntColor = SORTIE_FACTION_COLOR[archonHuntStatus.raw.faction] ?? '#C6C6C7';
        return (
          <section className="mb-10">
            <div className="flex items-center gap-4 mb-5">
              <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight leading-none">
                Weekly <span style={{ color: huntColor }} className="italic">Archon Hunt</span>
              </h3>
              <span
                className="font-label text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold"
                style={{
                  color:           huntColor,
                  border:          `1px solid ${huntColor}40`,
                  backgroundColor: `${huntColor}0D`,
                }}
              >
                {archonHuntStatus.raw.faction}
              </span>
              <span
                className="font-label text-[10px] uppercase tracking-[0.2em]"
                style={{ color: '#C6C6C7', opacity: 0.35 }}
              >
                {archonHuntStatus.raw.boss}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: `${huntColor}20` }} />
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{ color: huntColor, opacity: 0.55 }}
              >
                {formatMsHuman(archonHuntStatus.msRemaining)}
              </span>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {archonHuntStatus.raw.missions.map((mission, i) => (
                <div key={i} className="col-span-4">
                  <ArchonHuntCard
                    mission={mission}
                    index={i}
                    faction={archonHuntStatus.raw.faction}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ── Sortie section ───────────────────────────────────────────── */}
      {sortieStatus && (
        <section className="mb-10">
          <div className="flex items-center gap-4 mb-5">
            <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight leading-none">
              Daily <span style={{ color: sortieColor }} className="italic">Sortie</span>
            </h3>
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

      {/* ── Nightwave Challenge Grid ──────────────────────────────────── */}
      {totalChallenges > 0 && (
        <>
          <div className="somatic-line mb-8" />

          {/* Section title */}
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

          <div className="space-y-10">
            {kindOrder.map(kind => {
              const statuses = grouped[kind];
              if (statuses.length === 0) return null;
              return (
                <section key={kind}>
                  <KindHeader kind={kind} statuses={statuses} />

                  {/* Responsive challenge card grid */}
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {statuses.map(s => (
                      <ChallengeCard key={s.raw.id} status={s} onToggle={toggleComplete} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
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
