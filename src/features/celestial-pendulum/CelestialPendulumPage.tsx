/**
 * CelestialPendulumPage — Live World Cycle Timers
 *
 * Layout:
 *   PageHero  (title + refresh button in right slot)
 *   CycleTabBar  (4 worlds, bg images, progress bars)
 *   TimerHeroPanel  (cinematic hero + key resources for current world/state)
 *   2-col grid:
 *     BountyDetailPanel  (all rotations + rewards as ResourceTags)
 *     CycleIntelPanel    (all-worlds summary + farming tips)
 *   Footer  (drop data age)
 *
 * No hardcoded hex values. No inline design token constants.
 * No redundant section headers — hierarchy comes from structure + spacing.
 */

import { useState, useCallback } from 'react';
import { PageHero }           from '@/components/ui/PageHero';
import { useWorldCycles }     from './hooks/useWorldCycles';
import { useSyndicateMissions } from './hooks/useSyndicateMissions';
import { useDropsLastSynced } from './hooks/useDropsLastSynced';
import { useEnrichedBounties } from './hooks/useEnrichedBounties';
import { WorldBackground }    from './components/WorldBackground';
import { CycleTabBar }        from './components/CycleTabBar';
import { TimerHeroPanel }     from './components/TimerHeroPanel';
import { BountyDetailPanel }  from './components/BountyDetailPanel';
import { CycleIntelPanel }    from './components/CycleIntelPanel';
import { DropDataService }    from '@/adapters/api/DropDataService';
import { formatMsParts }      from '@/core/services/cycleService';
import { getWorldBg }         from './worldAssets';
import type { CycleId, CycleStatus } from '@/core/domain/cycles';
import type { KeyResource }   from './components/TimerHeroPanel';

// ─── Static config ────────────────────────────────────────────────────────────

const WORLD_TABS: { id: CycleId; label: string }[] = [
  { id: 'cetus',   label: 'CETUS'   },
  { id: 'vallis',  label: 'FORTUNA' },
  { id: 'cambion', label: 'DEIMOS'  },
  { id: 'duviri',  label: 'DUVIRI'  },
];

const CYCLE_TO_SYNDICATE: Partial<Record<CycleId, string>> = {
  cetus:   'Ostron',
  vallis:  'Solaris United',
  cambion: 'Entrati',
  zariman: 'The Holdfasts',
};

