import { useState, useCallback } from 'react';
import { PageHero } from '@/components/ui/PageHero';
import { useWorldCycles }         from './hooks/useWorldCycles';
import { useSyndicateMissions }   from './hooks/useSyndicateMissions';
import { useDropsLastSynced }     from './hooks/useDropsLastSynced';
import { useEnrichedBounties }    from './hooks/useEnrichedBounties';
import { WorldBackground }        from './components/WorldBackground';
import { DropDataService }        from '@/adapters/api/DropDataService';
import { formatMsParts }          from '@/core/services/cycleService';
import { getWorldBg }             from './worldAssets';
import { Panel, PanelHeader, PanelLabel, PanelBody } from '@/components/ui/Panel';
import type { CycleId, CycleState } from '@/core/domain/cycles';
import type { EnrichedBounty }    from '@/core/domain/bounty';

// ─── Hardcoded design constants (replaces runtime token access) ────────────────
const FONT_SANS   = '"Noto Sans", -apple-system, sans-serif';
const FONT_SERIF  = '"Noto Serif", Georgia, serif';
const COLOR_PRIMARY   = '#E3C372';
const COLOR_SECONDARY = 'rgba(198,198,199,1)';
const COLOR_ON_SURFACE = 'rgba(229,226,225,1)';
const RADIUS_LG  = '6px';
const RADIUS_MD  = '4px';
const RADIUS_SM  = '2px';
const TRANSITION_FAST = '0.15s';
const SPACING_SM = '8px';
const SPACING_MD = '12px';
const GAP_SMALL  = '6px';
const GAP_MEDIUM = '4';    // used in parseInt() contexts
const GAP_TINY   = '3px';
const PANEL_PADDING_X = '12px';
const HEADER_PADDING_Y = '7px';

// ─────────────────────────────────────────────────────────────────────────────
// Static config
// ─────────────────────────────────────────────────────────────────────────────

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

interface KeyResource { icon: string; name: string; source: string; }

