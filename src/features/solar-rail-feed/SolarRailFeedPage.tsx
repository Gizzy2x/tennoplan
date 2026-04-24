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
import { PageHero } from '@/components/ui/PageHero';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatCacheAge } from '@/core/services/WorldstateService';
import { formatMsHuman } from '@/core/services/cycleService';
import { SORTIE_FACTION_COLOR } from '@/core/services/ascensionService';
import {
  AlertTriangle, Sword, Tag, Skull, Newspaper,
  Shield, Radio,
} from 'lucide-react';

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
  } = useSolarRailFeed();

  const syncState = isLoading ? 'SYNCING' : isError ? 'OFFLINE' : 'LIVE';

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

  return (
    <>
      <PageHero
        prefix="SOLAR RAIL"
        title="FEED"
        subtitle="Live Alerts, Invasions & Events"
        right={hasEverLoaded && !isError ? (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${syncState === 'LIVE' ? 'bg-success' : 'bg-error/50'}`} />
            <span className="font-label text-[9px] uppercase tracking-[0.3em] text-secondary/35">
              {syncState}
            </span>
          </div>
        ) : undefined}
      />

      {/* ── Initializing (no cached data yet) ──────────────────────────── */}
      {!hasEverLoaded && (
        <div className="glass-panel p-8 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/40">
            Initializing Systems…
          </p>
        </div>
      )}

      {/* ── System Offline — no data, API unreachable ──────────────────── */}
      {isError && (
        <div className="glass-panel p-8 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-error/70" />
            <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary/50">
              System Offline · Data Unavailable
            </p>
          </div>
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-secondary/30">
            Unable to reach the Solar Rail. Check your network connection — data will populate once a sync completes.
          </p>
        </div>
      )}

      {hasEverLoaded && !isError && (
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
                  <SectionHeader icon={Shield} label="Daily Sortie" color={sortieColor} />
                  <div className="flex items-center gap-3 -mt-3 mb-5">
                    <span
                      className="font-label text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold"
                      style={{ color: sortieColor, border: `1px solid ${sortieColor}40`, backgroundColor: `${sortieColor}0D` }}
                    >
                      {sortieStatus.raw.faction}
                    </span>
                    <span className="font-label text-[10px] uppercase tracking-[0.2em]" style={{ color: '#C6C6C7', opacity: 0.35 }}>
                      {sortieStatus.raw.boss}
                    </span>
                    <div className="flex-1" />
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
                  <SectionHeader icon={Skull} label="Weekly Archon Hunt" color={huntColor} />
                  <div className="flex items-center gap-3 -mt-3 mb-5">
                    <span
                      className="font-label text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold"
                      style={{ color: huntColor, border: `1px solid ${huntColor}40`, backgroundColor: `${huntColor}0D` }}
                    >
                      {archonHuntStatus.raw.faction}
                    </span>
                    <span className="font-label text-[10px] uppercase tracking-[0.2em]" style={{ color: '#C6C6C7', opacity: 0.35 }}>
                      {archonHuntStatus.raw.boss}
                    </span>
                    <div className="flex-1" />
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