const KEY_RESOURCES: Partial<Record<string, KeyResource[]>> = {
  'cetus-day': [
    { name: 'Cetus Wisp',        source: 'Plains (night)' },
    { name: 'Breath of Eidolon', source: 'Bounties Lv.4+' },
    { name: 'Iradite',           source: 'Rock formations' },
    { name: 'Grokdrul',          source: 'Grineer camps' },
    { name: 'Sentirum',          source: 'Mining (rare)' },
    { name: 'Nyth',              source: 'Mining (rare)' },
  ],
  'cetus-night': [
    { name: 'Arcane Energize',  source: 'Eidolon hunts' },
    { name: 'Cetus Wisp',       source: 'Plains (glowing)' },
    { name: 'Brilliant Eidolon Shard', source: 'Eidolons' },
    { name: 'Intact Sentient Core',    source: 'Sentients' },
  ],
  'vallis-warm': [
    { name: 'Gyromag Systems',  source: 'Heist bounties' },
    { name: 'Repeller Systems', source: 'Profit-Taker' },
    { name: 'Atmo Systems',     source: 'Coolant pools' },
    { name: 'Thermal Sludge',   source: 'Mining' },
    { name: 'Mytocardia Spore', source: 'Conservation' },
  ],
  'vallis-cold': [
    { name: 'Toroid',           source: 'Spiders & caves' },
    { name: 'Repeller Systems', source: 'Profit-Taker' },
    { name: 'Gyromag Systems',  source: 'Heist bounties' },
    { name: 'Thermal Sludge',   source: 'Coolant pools' },
    { name: 'Amarast',          source: 'Mining' },
  ],
  'cambion-fass': [
    { name: 'Scintillant',     source: 'Isolation Vaults' },
    { name: 'Son Token',       source: 'Conservation' },
    { name: 'Mother Token',    source: 'Bounties' },
    { name: 'Father Token',    source: 'Parts trading' },
    { name: 'Ganglion',        source: 'Infested deposits' },
  ],
  'cambion-vome': [
    { name: 'Vome Residue',    source: 'Vome worm' },
    { name: 'Pustulite',       source: 'Mining' },
    { name: 'Son Token',       source: 'Conservation' },
    { name: 'Mother Token',    source: 'Bounties' },
    { name: 'Ganglion',        source: 'Infested deposits' },
  ],
  'zariman-corpus': [
    { name: 'Voidplume Quill',     source: 'Bounties Lv.3' },
    { name: 'Voidplume Down',      source: 'Bounties Lv.2' },
    { name: 'Holdfast Token',      source: 'Bounties' },
    { name: 'Incarnon Genesis',    source: 'Bounties rare' },
  ],
  'zariman-grineer': [
    { name: 'Voidplume Quill',     source: 'Bounties Lv.3' },
    { name: 'Voidplume Down',      source: 'Bounties Lv.2' },
    { name: 'Holdfast Token',      source: 'Bounties' },
    { name: 'Incarnon Genesis',    source: 'Bounties rare' },
  ],
  'duviri-joy':    [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-anger':  [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-envy':   [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-sorrow': [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-fear':   [{ name: 'Pathos Clamp', source: 'The Circuit' }],
};

const WORLD_TIPS: Partial<Record<CycleId, string[]>> = {
  cetus: [
    'Eidolons roam the Plains at night — hunt Teralyst first, then chain to Gantulyst and Hydrolyst.',
    'Bounty rotations reset every cycle — check before the current phase ends.',
    'Cetus Wisps glow and are easier to spot at night near water.',
  ],
  vallis: [
    'Exploiter Orb only spawns during warm cycles — prepare coolant canisters in advance.',
    'Profit-Taker is available any cycle after completing all Vox Solaris heist bounties.',
    'Toroids drop at high-density spots near the Spaceport and Temple of Profit.',
  ],
  cambion: [
    'Fass Residue and Vome Residue are cycle-specific — collect both types for standing.',
    'Scintillant has a low spawn rate inside Isolation Vault rooms — check every chamber.',
    'Jugulus Rex and Carnis Rex require a specific cycle phase to spawn outdoors.',
  ],
  zariman: [
    'Voidplume Quill is the primary currency for Holdfast rank — prioritize Lv.3 bounties.',
    'Incarnon Genesis adapters rotate weekly — plan weapon upgrades around the schedule.',
    'Void Flood missions grant the most Holdfast standing per run.',
  ],
  duviri: [
    'The active Spiral determines which decree types appear — plan builds accordingly.',
    'Pathos Clamps are the main crafting resource for Duviri intrinsics and weapons.',
    'The Circuit weekly rotation changes available Warframes and weapons in Drifter mode.',
  ],
};

/** Cycle-state to special note for the TimerHero callout */
const CYCLE_NOTES: Partial<Record<string, string>> = {
  'cetus-night':  'Eidolon Hunting Window',
  'vallis-warm':  'Exploiter Orb Available',
  'cambion-fass': 'Fass Cycle Active',
  'cambion-vome': 'Vome Cycle Active',
};

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatTabTime(ms: number): string {
  const { h, m } = formatMsParts(ms);
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  return hNum > 0 ? `${hNum}h` : `${mNum}m`;
}

function formatHeroTime(ms: number): string {
  const { h, m } = formatMsParts(ms);
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  return hNum > 0 ? `${hNum}H: ${mNum}M` : `${mNum}M`;
}

function formatForecastTime(ms: number): string {
  const { h, m } = formatMsParts(ms);
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  return hNum > 0 ? `${hNum}h ${mNum}m` : `${mNum}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CelestialPendulumPage() {
  const [selectedId, setSelectedId] = useState<CycleId>('cetus');
  const [isSyncing,  setIsSyncing]  = useState(false);

  const { statuses, hasEverLoaded, isError, forceRefetch: refetchCycles } = useWorldCycles();
  const { missions, forceRefetch: refetchMissions } = useSyndicateMissions();
  const { ageLabel: dropsAgeLabel } = useDropsLastSynced();

  // Build a keyed record for easy lookup
  const byId = Object.fromEntries(
    statuses.map(s => [s.cycle.id, s])
  ) as Partial<Record<CycleId, CycleStatus>>;

  const selectedStatus = byId[selectedId] ?? byId['cetus'] ?? null;
  const cycleState     = (selectedStatus?.cycle.state ?? 'day') as string;
  const bgUrl          = getWorldBg(selectedId, cycleState);

  // Syndicate mission + enriched bounties for selected world
  const syndicateName   = CYCLE_TO_SYNDICATE[selectedId];
  const selectedMission = syndicateName
    ? (missions.find(m => m.syndicate === syndicateName) ?? null)
    : null;

  const { bounties } = useEnrichedBounties(selectedMission, selectedId, cycleState as Parameters<typeof useEnrichedBounties>[2]);

  // Key resources + tips + cycle note for current world/state
  const resources  = KEY_RESOURCES[`${selectedId}-${cycleState}`] ?? [];
  const tips       = WORLD_TIPS[selectedId] ?? [];
  const cycleNote  = CYCLE_NOTES[`${selectedId}-${cycleState}`] ?? null;

  // Pre-formatted times for tabs
  const tabTimes = Object.fromEntries(
    statuses.map(s => [s.cycle.id, formatTabTime(s.msRemaining)])
  ) as Partial<Record<CycleId, string>>;

  // Pre-formatted forecast times for intel panel
  const forecastTimes = Object.fromEntries(
    statuses.map(s => [s.cycle.id, formatForecastTime(s.msRemaining)])
  ) as Partial<Record<CycleId, string>>;

  const heroTime  = selectedStatus ? formatHeroTime(selectedStatus.msRemaining) : '—';
  const heroState = (selectedStatus?.cycle.state ?? '—').toUpperCase();

  const handleRefresh = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        DropDataService.fetchAndSync().catch(() => {}),
        refetchCycles(),
        refetchMissions(),
      ]);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refetchCycles, refetchMissions]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!hasEverLoaded && !isError) {
    return (
      <div className="cp-loading">
        <div className="cp-loading-dot" />
        <span className="typo-label-xs">Initializing Systems…</span>
      </div>
    );
  }

  // ── Refresh button (injected into PageHero right slot) ────────────────────
  const refreshBtn = (
    <button
      onClick={() => void handleRefresh()}
      disabled={isSyncing}
      className="cp-refresh-btn"
    >
      {isSyncing ? 'Syncing…' : '↻ Refresh'}
    </button>
  );

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', color: 'var(--color-text-primary)' }}>

      {/* Cinematic world background */}
      <WorldBackground url={bgUrl} />

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Page header */}
        <PageHero
          prefix="CELESTIAL"
          title="PENDULUM"
          right={refreshBtn}
        />

        {/* World tabs */}
        <CycleTabBar
          tabs={WORLD_TABS}
          statuses={byId}
          activeId={selectedId}
          onSelect={setSelectedId}
          times={tabTimes}
        />

        {/* Cinematic hero with timer + key resources */}
        <TimerHeroPanel
          backgroundImage={bgUrl}
          state={heroState}
          timeRemaining={heroTime}
          cycleNote={cycleNote}
          resources={resources}
        />

        {/* Bottom 2-column: bounties | intel */}
        <div className="cp-grid">
          <BountyDetailPanel
            bounties={bounties}
            hasMission={selectedMission !== null}
          />
          <CycleIntelPanel
            activeId={selectedId}
            statuses={byId}
            forecastTimes={forecastTimes}
            tips={tips}
          />
        </div>

        {/* Footer: reward data freshness */}
        <div className="cp-footer">
          <div className="cp-footer-dot" />
          <span className="cp-footer-label">Reward data updated {dropsAgeLabel}</span>
        </div>

      </div>
    </div>
  );
}
