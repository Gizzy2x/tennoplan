import { useThemeStore } from '@/store/theme';
import { getTypographyStyle } from '@/tokens/utils';
import { useDailiesData } from './hooks/useDailiesData';
import { PageHero } from '@/components/ui/PageHero';
import { formatCacheAge } from '@/core/services/WorldstateService';
import { ChallengeCard } from './components/ChallengeCard';
import { CompletionToggle } from './components/CompletionToggle';
import {
  KIND_COLOR,
  KIND_LABEL,
  NW_WEEKLY_STANDING_CAP,
} from '@/core/services/ascensionService';
import { formatMsHuman } from '@/core/services/cycleService';
import type { ChallengeKind, ChallengeStatus } from '@/core/domain/ascension';

type Tokens = ReturnType<typeof useThemeStore>['tokens'];

// ---------------------------------------------------------------------------
// Reset counter pill
// ---------------------------------------------------------------------------

function ResetCounter({
  label,
  msRemaining,
  urgentMs,
  tokens,
}: {
  label:       string;
  msRemaining: number;
  urgentMs:    number;
  tokens:      Tokens;
}) {
  const isUrgent  = msRemaining > 0 && msRemaining < urgentMs;
  const timeColor = isUrgent ? '#fb923c' : '#E3C372';
  const timeStr   = msRemaining > 0 ? formatMsHuman(msRemaining) : '—';

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
      <p
        data-role="labelTiny"
        style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.secondary, opacity: 0.40 }}
      >
        {label}
      </p>
      {/* Countdown — font-mono, intentionally not a token role */}
      <p
        className={['font-mono text-xl font-bold tabular-nums leading-none', isUrgent ? 'orokin-countdown-glow' : ''].filter(Boolean).join(' ')}
        style={{ color: timeColor }}
      >
        {timeStr}
      </p>
      <p
        data-role="labelTiny"
        className="mt-0.5"
        style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: timeColor, opacity: 0.35 }}
      >
        {isUrgent ? 'expires soon' : 'remaining'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Challenge group section header
// ---------------------------------------------------------------------------

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
      {/* Handle tab — decorative, uses CSS class for font */}
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

      {/* Completion fraction badge — font-mono, intentionally not a token role */}
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
  const { tokens } = useThemeStore();
  const {
    grouped,
    weeklyEarned,
    totalChallenges,
    completedCount,
    sortieCompleted,
    archonCompleted,
    season,
    seasonTag,
    isLoading,
    isError,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    lastSync,
    toggleComplete,
    toggleSortieCompleted,
    toggleArchonCompleted,
  } = useDailiesData();

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString([], {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  const syncState = isLoading ? 'SYNCING' : isError ? 'OFFLINE' : 'ONLINE';

  const seasonLabel = season > 0 ? `Season ${season}` : seasonTag || 'Nightwave';

  const weeklyPct          = Math.min(1, weeklyEarned / NW_WEEKLY_STANDING_CAP);
  const standingRemaining  = Math.max(0, NW_WEEKLY_STANDING_CAP - weeklyEarned);

  const dailyMs  = grouped.daily[0]?.msRemaining  ?? 0;
  const weeklyMs = grouped.weekly[0]?.msRemaining ?? grouped.elite[0]?.msRemaining ?? 0;

  const kindOrder: ChallengeKind[] = ['daily', 'weekly', 'elite'];

  // Suppress unused variable warnings from destructuring
  void lastSyncLabel; void syncState; void seasonLabel; void isError;

  return (
    <>
      <PageHero prefix="NIGHTWAVE" title="FEED" subtitle="Challenges & Weekly Progress" />

      {/* ── Reset Counters ───────────────────────────────────────────── */}
      {totalChallenges > 0 && syncState === 'ONLINE' && (
        <div className="flex flex-wrap gap-4 mb-6">
          {dailyMs > 0 && (
            <ResetCounter label="Daily Reset"  msRemaining={dailyMs}  urgentMs={6 * 3600_000}  tokens={tokens} />
          )}
          {weeklyMs > 0 && (
            <ResetCounter label="Weekly Reset" msRemaining={weeklyMs} urgentMs={24 * 3600_000} tokens={tokens} />
          )}

          {/* Sync status chip */}
          <div className="ml-auto flex items-center gap-3 self-center">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span
              data-role="labelTiny"
              style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.secondary, opacity: 0.35 }}
            >
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
              <p
                data-role="labelTiny"
                className="mb-1"
                style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.primary, opacity: 0.40 }}
              >
                Weekly Standing
              </p>
              {/* Large earned figure — font-mono */}
              <div className="flex items-end gap-3">
                <p className="font-mono font-bold tabular-nums leading-none" style={{ fontSize: '2.4rem', color: '#E3C372' }}>
                  {(weeklyEarned / 1000).toFixed(0)}k
                </p>
                <p className="font-mono text-xl font-bold tabular-nums leading-none mb-0.5" style={{ color: 'rgba(227,195,114,0.40)' }}>
                  / {(NW_WEEKLY_STANDING_CAP / 1000).toFixed(0)}k
                </p>
              </div>
              <p
                data-role="labelTiny"
                className="mt-1"
                style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: 'rgba(227,195,114,0.35)' }}
              >
                earned toward weekly cap
              </p>
            </div>

            {/* Right: challenge completion count + pct */}
            <div className="text-right flex-shrink-0">
              <p
                data-role="labelTiny"
                className="mb-1"
                style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.primary, opacity: 0.40 }}
              >
                Challenges Complete
              </p>
              {/* Large fraction — font-mono */}
              <p className="font-mono text-3xl font-bold tabular-nums leading-none text-primary">
                {String(completedCount).padStart(2, '0')}
                <span className="text-xl" style={{ color: 'rgba(227,195,114,0.35)' }}>
                  &nbsp;/ {String(totalChallenges).padStart(2, '0')}
                </span>
              </p>
              <p
                data-role="labelTiny"
                className="mt-1"
                style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: 'rgba(227,195,114,0.35)' }}
              >
                {Math.round(weeklyPct * 100)}% of weekly cap
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="relative mt-5 overflow-hidden"
            style={{ height: 4, backgroundColor: 'rgba(197,192,190,0.07)' }}
          >
            <div
              className="absolute inset-y-0 left-0 h-full transition-all duration-700"
              style={{
                width:      `${weeklyPct * 100}%`,
                background: 'linear-gradient(90deg, rgba(227,195,114,0.7), #E3C372)',
                boxShadow:  '0 0 10px rgba(227,195,114,0.50)',
              }}
            />
          </div>
          {standingRemaining > 0 && (
            <p
              data-role="labelTiny"
              className="mt-2"
              style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: 'rgba(227,195,114,0.28)' }}
            >
              {(standingRemaining / 1000).toFixed(0)}k standing remaining toward cap
            </p>
          )}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {isLoading && totalChallenges === 0 && (
        <div className="glass-panel p-8 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p
            data-role="labelTiny"
            style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.secondary, opacity: 0.40 }}
          >
            Querying Nora Night — fetching active challenges…
          </p>
        </div>
      )}

      {/* ── Initializing (no cached data yet) ──────────────────────── */}
      {!hasEverLoaded && (
        <div className="glass-panel p-8 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p
            data-role="labelTiny"
            style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.secondary, opacity: 0.40 }}
          >
            Initializing Systems…
          </p>
        </div>
      )}

      {/* ── Nightwave Challenge Grid ──────────────────────────────────── */}
      {totalChallenges > 0 && (
        <>
          <div className="somatic-line mb-8" />

          {/* Section title */}
          <div className="flex items-center gap-4 mb-7">
            <h3
              data-role="hero"
              className="leading-none"
              style={{ ...getTypographyStyle(tokens, 'hero'), fontSize: '1.5rem', color: tokens.colors.onSurface }}
            >
              Nightwave <span style={{ color: tokens.colors.primary, fontStyle: 'italic' }}>Challenges</span>
            </h3>
            {season > 0 && (
              <span
                data-role="labelTiny"
                className="px-2 py-0.5"
                style={{
                  ...getTypographyStyle(tokens, 'labelTiny'),
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

                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {statuses.map(s => (
                      <ChallengeCard
                        key={s.raw.id}
                        status={s}
                        onToggle={(id) => toggleComplete(id, s.raw.reputation)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* ── Completion Toggles ─────────────────────────────────────── */}
          <div className="somatic-line mt-10 mb-6" />
          <div className="glass-panel overflow-hidden" style={{ borderColor: 'rgba(227,195,114,0.08)' }}>
            <CompletionToggle
              label="Sortie Completed Today"
              sublabel="Resets daily"
              checked={sortieCompleted}
              onToggle={toggleSortieCompleted}
            />
            <div style={{ borderTop: '1px solid rgba(197,192,190,0.06)' }} />
            <CompletionToggle
              label="Archon Hunt Completed This Week"
              sublabel="Resets weekly"
              checked={archonCompleted}
              onToggle={toggleArchonCompleted}
            />
          </div>
        </>
      )}

      {/* ── Offline / stale-cache banner ─────────────────────────────── */}
      {isStale && totalChallenges > 0 && (
        <div className="flex items-center gap-3 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-error/50" />
          <p
            data-role="labelTiny"
            style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.secondary, opacity: 0.30 }}
          >
            Offline · Cached {formatCacheAge(cacheAgeMs)} · Local marks persist
          </p>
        </div>
      )}
    </>
  );
}
