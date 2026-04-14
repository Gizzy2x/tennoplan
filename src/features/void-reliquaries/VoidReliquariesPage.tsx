import { useState } from 'react';
import { useFissures, DEFAULT_FILTERS } from './hooks/useFissures';
import { FissureCard } from './components/FissureCard';
import { formatCacheAge } from '@/core/services/WorldstateService';
import {
  TIER_COLOR,
  sortTiersByEarliestExpiry,
} from '@/core/services/fissureService';
import { formatMs } from '@/core/services/cycleService';
import { TIER_ORDER } from '@/core/domain/relics';
import type { FissureFilters } from '@/core/services/fissureService';

// ---------------------------------------------------------------------------
// Filter toggle button
// ---------------------------------------------------------------------------

function FilterButton({
  active,
  color,
  label,
  onClick,
}: {
  active:   boolean;
  color:    string;
  label:    string;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="font-label text-[10px] uppercase tracking-[0.3em] px-3 py-1.5 rounded-sm transition-all"
      style={{
        color:           active ? color : 'rgba(197,192,190,0.3)',
        border:          `1px solid ${active ? `${color}50` : 'rgba(197,192,190,0.08)'}`,
        backgroundColor: active ? `${color}10` : 'transparent',
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tier section header
// ---------------------------------------------------------------------------

function TierHeader({ tier, count }: { tier: string; count: number }) {
  const color = TIER_COLOR[tier as keyof typeof TIER_COLOR] ?? '#E3C372';
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="font-headline text-3xl font-black uppercase tracking-[0.18em] orokin-etched"
        style={{ color }}
      >
        {tier}
      </span>
      <span
        className="font-mono text-xs tabular-nums px-2 py-0.5 font-bold"
        style={{
          color,
          border:          `1px solid ${color}40`,
          backgroundColor: `${color}12`,
        }}
      >
        {count}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}20` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function VoidReliquariesPage() {
  const [filters,     setFilters]     = useState<FissureFilters>(DEFAULT_FILTERS);
  const [showExpired, setShowExpired] = useState(false);
  const [sortByTime,  setSortByTime]  = useState(false);

  const {
    grouped,
    expiredStatuses,
    totalActive,
    steelPathCount,
    nextToExpire,
    isLoading,
    isError,
    isStale,
    cacheAgeMs,
    hasEverLoaded,
    lastSync,
  } = useFissures(filters);

  const toggle = (key: keyof FissureFilters) =>
    setFilters(f => ({ ...f, [key]: !f[key] }));

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

  const syncState = isLoading ? 'SYNCING' : isError ? 'OFFLINE' : 'ONLINE';
  const syncWidth = isLoading ? '45%' : isError ? '12%' : '100%';

  // Tier display order — either canonical or sorted by soonest expiry
  const tierOrder = sortByTime ? sortTiersByEarliestExpiry(grouped) : TIER_ORDER;

  return (
    <>
      {/* ── Celestial Asymmetry Header ─────────────────────────────── */}
      <section className="mb-10 grid grid-cols-12 gap-8 items-end">
        <div className="col-span-8">
          <span className="font-label text-xs uppercase tracking-[0.4em] text-primary mb-4 block">
            Manifest Inventory 77.A
          </span>
          <div className="flex items-end gap-6">
            <h2 className="font-headline text-7xl font-black text-on-surface tracking-tighter leading-none">
              VOID
              <br />
              <span className="text-primary italic">RELIQUARIES</span>
            </h2>
            <span className="font-label text-xs uppercase tracking-[0.3em] text-primary/40 whitespace-nowrap mb-2">
              — Active Fissure Manifest
            </span>
          </div>
        </div>

        <div className="col-span-4 text-right">
          <div className="inline-block p-4 border-l border-primary/20 text-left w-full">
            {/* Active count / sync state */}
            <p className="font-label text-[10px] text-secondary opacity-40 uppercase tracking-widest">
              {syncState === 'SYNCING' ? 'Chronometry Sync' : 'Active Fissures'}
            </p>
            <p className="font-headline text-3xl font-bold text-primary">
              {syncState === 'SYNCING' || syncState === 'OFFLINE'
                ? syncState
                : String(totalActive).padStart(2, '0')}
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

            {/* Summary stats: Steel Path count + Next to expire */}
            {syncState === 'ONLINE' && (
              <div
                className="flex gap-6 mt-5 pt-4"
                style={{ borderTop: '1px solid rgba(77,70,56,0.2)' }}
              >
                <div className="flex flex-col gap-0.5">
                  <p
                    className="font-label text-[9px] uppercase tracking-[0.3em]"
                    style={{ color: '#f87171', opacity: 0.55 }}
                  >
                    Steel Path
                  </p>
                  <p
                    className="font-mono text-xl font-bold tabular-nums leading-none"
                    style={{ color: '#f87171' }}
                  >
                    {String(steelPathCount).padStart(2, '0')}
                  </p>
                </div>
                {nextToExpire && (
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="font-label text-[9px] uppercase tracking-[0.3em]"
                      style={{ color: '#C6C6C7', opacity: 0.4 }}
                    >
                      Next Expiry
                    </p>
                    <p
                      className="font-mono text-xl font-bold tabular-nums leading-none"
                      style={{ color: '#E3C372' }}
                    >
                      {formatMs(nextToExpire.msRemaining)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Somatic divider */}
      <div className="somatic-line mb-6" />

      {/* ── Filter bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-8">
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-secondary/30 mr-2">
          Filter
        </span>
        <FilterButton
          active={filters.showNormal}
          color="#E3C372"
          label="Normal"
          onClick={() => toggle('showNormal')}
        />
        <FilterButton
          active={filters.showStorm}
          color="#bac3fe"
          label="Storm"
          onClick={() => toggle('showStorm')}
        />
        <FilterButton
          active={filters.showSteelPath}
          color="#f87171"
          label="Steel Path"
          onClick={() => toggle('showSteelPath')}
        />

        {/* Push sort + expired toggles to the right */}
        <div className="flex-1" />

        <FilterButton
          active={sortByTime}
          color="#E3C372"
          label="Shortest First"
          onClick={() => setSortByTime(v => !v)}
        />
        <FilterButton
          active={showExpired}
          color="#E3C372"
          label="Show Expired"
          onClick={() => setShowExpired(v => !v)}
        />

        {/* Sync status indicator */}
        <div className="flex items-center gap-3 ml-4">
          <div className={`w-1.5 h-1.5 rounded-full ${isStale ? 'bg-error/50' : 'bg-success'}`} />
          <span className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/35">
            {isStale ? 'STALE' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {isLoading && totalActive === 0 && (
        <div className="glass-panel p-8 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
            Querying void relay — fetching active fissures…
          </p>
        </div>
      )}

      {/* ── System Offline — no data ever synced and API unreachable ── */}
      {isError && (
        <div className="glass-panel p-8 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-error/70" />
            <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/50">
              System Offline · Data Unavailable
            </p>
          </div>
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-secondary/30">
            Unable to reach the Void relay. Check your network connection — cached data will
            display once a sync completes.
          </p>
        </div>
      )}

      {/* ── Active tier grid ───────────────────────────────────────── */}
      {totalActive > 0 && (
        <div className="space-y-8">
          {tierOrder.map(tier => {
            const statuses = grouped.get(tier) ?? [];
            if (statuses.length === 0) return null;

            return (
              <section key={tier}>
                <TierHeader tier={tier} count={statuses.length} />
                <div className="grid grid-cols-12 gap-6">
                  {statuses.map(s => (
                    <div key={s.fissure.id} className="col-span-4">
                      <FissureCard status={s} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── Empty state when filters hide everything ──────────────── */}
      {!isLoading && !isError && totalActive === 0 && hasEverLoaded && (
        <div className="glass-panel p-8 flex items-center justify-center min-h-48">
          <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/30">
            No fissures match active filters
          </p>
        </div>
      )}

      {/* ── Expired section (off by default) ─────────────────────── */}
      {showExpired && expiredStatuses.length > 0 && (
        <section className="mt-12">
          <div className="somatic-line mb-6" />
          <div className="flex items-center gap-3 mb-4">
            <span className="font-label text-[10px] uppercase tracking-[0.4em] text-secondary/30">
              Expired
            </span>
            <div className="flex-1 h-px bg-surface-container-highest" />
            <span className="font-mono text-[10px] tabular-nums text-secondary/30">
              {expiredStatuses.length}
            </span>
          </div>
          <div className="grid grid-cols-12 gap-4" style={{ opacity: 0.4 }}>
            {expiredStatuses.map(s => (
              <div key={s.fissure.id} className="col-span-4">
                <FissureCard status={s} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Offline / stale-cache banner ─────────────────────────── */}
      {isStale && totalActive > 0 && (
        <div className="flex items-center gap-3 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-error/50" />
          <p className="font-label text-[10px] uppercase tracking-widest text-secondary/30">
            Offline · Cached {formatCacheAge(cacheAgeMs)} · Fissure timings may be stale
          </p>
        </div>
      )}
    </>
  );
}