const KEY_RESOURCES: Partial<Record<string, KeyResource[]>> = {
  'cetus-day': [
    { icon: '◆', name: 'Cetus Wisp',        source: 'Plains (night)' },
    { icon: '✦', name: 'Breath of Eidolon', source: 'Bounties Lv.4+' },
    { icon: '◈', name: 'Iradite',           source: 'Rock formations' },
    { icon: '◎', name: 'Grokdrul',          source: 'Grineer camps' },
    { icon: '◇', name: 'Sentirum',          source: 'Mining (rare)' },
    { icon: '◆', name: 'Nyth',              source: 'Mining (rare)' },
  ],
  'cetus-night': [
    { icon: '✦', name: 'Arcane Energize',   source: 'Eidolon hunts' },
    { icon: '◆', name: 'Cetus Wisp',        source: 'Plains (glowing)' },
    { icon: '◈', name: 'Brilliant Shard',   source: 'Eidolons' },
    { icon: '◇', name: 'Intact Core',       source: 'Sentients' },
  ],
  'vallis-warm': [
    { icon: '◆', name: 'Gyromag Systems',   source: 'Heist bounties' },
    { icon: '✦', name: 'Repeller Systems',  source: 'Profit-Taker' },
    { icon: '◈', name: 'Atmo Systems',      source: 'Coolant pools' },
    { icon: '◎', name: 'Thermal Sludge',    source: 'Mining' },
    { icon: '◇', name: 'Mytocardia Spore',  source: 'Conservation' },
  ],
  'vallis-cold': [
    { icon: '◎', name: 'Toroid',            source: 'Spiders & caves' },
    { icon: '✦', name: 'Repeller Systems',  source: 'Profit-Taker' },
    { icon: '◈', name: 'Gyromag Systems',   source: 'Heist bounties' },
    { icon: '◎', name: 'Thermal Sludge',    source: 'Coolant pools' },
    { icon: '◇', name: 'Amarast',           source: 'Mining' },
  ],
  'cambion-fass': [
    { icon: '✦', name: 'Scintillant',       source: 'Isolation Vaults' },
    { icon: '◎', name: 'Son Tokens',        source: 'Conservation' },
    { icon: '◈', name: 'Mother Tokens',     source: 'Bounties' },
    { icon: '◆', name: 'Father Tokens',     source: 'Parts trading' },
    { icon: '◇', name: 'Ganglion',          source: 'Infested deposits' },
  ],
  'cambion-vome': [
    { icon: '◆', name: 'Vome Residue',      source: 'Vome worm' },
    { icon: '✦', name: 'Pustulite',         source: 'Mining' },
    { icon: '◈', name: 'Son Tokens',        source: 'Conservation' },
    { icon: '◇', name: 'Mother Tokens',     source: 'Bounties' },
    { icon: '◆', name: 'Ganglion',          source: 'Infested deposits' },
  ],
  'zariman-corpus': [
    { icon: '◆', name: 'Voidplume Quill',   source: 'Bounties Lv.3' },
    { icon: '✦', name: 'Voidplume Down',    source: 'Bounties Lv.2' },
    { icon: '◈', name: 'Holdfast Token',    source: 'Bounties' },
    { icon: '◇', name: 'Incarnon Genesis',  source: 'Bounties rare' },
  ],
  'zariman-grineer': [
    { icon: '◆', name: 'Voidplume Quill',   source: 'Bounties Lv.3' },
    { icon: '✦', name: 'Voidplume Down',    source: 'Bounties Lv.2' },
    { icon: '◈', name: 'Holdfast Token',    source: 'Bounties' },
    { icon: '◇', name: 'Incarnon Genesis',  source: 'Bounties rare' },
  ],
  'duviri-joy':    [{ icon: '◌', name: 'Pathos Clamp', source: 'The Circuit' }, { icon: '△', name: 'Duviri Arcane', source: 'The Circuit' }],
  'duviri-anger':  [{ icon: '◌', name: 'Pathos Clamp', source: 'The Circuit' }, { icon: '△', name: 'Duviri Arcane', source: 'The Circuit' }],
  'duviri-envy':   [{ icon: '◌', name: 'Pathos Clamp', source: 'The Circuit' }, { icon: '△', name: 'Duviri Arcane', source: 'The Circuit' }],
  'duviri-sorrow': [{ icon: '◌', name: 'Pathos Clamp', source: 'The Circuit' }, { icon: '△', name: 'Duviri Arcane', source: 'The Circuit' }],
  'duviri-fear':   [{ icon: '◌', name: 'Pathos Clamp', source: 'The Circuit' }, { icon: '△', name: 'Duviri Arcane', source: 'The Circuit' }],
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
    'Toroids drop at high-enemy-density spots near the Spaceport and Temple of Profit.',
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatHeroTime(ms: number): string {
  const { h, m } = formatMsParts(ms);
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  if (hNum > 0) return `${hNum}H: ${mNum}M`;
  return `${mNum}M`;
}

function formatTabTime(ms: number): string {
  const { h, m } = formatMsParts(ms);
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  if (hNum > 0) return `${hNum}h`;
  return `${mNum}m`;
}

function formatForecastTime(ms: number): string {
  const { h, m } = formatMsParts(ms);
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  if (hNum > 0) return `${hNum}h ${mNum}m`;
  return `${mNum}m`;
}

function getBountyRow(bounty: EnrichedBounty): { sub: string; pct: string } {
  if (bounty.rotations.length > 0) {
    const rotOrder = ['C', 'B', 'A', null] as const;
    let best = bounty.rotations[0];
    for (const tier of rotOrder) {
      const found = bounty.rotations.find(r => r.tier === tier);
      if (found) { best = found; break; }
    }
    const top = best.rewards[0];
    return {
      sub: top?.itemName ?? '—',
      pct: top ? `${top.chance.toFixed(1)}%` : '—',
    };
  }
  if (bounty.fallbackPool && bounty.fallbackPool.length > 0) {
    return { sub: bounty.fallbackPool[0], pct: '—' };
  }
  return { sub: 'No drop data', pct: '—' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CelestialPendulumPage() {
  const [selectedId, setSelectedId] = useState<CycleId>('cetus');
  const [isSyncing,  setIsSyncing]  = useState(false);

  const { statuses, hasEverLoaded, isError, forceRefetch: refetchCycles } = useWorldCycles();
  const { missions, forceRefetch: refetchMissions } = useSyndicateMissions();
  const { ageLabel: dropsAgeLabel } = useDropsLastSynced();

  const byId           = Object.fromEntries(statuses.map(s => [s.cycle.id, s]));
  const selectedStatus = byId[selectedId] ?? byId['cetus'] ?? null;
  const cycleState     = (selectedStatus?.cycle.state ?? 'day') as CycleState;
  const bgUrl          = getWorldBg(selectedId, cycleState);

  // Syndicate mission for the selected world
  const syndicateName   = CYCLE_TO_SYNDICATE[selectedId];
  const selectedMission = syndicateName
    ? (missions.find(m => m.syndicate === syndicateName) ?? null)
    : null;

  // Enriched bounties from Dexie drop data
  const { bounties } = useEnrichedBounties(selectedMission, selectedId, cycleState);

  // Key resources for current world + state
  const resources = KEY_RESOURCES[`${selectedId}-${cycleState}`] ?? [];

  // Farming tips for current world
  const tips = WORLD_TIPS[selectedId] ?? [];

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

  const heroTime  = selectedStatus ? formatHeroTime(selectedStatus.msRemaining) : '—';
  const heroState = selectedStatus?.cycle.state?.toUpperCase() ?? '—';

  if (!hasEverLoaded && !isError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px', color: 'rgba(198,198,199,0.40)' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e3c372', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <span className="typo-label-xs">
          Initializing Systems…
        </span>
      </div>
    );
  }


  return (
    <div style={{ color: COLOR_PRIMARY, position: 'relative' }}>

      {/* Cinematic world background */}
      <WorldBackground url={bgUrl} />

      {/* Content above background */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        <PageHero prefix="CELESTIAL" title="PENDULUM" subtitle="Live World Cycle Timers" />

        {/* ══════════════════════════════════════════════════════════════════
            WORLD TABS  — 4 equal cards
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 10 }}>
          {WORLD_TABS.map(({ id, label }) => {
            const status   = byId[id];
            const isActive = selectedId === id;
            const timeStr  = status ? formatTabTime(status.msRemaining) : '—';
            const state    = status?.cycle.state ?? '—';

            return (
              <button
                key={id}
                onClick={() => setSelectedId(id)}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         14,
                  padding:     '14px 18px',
                  background:  isActive ? 'rgba(227,195,114,0.07)' : 'rgba(10,10,8,0.80)',
                  border:      `1px solid ${isActive ? 'rgba(227,195,114,0.28)' : 'rgba(227,195,114,0.12)'}`,
                  borderLeft:  isActive ? '3px solid rgba(227,195,114,0.75)' : '3px solid transparent',
                  borderRadius: RADIUS_LG,
                  cursor:      'pointer',
                  textAlign:   'left',
                  transition:  `all ${TRANSITION_FAST} ease`,
                }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width:          44,
                    height:         44,
                    borderRadius:   '6px',
                    border:         `1px solid ${isActive ? 'rgba(227,195,114,0.38)' : 'rgba(227,195,114,0.18)'}`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                    background:     isActive ? 'rgba(227,195,114,0.07)' : 'rgba(227,195,114,0.025)',
                    fontSize:       '1.1rem',
                    color:          isActive ? 'rgba(227,195,114,0.80)' : 'rgba(227,195,114,0.30)',
                  }}
                >
                  ◆
                </div>

                <div>
                  <div
                    style={{
                      fontFamily:    FONT_SANS,
                      fontSize:      '0.92rem',
                      fontWeight:    700,
                      letterSpacing: '0.10em',
                      color:         isActive ? COLOR_PRIMARY : 'rgba(227,195,114,0.52)',
                      textTransform: 'uppercase',
                      lineHeight:    1.2,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily:    FONT_SANS,
                      fontSize:      '0.62rem',
                      color:         'rgba(198,198,199,0.48)',
                      marginTop:     3,
                      textTransform: 'capitalize',
                    }}
                  >
                    {state}: {timeStr}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CINEMATIC HERO
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              fontFamily:    FONT_SANS,
              fontSize:      '0.55rem',
              fontWeight:    700,
              letterSpacing: '0.28em',
              color:         'rgba(227,195,114,0.42)',
              textTransform: 'uppercase',
              marginBottom:  5,
            }}
          >
            CINEMATIC HERO
          </div>

          <Panel style={{ display: 'flex', height: 260, overflow: 'hidden' }}>

            {/* ── Left: countdown ──────────────────────────────────────── */}
            <div
              style={{
                width:          '340px',
                flexShrink:     0,
                padding:        '16px 28px',
                display:        'flex',
                flexDirection:  'column',
                justifyContent: 'center',
                gap:            10,
                borderRight:    '1px solid rgba(227,195,114,0.10)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <div
                  style={{
                    fontFamily:    FONT_SANS,
                    fontSize:      '2.6rem',
                    fontWeight:    900,
                    color:         COLOR_PRIMARY,
                    lineHeight:    1.1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {heroState}: {heroTime}
                </div>
                <div
                  style={{
                    fontFamily:    FONT_SANS,
                    fontSize:      '0.48rem',
                    letterSpacing: '0.26em',
                    color:         COLOR_SECONDARY,
                    textTransform: 'uppercase',
                    opacity:       0.55,
                  }}
                >
                  REMAINING
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(227,195,114,0.16)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <div
                  style={{
                    fontFamily:    FONT_SANS,
                    fontSize:      '0.48rem',
                    letterSpacing: '0.20em',
                    color:         COLOR_SECONDARY,
                    textTransform: 'uppercase',
                    opacity:       0.55,
                  }}
                >
                  CURRENT CYCLE:
                </div>
                <div
                  style={{
                    fontFamily:    FONT_SANS,
                    fontSize:      '2.6rem',
                    fontWeight:    900,
                    color:         COLOR_PRIMARY,
                    lineHeight:    1.1,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {heroState}
                </div>
              </div>
            </div>

            {/* ── Right: map placeholder ───────────────────────────────── */}
            <div
              style={{
                flex:           1,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'flex-end',
                paddingRight:   '16px',
              }}
            >
              <div
                style={{
                  width:          228,
                  height:         228,
                  background:     'radial-gradient(ellipse at 60% 50%, rgba(30,24,12,0.60) 0%, rgba(8,8,6,0.98) 100%)',
                  border:         '1px solid rgba(227,195,114,0.15)',
                  borderRadius:   '4px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily:    FONT_SANS,
                    fontSize:      '0.55rem',
                    letterSpacing: '0.28em',
                    color:         'rgba(227,195,114,0.12)',
                    textTransform: 'uppercase',
                    textAlign:     'center',
                    padding:       SPACING_MD,
                  }}
                >
                  MAP REGION · {WORLD_TABS.find(w => w.id === selectedId)?.label ?? selectedId.toUpperCase()}
                </span>
              </div>
            </div>

          </Panel>
        </div>


        {/* ══════════════════════════════════════════════════════════════════
            3-COLUMN DATA  (Bounty Protocol | Key Resources | System Intel)
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.18fr 1fr 1fr', gap: 4 }}>

          {/* ── Col 1: Bounty Protocol ─────────────────────────────────── */}
          <Panel>
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: '1fr 68px 54px',
                gap:                 parseInt(GAP_MEDIUM),
                padding:             `${HEADER_PADDING_Y} ${PANEL_PADDING_X}`,
                borderBottom:        `1px solid rgba(227,195,114,0.15)`,
                alignItems:          'center',
              }}
            >
              <PanelLabel>BOUNTY PROTOCOL</PanelLabel>
              <PanelLabel style={{ fontSize: '0.55rem', opacity: 0.65 }}>TOP REWARD</PanelLabel>
              <PanelLabel style={{ fontSize: '0.55rem', opacity: 0.65, textAlign: 'right' }}>DROP %</PanelLabel>
            </div>

            {bounties.length === 0 ? (
              <div
                style={{
                  padding:    '14px 12px',
                  fontFamily: FONT_SANS,
                  fontSize:   '0.50rem',
                  color:      'rgba(198,198,199,0.30)',
                  fontStyle:  'italic',
                }}
              >
                {selectedMission
                  ? 'Sync drop data to see rewards'
                  : 'No active bounties for this world'}
              </div>
            ) : bounties.map((bounty, i) => {
              const { sub, pct } = getBountyRow(bounty);
              return (
                <div
                  key={i}
                  style={{
                    display:             'grid',
                    gridTemplateColumns: '1fr 68px 54px',
                    gap:                 parseInt(GAP_MEDIUM),
                    padding:             `${GAP_TINY} ${PANEL_PADDING_X}`,
                    borderBottom:        '1px solid rgba(255,255,255,0.04)',
                    background:          i % 2 !== 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
                    alignItems:          'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily:    FONT_SANS,
                        fontSize:      '0.58rem',
                        fontWeight:    700,
                        color:         'rgba(198,198,199,0.72)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {bounty.tierLabel}
                    </div>
                    <div
                      style={{
                        fontFamily:  FONT_SANS,
                        fontSize:    '0.48rem',
                        color:       'rgba(198,198,199,0.35)',
                        marginTop:   1,
                        overflow:    'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:  'nowrap',
                      }}
                    >
                      {sub}
                    </div>
                  </div>

                  {/* Rotation tier badges */}
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {bounty.rotations.slice(0, 4).map((rot, j) => (
                      <div
                        key={j}
                        style={{
                          width:          14,
                          height:         14,
                          background:     rot.tier ? 'rgba(227,195,114,0.18)' : 'rgba(227,195,114,0.08)',
                          border:         `1px solid rgba(227,195,114,${rot.tier ? '0.30' : '0.14'})`,
                          borderRadius:   RADIUS_SM,
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          fontSize:       '0.34rem',
                          color:          'rgba(227,195,114,0.65)',
                        }}
                      >
                        {rot.tier ?? ''}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize:   '0.62rem',
                      fontWeight: 700,
                      color:      pct === '—' ? 'rgba(198,198,199,0.25)' : COLOR_PRIMARY,
                      textAlign:  'right',
                    }}
                  >
                    {pct}
                  </div>
                </div>
              );
            })}
          </Panel>

          {/* ── Col 2: Key Resources ────────────────────────────────────── */}
          <Panel>
            <PanelHeader>
              <PanelLabel>KEY RESOURCES</PanelLabel>
            </PanelHeader>
            <PanelBody style={{ padding: parseInt(SPACING_SM) }}>
              {resources.length === 0 ? (
                <p
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize:   '0.50rem',
                    color:      'rgba(198,198,199,0.28)',
                    fontStyle:  'italic',
                  }}
                >
                  No resources tracked for this world state.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                  {resources.map(res => (
                    <div
                      key={res.name}
                      style={{
                        background:    'rgba(255,255,255,0.025)',
                        border:        '1px solid rgba(227,195,114,0.10)',
                        padding:       '8px 8px',
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            color:     'rgba(227,195,114,0.65)',
                            fontSize:  '0.62rem',
                            flexShrink: 0,
                          }}
                        >
                          {res.icon}
                        </span>
                        <div
                          style={{
                            fontFamily:    FONT_SANS,
                            fontSize:      '0.52rem',
                            fontWeight:    600,
                            color:         'rgba(229,226,225,0.88)',
                            letterSpacing: '0.04em',
                            lineHeight:    1.2,
                          }}
                        >
                          {res.name}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily:    FONT_SANS,
                          fontSize:      '0.44rem',
                          color:         'rgba(198,198,199,0.38)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          lineHeight:    1.3,
                        }}
                      >
                        {res.source}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* ── Col 3: System Intelligence ──────────────────────────────── */}
          <Panel>
            <PanelHeader>
              <PanelLabel>SYSTEM INTELLIGENCE</PanelLabel>
            </PanelHeader>
            <PanelBody>
              {/* Live Cycle Forecast */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontFamily:    FONT_SANS,
                    fontSize:      '0.56rem',
                    fontWeight:    700,
                    letterSpacing: '0.14em',
                    color:         'rgba(227,195,114,0.55)',
                    textTransform: 'uppercase',
                    marginBottom:  8,
                  }}
                >
                  CYCLE FORECAST
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {WORLD_TABS.map(({ id, label }) => {
                    const s = byId[id];
                    if (!s) return null;
                    const timeStr = formatForecastTime(s.msRemaining);
                    return (
                      <div
                        key={id}
                        style={{
                          display:    'flex',
                          alignItems: 'baseline',
                          gap:        6,
                        }}
                      >
                        <span
                          style={{
                            fontFamily:    FONT_SANS,
                            fontSize:      '0.50rem',
                            fontWeight:    700,
                            letterSpacing: '0.08em',
                            color:         id === selectedId
                              ? 'rgba(227,195,114,0.80)'
                              : 'rgba(227,195,114,0.38)',
                            textTransform: 'uppercase',
                            minWidth:      50,
                            flexShrink:    0,
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontFamily:    FONT_SANS,
                            fontSize:      '0.48rem',
                            color:         'rgba(198,198,199,0.55)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {s.cycle.state}
                        </span>
                        <span style={{ color: 'rgba(227,195,114,0.20)', fontSize: '0.44rem' }}>·</span>
                        <span
                          style={{
                            fontFamily: FONT_SANS,
                            fontSize:   '0.48rem',
                            color:      'rgba(198,198,199,0.38)',
                          }}
                        >
                          {timeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Farming Tips */}
              {tips.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(227,195,114,0.08)', paddingTop: parseInt(SPACING_MD) }}>
                  <div
                    style={{
                      fontFamily:    FONT_SANS,
                      fontSize:      '0.56rem',
                      fontWeight:    700,
                      letterSpacing: '0.14em',
                      color:         'rgba(227,195,114,0.55)',
                      textTransform: 'uppercase',
                      marginBottom:  8,
                    }}
                  >
                    FARMING TIPS
                  </div>
                  {tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
                      <span style={{ color: 'rgba(227,195,114,0.50)', flexShrink: 0, fontSize: '0.50rem', lineHeight: 1.6 }}>•</span>
                      <span
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize:   '0.48rem',
                          color:      'rgba(198,198,199,0.48)',
                          lineHeight: 1.65,
                        }}
                      >
                        {tip}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: parseInt(GAP_SMALL) }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(227,195,114,0.45)', flexShrink: 0 }} />
          <span style={{ fontFamily: FONT_SANS, fontSize: '0.50rem', color: 'rgba(198,198,199,0.28)', letterSpacing: '0.18em' }}>
            Drop data · {dropsAgeLabel}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => void handleRefresh()}
            disabled={isSyncing}
            style={{
              padding:       '3px 10px',
              fontFamily:    FONT_SANS,
              fontSize:      '0.50rem',
              fontWeight:    700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         isSyncing ? 'rgba(227,195,114,0.28)' : 'rgba(227,195,114,0.55)',
              border:        `1px solid ${isSyncing ? 'rgba(227,195,114,0.10)' : 'rgba(227,195,114,0.22)'}`,
              borderRadius:  RADIUS_MD,
              background:    'transparent',
              cursor:        isSyncing ? 'not-allowed' : 'pointer',
            }}
          >
            {isSyncing ? 'Syncing…' : '↻ Refresh'}
          </button>
        </div>

      </div>
    </div>
  );
}
