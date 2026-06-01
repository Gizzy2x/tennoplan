/**
 * CelestialPendulumPage — the Orrery.
 *
 * Live world-cycle timers, rebuilt (impeccable v3) as a single dense surface:
 *
 *   PageHero
 *   Orrery grid   — every tracked world as a planet-anchored cycle card:
 *                   draining ring (time made visible) + state + activity + clock
 *   World detail  — anchored hero for the selected world (planet bleed, big
 *                   countdown, activity intel, key-resource editorial rail)
 *   Bounty board  — compact reward browser for the selected world
 *   Footer        — reward-data freshness
 *
 * The previous six stacked panels (master header, dial rail, tactical radar,
 * bounty board, intel panel, footer) collapsed into two zones. All styling
 * lives in CelestialPendulum.module.css — no global index.css footprint.
 */

import { useState, useCallback, useMemo } from 'react';
import { PageHero }            from '@/components/ui/PageHero';
import { WORLD_THEMES }        from '@/tokens/worldThemes';
import type { CycleId, CycleState, CycleStatus } from '@/core/domain/cycles';
import { useWorldCycles }      from './hooks/useWorldCycles';
import { useSyndicateMissions } from './hooks/useSyndicateMissions';
import { useDropsLastSynced }  from './hooks/useDropsLastSynced';
import { useEnrichedBounties } from './hooks/useEnrichedBounties';
import { WorldBackground }     from './components/WorldBackground';
import { WorldCycleCard }      from './components/WorldCycleCard';
import { WorldActivityDetail } from './components/WorldActivityDetail';
import { BountyBoard }         from './components/BountyBoard';
import { CircuitPanel }        from './components/CircuitPanel';
import { useDuviriCircuit }    from './hooks/useDuviriCircuit';
import {
  ORRERY_ORDER,
  CYCLE_TO_SYNDICATE,
  getWorldMeta,
  getActivity,
  getKeyResources,
}                              from './cycleActivity';
import { getWorldBg }          from './worldAssets';
import styles                  from './CelestialPendulum.module.css';

const ACCENT_FALLBACK = 'var(--color-accent-jade)';

