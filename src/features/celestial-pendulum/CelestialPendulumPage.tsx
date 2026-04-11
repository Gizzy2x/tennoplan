import { useState } from 'react';
import { useWorldCycles }       from './hooks/useWorldCycles';
import { useSyndicateMissions } from './hooks/useSyndicateMissions';
import { CinematicCyclePanel }  from './components/CinematicCyclePanel';
import { WorldBackground }      from './components/WorldBackground';
import { STATE, FALLBACK, getCardGradient } from './components/CycleCard';
import { getWorldBg }           from './worldAssets';
import { formatMsParts }        from '@/core/services/cycleService';
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

/** Compact tab countdown: "1H 22M" when ≥1h, "10M 22S" otherwise */
function formatTabTime(msRemaining: number): string {
  const { h, m, s } = formatMsParts(msRemaining);
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  const sNum = parseInt(s, 10);
  if (hNum > 0) return `${hNum}H ${mNum}M`;
  return `${mNum}M ${sNum}S`;
}

export function CelestialPendulumPage() {
  // Default to first world — tab strip is the world switcher
  const [selectedId, setSelectedId] = useState<CycleId>('cetus');

  const {
    statuses,
    isLoading,
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

  const byId            = Object.fromEntries(statuses.map(s => [s.cycle.id, s]));
  const orderedStatuses = WORLD_ORDER.map(id => byId[id]).filter(Boolean);

  // Fall back to first loaded world if selectedId has no data yet
  const selectedStatus = byId[selectedId] ?? orderedStatuses[0] ?? null;
  const activeId       = selectedStatus?.cycle.id ?? selectedId;

  const bgUrl       = selectedStatus ? getWorldBg(selectedStatus.cycle.id, selectedStatus.cycle.state) : '';
  const cssGradient = selectedStatus
    ? getCardGradient(selectedStatus.cycle.id, selectedStatus.cycle.state)
    : '#131313';

  return (
    <>
    {/* WorldBackground is fixed-position — owns the bg image + bottom fade.
        Swap world images in worldAssets.ts. Sidebar width via --sidebar-w in index.css. */}
    <WorldBackground url={bgUrl} fallbackColor={cssGradient} />

    <div
      className="-mx-12 -mt-24 relative flex flex-col"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >

      {/* ── First-launch / no-data ───────────────────────────────────────── */}
      {!hasEverLoaded && (
        <div
          className="relative flex-1 flex items-center justify-center"
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

      {/* ── Main content ─────────────────────────────────────────────────── */}
      {orderedStatuses.length > 0 && (
        <div className="relative flex flex-col" style={{ zIndex: 5, height: '100%' }}>

          {/* ════════════════════════════════════════════════════════════════
              TOP AREA — page title + world tab strip
          ════════════════════════════════════════════════════════════════ */}
          <div style={{ padding: '88px 44px 0' }}>

            {/* Page heading */}
            <p
              style={{
                fontFamily:    'var(--font-body)',
                fontWeight:    700,
                fontSize:      '0.52rem',
                letterSpacing: '0.42em',
                color:         '#E3C372',
                textTransform: 'uppercase',
                marginBottom:  14,
              }}
            >
              Celestial Pendulum
            </p>

            {/* World tab strip */}
            <div
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           0,
                flexWrap:      'nowrap',
                overflowX:     'auto',
                scrollbarWidth: 'none',
              }}
            >
              {orderedStatuses.map(status => {
                const { cycle, msRemaining } = status;
                const pres     = STATE[cycle.state] ?? FALLBACK;
                const isActive = activeId === cycle.id;
                const tabTime  = formatTabTime(msRemaining);

                return (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedId(cycle.id as CycleId)}
                    style={{
                      display:       'flex',
                      alignItems:    'center',
                      gap:           6,
                      padding:       '6px 14px',
                      fontFamily:    'var(--font-body)',
                      fontSize:      '0.52rem',
                      fontWeight:    700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color:         isActive ? pres.color : 'rgba(198,198,199,0.60)',
                      background:    isActive ? `${pres.color}14` : 'transparent',
                      border:        isActive
                        ? `1px solid ${pres.color}45`
                        : '1px solid transparent',
                      cursor:      'pointer',
                      whiteSpace:  'nowrap',
                      flexShrink:  0,
                      transition:  'color 0.18s, border-color 0.18s, background 0.18s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(227,195,114,0.80)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${pres.color}28`;
                        (e.currentTarget as HTMLButtonElement).style.background = `${pres.color}08`;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(198,198,199,0.60)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', lineHeight: 1, opacity: isActive ? 1 : 0.55 }}>
                      {pres.icon}
                    </span>
                    <span>{cycle.location.toUpperCase()}</span>
                    <span
                      style={{
                        fontFamily:         'var(--font-body)',
                        fontSize:           '0.46rem',
                        fontVariantNumeric: 'tabular-nums',
                        opacity:            isActive ? 0.82 : 0.52,
                        letterSpacing:      '0.10em',
                      }}
                    >
                      {tabTime}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              CINEMATIC DETAIL — full-bleed single world (always visible)
          ════════════════════════════════════════════════════════════════ */}
          {selectedStatus && (
            <div
              className="relative flex"
              style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}
            >
              <CinematicCyclePanel
                key={activeId}
                status={selectedStatus}
                syndicateMission={missionByCycleId[activeId] ?? null}
                now={now}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Stale / offline banner ───────────────────────────────────────── */}
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

      {/* ── Sync pulse ───────────────────────────────────────────────────── */}
      {orderedStatuses.length > 0 && !isStale && isLoading && (
        <div
          className="absolute flex items-center gap-2"
          style={{ top: 22, right: 24, zIndex: 12 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      )}

    </div>
    </>
  );
}
