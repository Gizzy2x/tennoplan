import { useSolarRailFeed } from './hooks/useSolarRailFeed';
import { InvasionCard } from './components/InvasionCard';
import { AlertCard } from './components/AlertCard';
import { DarvoDealCard } from './components/DarvoDealCard';
import { VoidTraderCard } from './components/VoidTraderCard';
import { SteelPathCard } from './components/SteelPathCard';
import { PersistentEnemyCard } from './components/PersistentEnemyCard';
import { NewsItemRow } from './components/NewsCard';
import { SortieCard } from './components/SortieCard';
import { ArchonHuntCard } from './components/ArchonHuntCard';
import { formatCacheAge } from '@/core/services/WorldstateService';
import { formatMsHuman } from '@/core/services/cycleService';
import { SORTIE_FACTION_COLOR } from '@/core/services/ascensionService';
import {
  AlertTriangle, Sword, Tag, Skull, Newspaper,
  Shield, Radio,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Section header — reusable across all 9 sections
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  label,
  count,
  color = '#E3C372',
}: {
  icon:   React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  label:  string;
  count?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <Icon size={18} strokeWidth={1.5} style={{ color, opacity: 0.70 }} />
      <span
        className="font-headline text-2xl font-black uppercase tracking-[0.12em] orokin-etched"
        style={{ color }}
      >
        {label}
      </span>
      {count != null && (
        <span
          className="font-mono text-xs tabular-nums px-2 py-0.5 font-bold"
          style={{ color, border: `1px solid ${color}40`, backgroundColor: `${color}12` }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}20` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SolarRailFeedPage() {
  const {
    alertStatuses,
    invasionStatuses,
    darvoDealStatuses,
    voidTraderStatus,
    steelPathStatus,
    enemyStatuses,
    newsItems,
    sortieStatus,
    archonHuntStatus,
    totalAlerts,
    totalInvasions,
    isLoading,
    isError,
    isStale,
    hasEverLoaded,
    cacheAgeMs,
    lastSync,
  } = useSolarRailFeed();

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const syncState = isLoading ? 'SYNCING' : isError ? 'OFFLINE' : 'LIVE';
  const syncWidth = isLoading ? '45%' : isError ? '12%' : '100%';

  const totalSections =
    (totalAlerts > 0 ? 1 : 0) +
    (totalInvasions > 0 ? 1 : 0) +
    (darvoDealStatuses.length > 0 ? 1 : 0) +
    1 + // void trader always shown
    (steelPathStatus ? 1 : 0) +
    (enemyStatuses.length > 0 ? 1 : 0) +
    (newsItems.length > 0 ? 1 : 0) +
    (sortieStatus ? 1 : 0) +
    (archonHuntStatus ? 1 : 0);

  const hasSomeData = totalSections > 1; // more than just void trader

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="mb-10 grid grid-cols-12 gap-8 items-end">
        <div className="col-span-8">
          <span className="font-label text-xs uppercase tracking-[0.4em] text-primary mb-4 block">
            Broadcast Signal 55.0
          </span>
          <div className="flex items-end gap-6">
            <h2 className="font-headline text-7xl font-black text-on-surface tracking-tighter leading-none">
              THE SOLAR
              <br />
              <span className="text-primary italic">RAIL FEED</span>
            </h2>
            <span className="font-label text-xs uppercase tracking-[0.3em] text-primary/40 whitespace-nowrap mb-2">
              — Live Worldstate / Events
            </span>
          </div>
        </div>

        <div className="col-span-4 text-right">
          <div className="inline-block p-4 border-l border-primary/20 text-left w-full">
            <p className="font-label text-[10px] text-secondary opacity-40 uppercase tracking-widest">
              {syncState === 'SYNCING' ? 'Acquiring Signal' : 'Feed Status'}
            </p>
            <p className="font-headline text-3xl font-bold text-primary">
              {syncState === 'SYNCING' || syncState === 'OFFLINE'
                ? syncState
                : `${totalAlerts}A · ${totalInvasions}I`}
            </p>
            <p className="font-label text-[10px] text-secondary/30 uppercase tracking-widest mt-0.5">
              {syncState === 'LIVE' ? `Updated ${lastSyncLabel}` : lastSync ? `Cached ${lastSyncLabel}` : 'No sync yet'}
            </p>
            <div className="w-full h-px bg-surface-container-highest mt-2 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 h-full bg-primary shadow-[0_0_8px_#E3C372]"
                style={{ width: syncWidth, transition: 'width 0.5s ease' }}
              />
            </div>
            {syncState === 'LIVE' && hasSomeData && (
              <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(77,70,56,0.2)' }}>
                <div className="flex flex-col gap-0.5">
                  <p className="font-label text-[9px] uppercase tracking-[0.3em] text-primary/40">Alerts</p>
                  <p className="font-mono text-xl font-bold tabular-nums leading-none text-primary">{totalAlerts}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-label text-[9px] uppercase tracking-[0.3em] text-primary/40">Invasions</p>
                  <p className="font-mono text-xl font-bold tabular-nums leading-none text-primary">{totalInvasions}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="somatic-line mb-8" />

      {/* ── Sync status indicator ──────────────────────────────────────── */}
      {hasEverLoaded && (
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-1.5 h-1.5 rounded-full ${syncState === 'LIVE' ? 'bg-success' : 'bg-error/50'}`} />
          <span className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/35">
            {syncState}
          </span>
        </div>
      )}

      {/* ── Initializing (no cached data yet) ──────────────────────────── */}
      {!hasEverLoaded && (
        <div className="glass-panel p-8 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
            Initializing Systems…
          </p>
        </div>
      )}

      {hasEverLoaded && (
        <div className="space-y-10">

          {/* ── 1. Alerts ──────────────────────────────────────────────── */}
          {alertStatuses.length > 0 && (
            <section>
              <SectionHeader icon={AlertTriangle} label="Active Alerts" count={alertStatuses.length} color="#E3C372" />
              <div className="grid grid-cols-12 gap-5">
                {alertStatuses.map(s => (
                  <div key={s.alert.id} className="col-span-6">
                    <AlertCard status={s} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 2. Invasions ───────────────────────────────────────────── */}
          {invasionStatuses.length > 0 && (
            <>
              {alertStatuses.length > 0 && <div className="somatic-line" />}
              <section>
                <SectionHeader icon={Sword} label="Active Invasions" count={invasionStatuses.length} color="#C6C6C7" />
                <div className="grid grid-cols-12 gap-5">
                  {invasionStatuses.map(s => (
                    <div key={s.invasion.id} className="col-span-6">
                      <InvasionCard status={s} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── 3. Darvo Deals ─────────────────────────────────────────── */}
          {darvoDealStatuses.length > 0 && (
            <>
              <div className="somatic-line" />
              <section>
                <SectionHeader icon={Tag} label="Darvo Deals" count={darvoDealStatuses.length} color="#E3C372" />
                <div className="grid grid-cols-12 gap-5">
                  {darvoDealStatuses.map(s => (
                    <div key={s.deal.id} className="col-span-4">
                      <DarvoDealCard status={s} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── 4. Void Trader (always shown) ──────────────────────────── */}
          <>
            <div className="somatic-line" />
            <section>
              <SectionHeader icon={Radio} label="Void Trader" color="#E3C372" />
              {voidTraderStatus ? (
                <VoidTraderCard status={voidTraderStatus} />
              ) : (
                <div className="glass-panel p-6 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
                    Loading Void Trader…
                  </p>
                </div>
              )}
            </section>
          </>

          {/* ── 5. Steel Path ──────────────────────────────────────────── */}
          {steelPathStatus && (
            <>
              <div className="somatic-line" />
              <section>
                <SectionHeader icon={Skull} label="Steel Path" color="#f87171" />
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-6">
                    <SteelPathCard status={steelPathStatus} />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ── 6. Persistent Enemies ──────────────────────────────────── */}
          {enemyStatuses.length > 0 && (
            <>
              <div className="somatic-line" />
              <section>
                <SectionHeader icon={Skull} label="Persistent Enemies" count={enemyStatuses.length} color="#f87171" />
                <div className="grid grid-cols-12 gap-5">
                  {enemyStatuses.map(s => (
                    <div key={s.enemy.id} className="col-span-4">
                      <PersistentEnemyCard status={s} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── 7. News ────────────────────────────────────────────────── */}
          {newsItems.length > 0 && (
            <>
              <div className="somatic-line" />
              <section>
                <SectionHeader icon={Newspaper} label="News" count={newsItems.length} color="#C6C6C7" />
                <div
                  className="glass-panel px-5 py-2"
                  style={{ borderColor: 'rgba(197,192,190,0.08)' }}
                >
                  {newsItems.map(item => (
                    <NewsItemRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── 8. Sortie ──────────────────────────────────────────────── */}
          {sortieStatus && (() => {
            const sortieColor = SORTIE_FACTION_COLOR[sortieStatus.raw.faction] ?? '#C6C6C7';
            return (
              <>
                <div className="somatic-line" />
                <section>
                  <div className="flex items-center gap-4 mb-5">
                    <Shield size={18} strokeWidth={1.5} style={{ color: sortieColor, opacity: 0.70 }} />
                    <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight leading-none">
                      Daily <span style={{ color: sortieColor }} className="italic">Sortie</span>
                    </h3>
                    <span
                      className="font-label text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold"
                      style={{ color: sortieColor, border: `1px solid ${sortieColor}40`, backgroundColor: `${sortieColor}0D` }}
                    >
                      {sortieStatus.raw.faction}
                    </span>
                    <span className="font-label text-[10px] uppercase tracking-[0.2em]" style={{ color: '#C6C6C7', opacity: 0.35 }}>
                      {sortieStatus.raw.boss}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: `${sortieColor}20` }} />
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: sortieColor, opacity: 0.55 }}>
                      {formatMsHuman(sortieStatus.msRemaining)}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-5">
                    {sortieStatus.raw.variants.map((mission, i) => (
                      <div key={i} className="col-span-4">
                        <SortieCard mission={mission} index={i} faction={sortieStatus.raw.faction} />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            );
          })()}

          {/* ── 9. Archon Hunt ─────────────────────────────────────────── */}
          {archonHuntStatus && (() => {
            const huntColor = SORTIE_FACTION_COLOR[archonHuntStatus.raw.faction] ?? '#C6C6C7';
            return (
              <>
                <div className="somatic-line" />
                <section>
                  <div className="flex items-center gap-4 mb-5">
                    <Skull size={18} strokeWidth={1.5} style={{ color: huntColor, opacity: 0.70 }} />
                    <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight leading-none">
                      Weekly <span style={{ color: huntColor }} className="italic">Archon Hunt</span>
                    </h3>
                    <span
                      className="font-label text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold"
                      style={{ color: huntColor, border: `1px solid ${huntColor}40`, backgroundColor: `${huntColor}0D` }}
                    >
                      {archonHuntStatus.raw.faction}
                    </span>
                    <span className="font-label text-[10px] uppercase tracking-[0.2em]" style={{ color: '#C6C6C7', opacity: 0.35 }}>
                      {archonHuntStatus.raw.boss}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: `${huntColor}20` }} />
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: huntColor, opacity: 0.55 }}>
                      {formatMsHuman(archonHuntStatus.msRemaining)}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-5">
                    {archonHuntStatus.raw.missions.map((mission, i) => (
                      <div key={i} className="col-span-4">
                        <ArchonHuntCard mission={mission} index={i} faction={archonHuntStatus.raw.faction} />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            );
          })()}

          {/* ── Empty state ────────────────────────────────────────────── */}
          {!isLoading && !isError && totalSections <= 1 && (
            <div className="glass-panel p-8 min-h-48 flex items-center justify-center">
              <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
                No active invasions or alerts
              </p>
            </div>
          )}

        </div>
      )}

      {/* ── Offline / stale-cache banner ───────────────────────────────── */}
      {isStale && hasEverLoaded && (
        <div className="flex items-center gap-3 mt-8">
          <div className="w-1.5 h-1.5 rounded-full bg-error/50" />
          <p className="font-label text-[10px] uppercase tracking-widest text-secondary/30">
            Offline · Cached {formatCacheAge(cacheAgeMs)} · Rail data may be stale
          </p>
        </div>
      )}

    </>
  );
}