export function CelestialPendulumPage() {
  const [selectedId, setSelectedId] = useState<CycleId>('cetus');
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const { statuses, urgency, hasEverLoaded, isError, forceRefetch: refetchCycles, isDataOutOfSync } =
    useWorldCycles();
  const { missions, forceRefetch: refetchMissions } = useSyndicateMissions();
  const { ageLabel: dropsAgeLabel } = useDropsLastSynced();

  // Keyed lookup
  const byId = useMemo(
    () => Object.fromEntries(statuses.map((s) => [s.cycle.id, s])) as Partial<Record<CycleId, CycleStatus>>,
    [statuses],
  );

  // Worlds to render: curated order, only those with live data
  const worlds = useMemo(
    () => ORRERY_ORDER.filter((id) => byId[id]),
    [byId],
  );

  const selectedStatus = byId[selectedId] ?? (worlds[0] ? byId[worlds[0]] : null) ?? null;
  const activeId        = selectedStatus?.cycle.id ?? selectedId;
  const cycleState      = (selectedStatus?.cycle.state ?? 'day') as CycleState;
  const accent          = WORLD_THEMES[activeId]?.accent ?? ACCENT_FALLBACK;
  const bgUrl           = getWorldBg(activeId, cycleState);

  const meta      = getWorldMeta(activeId);
  const activity  = getActivity(activeId, cycleState);
  const resources = getKeyResources(activeId, cycleState);

  // Bounties for the selected world
  const syndicateName   = CYCLE_TO_SYNDICATE[activeId];
  const supportsBounties = Boolean(syndicateName);
  const selectedMission = syndicateName
    ? (missions.find((m) => m.syndicate === syndicateName) ?? null)
    : null;
  const { bounties } = useEnrichedBounties(selectedMission, activeId, cycleState);
  const duviriCircuit = useDuviriCircuit();

  // Bounty reward tables come from the drop-data sync (db.dropLocations). If a
  // world has active job tiers but no reward rows, the tables haven't been
  // synced — surface a clear prompt rather than empty reward grids.
  const hasRewardData = useMemo(
    () => bounties.some((b) => b.rotations.length > 0 || (b.fallbackPool?.length ?? 0) > 0),
    [bounties],
  );
  const bountiesToShow = hasRewardData ? bounties : [];

  const emptyReason = useMemo(() => {
    if (!supportsBounties) {
      return activeId === 'duviri'
        ? 'No rotating bounties here — rewards come from The Circuit and Duviri runs.'
        : 'No open-world bounty board for this world.';
    }
    if (!selectedMission) return 'Live bounty data hasn’t loaded yet — tap Refresh.';
    if (!hasRewardData)   return 'Bounty reward tables aren’t loaded — open Settings and refresh Drop Data to populate them.';
    return 'No active bounties in this rotation right now.';
  }, [supportsBounties, selectedMission, activeId, hasRewardData]);

  // One-click load of the WFCD bounty/drop tables (~10 MB, download-once) for
  // the bounty board's empty state — saves a trip to Settings.
  const handleLoadBountyData = useCallback(async () => {
    if (isLoadingData) return;
    setIsLoadingData(true);
    try {
      const { DropDataService } = await import('@/adapters/api/DropDataService');
      await DropDataService.fetchAndSync();
    } catch {
      /* live query stays empty; the user can retry */
    } finally {
      setIsLoadingData(false);
    }
  }, [isLoadingData]);

  const handleRefresh = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await Promise.all([refetchCycles(), refetchMissions()]);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refetchCycles, refetchMissions]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (!hasEverLoaded && !isError) {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingDot} />
        <span className={styles.loadingText}>Aligning the orrery…</span>
      </div>
    );
  }

  const refreshBtn = (
    <button onClick={() => void handleRefresh()} disabled={isSyncing} className={styles.refresh}>
      {isSyncing ? 'Syncing…' : '↻ Refresh'}
    </button>
  );

  return (
    <div className={styles.page} data-world={activeId}>
      <WorldBackground url={bgUrl} />

      <div className={styles.content}>
        <PageHero prefix="CELESTIAL" title="PENDULUM" right={refreshBtn} />

        {/* ── Orrery: all worlds at a glance ──────────────────────────── */}
        <div className={styles.orrery} role="group" aria-label="World cycles">
          {worlds.map((id) => {
            const status = byId[id]!;
            const state  = status.cycle.state;
            return (
              <WorldCycleCard
                key={id}
                id={id}
                meta={getWorldMeta(id)}
                status={status}
                urgency={urgency[id]}
                activity={getActivity(id, state)}
                accent={WORLD_THEMES[id]?.accent ?? ACCENT_FALLBACK}
                selected={id === activeId}
                onSelect={setSelectedId}
              />
            );
          })}
        </div>

        {/* ── Selected world detail ───────────────────────────────────── */}
        {selectedStatus && (
          <WorldActivityDetail
            meta={meta}
            status={selectedStatus}
            urgency={urgency[activeId]}
            activity={activity}
            accent={accent}
            resources={resources}
            staleData={isDataOutOfSync}
          />
        )}

        {/* ── Bounties (or Duviri's Circuit rotation) ─────────────────── */}
        {activeId === 'duviri'
          ? <CircuitPanel circuit={duviriCircuit} accent={accent} />
          : <BountyBoard
              bounties={bountiesToShow}
              accent={accent}
              emptyReason={emptyReason}
              onLoadData={supportsBounties && !hasRewardData ? handleLoadBountyData : undefined}
              isLoadingData={isLoadingData}
            />}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <span className={styles.footerDot} />
          <span className={styles.footerLabel}>Reward data updated {dropsAgeLabel}</span>
        </div>
      </div>
    </div>
  );
}
