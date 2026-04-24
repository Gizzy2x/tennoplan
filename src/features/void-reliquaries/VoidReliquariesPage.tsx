import { useState, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { PageHero } from '@/components/ui/PageHero';
import { useThemeStore } from '@/store/theme';
import { getTypographyStyle } from '@/tokens/utils';
import { useFissures, DEFAULT_FILTERS } from './hooks/useFissures';
import { TIER_COLOR } from '@/core/services/fissureService';
import { TIER_ORDER } from '@/core/domain/relics';
import { formatMs } from '@/core/services/cycleService';
import { formatCacheAge } from '@/core/services/WorldstateService';
import type { FissureStatus, FissureTier } from '@/core/domain/relics';

// ─── Types ────────────────────────────────────────────────────────────────────

type Refinement = 'Intact' | 'Exceptional' | 'Flawless' | 'Radiant';

const REFINEMENT_LEVELS: Refinement[] = ['Intact', 'Exceptional', 'Flawless', 'Radiant'];

const REFINEMENT_COLOR: Record<Refinement, string> = {
  Intact:      '#9ca3af',
  Exceptional: '#67e8f9',
  Flawless:    '#c084fc',
  Radiant:     '#E3C372',
};

interface MockRelic {
  id:         string;
  name:       string;
  tier:       FissureTier;
  refinement: Refinement;
  owned:      number;
  drops:      string[];
}

const MOCK_RELICS: MockRelic[] = [
  { id: 'lith-a1',  name: 'Lith A1',    tier: 'Lith',    refinement: 'Intact',      owned: 4, drops: ['Ash Prime Neuroptics', 'Braton Prime Barrel', 'Forma Blueprint'] },
  { id: 'lith-b3',  name: 'Lith B3',    tier: 'Lith',    refinement: 'Radiant',     owned: 2, drops: ['Ash Prime Systems', 'Paris Prime Lower Limb', 'Forma Blueprint'] },
  { id: 'lith-g2',  name: 'Lith G2',    tier: 'Lith',    refinement: 'Exceptional', owned: 1, drops: ['Mag Prime Systems', 'Boar Prime Barrel', 'Forma Blueprint'] },
  { id: 'meso-a1',  name: 'Meso A1',    tier: 'Meso',    refinement: 'Intact',      owned: 3, drops: ['Volt Prime Chassis', 'Odonata Prime Wings', 'Forma Blueprint'] },
  { id: 'meso-b2',  name: 'Meso B2',    tier: 'Meso',    refinement: 'Flawless',    owned: 0, drops: ['Nova Prime Systems', 'Soma Prime Stock', 'Forma Blueprint'] },
  { id: 'meso-s9',  name: 'Meso S9',    tier: 'Meso',    refinement: 'Radiant',     owned: 2, drops: ['Trinity Prime Chassis', 'Reaper Prime Blade', 'Forma Blueprint'] },
  { id: 'neo-a1',   name: 'Neo A1',     tier: 'Neo',     refinement: 'Intact',      owned: 2, drops: ['Saryn Prime Systems', 'Vectis Prime Stock', 'Forma Blueprint'] },
  { id: 'neo-g4',   name: 'Neo G4',     tier: 'Neo',     refinement: 'Radiant',     owned: 1, drops: ['Vauban Prime Neuroptics', 'Tigris Prime Receiver', 'Forma Blueprint'] },
  { id: 'axi-g1',   name: 'Axi G1',     tier: 'Axi',     refinement: 'Exceptional', owned: 3, drops: ['Chroma Prime Systems', 'Rubico Prime Stock', 'Forma Blueprint'] },
  { id: 'axi-a1',   name: 'Axi A1',     tier: 'Axi',     refinement: 'Intact',      owned: 0, drops: ['Khora Prime Neuroptics', 'Staticor Blueprint', 'Forma Blueprint'] },
  { id: 'req-z1',   name: 'Requiem I',  tier: 'Requiem', refinement: 'Intact',      owned: 2, drops: ['Fass', 'Vome', 'Lohk', 'Xata'] },
  { id: 'req-z2',   name: 'Requiem II', tier: 'Requiem', refinement: 'Flawless',    owned: 1, drops: ['Netra', 'Khra', 'Jahu', 'Ris'] },
];

// ─── RelicOrb ─────────────────────────────────────────────────────────────────

function RelicOrb({ tier, size = 80 }: { tier: FissureTier; size?: number }) {
  const c = TIER_COLOR[tier];
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      flexShrink: 0,
      position: 'relative',
      background: `radial-gradient(circle at 38% 32%, ${c}40 0%, ${c}14 45%, rgba(8,8,6,0.97) 70%)`,
      border: `1px solid ${c}35`,
      boxShadow: `0 0 22px ${c}18, inset 0 0 28px rgba(0,0,0,0.7)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: size * 0.74, height: size * 0.74, borderRadius: '50%', border: `1px solid ${c}22` }} />
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 40 40" style={{ position: 'absolute', opacity: 0.38 }}>
        <line x1="20" y1="2"  x2="20" y2="38" stroke={c} strokeWidth="0.8" />
        <line x1="2"  y1="20" x2="38" y2="20" stroke={c} strokeWidth="0.8" />
        <line x1="7"  y1="7"  x2="33" y2="33" stroke={c} strokeWidth="0.5" />
        <line x1="33" y1="7"  x2="7"  y2="33" stroke={c} strokeWidth="0.5" />
        <circle cx="20" cy="20" r="8"  fill="none" stroke={c} strokeWidth="0.7" />
        <circle cx="20" cy="20" r="2.5" fill={c} opacity="0.55" />
      </svg>
      <div style={{
        position: 'absolute', top: '16%', left: '20%',
        width: size * 0.2, height: size * 0.2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${c}60 0%, transparent 80%)`,
        filter: 'blur(2px)',
      }} />
    </div>
  );
}

// ─── RelicCard ────────────────────────────────────────────────────────────────

function RelicCard({
  relic,
  isHighlighted,
  onClick,
}: {
  relic:         MockRelic;
  isHighlighted: boolean;
  onClick:       () => void;
}) {
  const { tokens } = useThemeStore();
  const [hovered, setHovered] = useState(false);
  const c  = TIER_COLOR[relic.tier];
  const rc = REFINEMENT_COLOR[relic.refinement];
  const active = isHighlighted || hovered;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:      'relative',
        display:       'flex',
        flexDirection: 'column',
        background:    active ? `rgba(28,27,24,0.97)` : 'rgba(22,21,19,0.92)',
        border:        `1px solid ${active ? `${c}55` : 'rgba(227,195,114,0.10)'}`,
        borderRadius:  '4px',
        padding:       '16px',
        gap:           '12px',
        cursor:        'pointer',
        overflow:      'hidden',
        transition:    'all 0.15s ease',
        transform:     hovered ? 'translateY(-1px)' : 'none',
        boxShadow:     active
          ? `0 0 20px ${c}20, 0 4px 16px rgba(0,0,0,0.5)`
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Tier gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(145deg, ${c}0a 0%, transparent 50%)`,
      }} />

      {/* Filigree corner TL */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 12, height: 12,
        borderTop: `1px solid ${c}50`, borderLeft: `1px solid ${c}50`,
        pointerEvents: 'none',
      }} />

      {/* Top row: owned badge + tier badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Owned count */}
        {relic.owned > 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(227,195,114,0.10)',
            border: '1px solid rgba(227,195,114,0.22)',
            borderRadius: '3px', padding: '2px 7px',
          }}>
            <span style={{
              ...getTypographyStyle(tokens, 'labelTiny'),
              color: 'rgba(227,195,114,0.85)',
            }}>
              ×{relic.owned} OWNED
            </span>
          </div>
        ) : (
          <div style={{
            background: 'rgba(198,198,199,0.05)',
            border: '1px solid rgba(198,198,199,0.10)',
            borderRadius: '3px', padding: '2px 7px',
          }}>
            <span style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: 'rgba(198,198,199,0.30)' }}>
              UNOWNED
            </span>
          </div>
        )}

        {/* Tier badge */}
        <div style={{
          background: `${c}18`, border: `1px solid ${c}38`,
          borderRadius: '3px', padding: '2px 7px',
        }}>
          <span style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: c }}>
            {relic.tier.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Orb + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <RelicOrb tier={relic.tier} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            ...getTypographyStyle(tokens, 'sectionHeader'),
            color: c,
            lineHeight: 1.25,
            marginBottom: '5px',
          }}>
            {relic.name.toUpperCase()} RELIC
          </div>
          {/* Refinement pill */}
          <div style={{
            display: 'inline-flex',
            background: `${rc}12`, border: `1px solid ${rc}30`,
            borderRadius: '3px', padding: '2px 7px',
          }}>
            <span style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: rc }}>
              {relic.refinement.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Drop items */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: '10px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <span style={{
          ...getTypographyStyle(tokens, 'labelTiny'),
          color: 'rgba(198,198,199,0.30)',
          marginBottom: '2px',
        }}>
          VAULT DEFICIENCIES
        </span>
        {relic.drops.slice(0, 3).map((drop, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
              background: i === 0 ? '#fbbf24' : 'rgba(198,198,199,0.25)',
            }} />
            <span style={{
              ...getTypographyStyle(tokens, 'labelTiny'),
              color: i === 0 ? 'rgba(251,191,36,0.75)' : 'rgba(198,198,199,0.45)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {drop}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FissureRow ───────────────────────────────────────────────────────────────

function FissureRow({
  status,
  isHighlighted,
  onClick,
}: {
  status:        FissureStatus;
  isHighlighted: boolean;
  onClick:       () => void;
}) {
  const { tokens } = useThemeStore();
  const [hovered, setHovered] = useState(false);
  const { fissure, msRemaining } = status;
  const c        = TIER_COLOR[fissure.tier];
  const isUrgent = msRemaining < 600_000;
  const nodeName = fissure.node.split('(')[0].trim();
  const region   = fissure.node.match(/\(([^)]+)\)/)?.[1] ?? '';
  const active   = isHighlighted || hovered;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 10px',
        background: active ? `${c}0d` : 'transparent',
        borderLeft: `2px solid ${active ? c : 'transparent'}`,
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      {/* Tier pill */}
      <div style={{
        width: 38, flexShrink: 0, textAlign: 'center',
        background: `${c}18`, border: `1px solid ${c}35`,
        borderRadius: '2px', padding: '2px 3px',
      }}>
        <span style={{
          ...getTypographyStyle(tokens, 'labelTiny'),
          color: c, display: 'block',
          fontSize: '0.6rem',
        }}>
          {fissure.tier.slice(0, 4).toUpperCase()}
        </span>
      </div>

      {/* Mission info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          ...getTypographyStyle(tokens, 'labelSmall'),
          color: 'rgba(229,226,225,0.82)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontSize: '0.6875rem',
        }}>
          {nodeName}
        </div>
        <div style={{
          ...getTypographyStyle(tokens, 'labelTiny'),
          color: 'rgba(198,198,199,0.38)',
          fontSize: '0.6rem',
        }}>
          {fissure.missionType}{region ? ` · ${region}` : ''}
          {fissure.isHard && <span style={{ color: '#f87171', marginLeft: 4 }}>SP</span>}
          {fissure.isStorm && <span style={{ color: '#E3C372', marginLeft: 3 }}>⚡</span>}
        </div>
      </div>

      {/* Timer */}
      <span style={{
        fontFamily: 'monospace',
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: isUrgent ? '#fb923c' : 'rgba(198,198,199,0.50)',
        flexShrink: 0,
        minWidth: 48,
        textAlign: 'right',
      }}>
        {formatMs(msRemaining)}
      </span>
    </div>
  );
}

// ─── FissuresSidebar ─────────────────────────────────────────────────────────

function FissuresSidebar({
  grouped, totalActive, highlightedTier, onTierClick,
  cacheAgeMs, forceRefetch, isLoading,
}: {
  grouped:         Map<FissureTier, FissureStatus[]>;
  totalActive:     number;
  highlightedTier: FissureTier | null;
  onTierClick:     (tier: FissureTier | null) => void;
  cacheAgeMs:      number;
  forceRefetch:    () => Promise<void>;
  isLoading:       boolean;
}) {
  const { tokens } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await forceRefetch(); } finally { setRefreshing(false); }
  };

  const allActive = TIER_ORDER
    .flatMap(t => grouped.get(t) ?? [])
    .filter(s => !s.isExpired);

  return (
    <div style={{
      width: '268px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(18,17,15,0.95)',
      border: '1px solid rgba(227,195,114,0.12)',
      borderRadius: '4px',
      maxHeight: 'calc(100vh - 120px)',
      position: 'sticky', top: '80px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '9px 12px',
        borderBottom: '1px solid rgba(227,195,114,0.08)',
      }}>
        <span style={{ ...getTypographyStyle(tokens, 'sectionHeader'), color: 'rgba(227,195,114,0.75)', flex: 1 }}>
          ACTIVE FISSURES
        </span>
        <span style={{
          ...getTypographyStyle(tokens, 'labelTiny'),
          background: 'rgba(227,195,114,0.10)', border: '1px solid rgba(227,195,114,0.20)',
          borderRadius: '2px', padding: '1px 6px',
          color: 'rgba(227,195,114,0.70)',
        }}>
          {totalActive}
        </span>
        <button onClick={handleRefresh} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '2px', display: 'flex', alignItems: 'center',
          color: refreshing ? '#E3C372' : 'rgba(198,198,199,0.28)',
          transition: 'color 0.15s',
        }}>
          <RefreshCw size={10} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Tier filter strip */}
      <div style={{
        display: 'flex', gap: '3px', padding: '6px 10px',
        borderBottom: '1px solid rgba(227,195,114,0.05)', flexWrap: 'wrap',
      }}>
        {TIER_ORDER.map(tier => {
          const count  = (grouped.get(tier) ?? []).filter(s => !s.isExpired).length;
          const c      = TIER_COLOR[tier];
          const active = highlightedTier === tier;
          return (
            <button key={tier} onClick={() => count > 0 && onTierClick(active ? null : tier)} style={{
              ...getTypographyStyle(tokens, 'labelTiny'),
              fontSize: '0.575rem',
              padding: '2px 6px',
              background: active ? `${c}18` : 'transparent',
              border: `1px solid ${active ? `${c}42` : 'rgba(198,198,199,0.08)'}`,
              borderRadius: '2px',
              color: count > 0 ? c : 'rgba(198,198,199,0.20)',
              cursor: count > 0 ? 'pointer' : 'default',
              transition: 'all 0.12s',
            }}>
              {tier.slice(0, 4).toUpperCase()}
              {count > 0 && <span style={{ marginLeft: 2, opacity: 0.6 }}>·{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Fissure list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading && allActive.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: 'rgba(198,198,199,0.35)' }}>
              Syncing…
            </span>
          </div>
        )}
        {!isLoading && allActive.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ ...getTypographyStyle(tokens, 'body'), color: 'rgba(198,198,199,0.22)' }}>
              No active fissures
            </span>
          </div>
        )}

        {TIER_ORDER.map(tier => {
          const statuses = (grouped.get(tier) ?? []).filter(s =>
            !s.isExpired && (highlightedTier === null || highlightedTier === tier)
          );
          if (statuses.length === 0) return null;
          const c = TIER_COLOR[tier];

          return (
            <div key={tier}>
              {/* Tier label divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px 3px',
              }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{
                  ...getTypographyStyle(tokens, 'labelTiny'),
                  color: c, opacity: 0.65, fontSize: '0.575rem',
                }}>
                  {tier.toUpperCase()}
                </span>
                <div style={{ flex: 1, height: 1, background: `${c}14` }} />
              </div>

              {statuses.map(s => (
                <FissureRow
                  key={s.fissure.id}
                  status={s}
                  isHighlighted={highlightedTier === tier}
                  onClick={() => onTierClick(highlightedTier === tier ? null : tier)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer: cache age */}
      <div style={{
        padding: '5px 12px',
        borderTop: '1px solid rgba(227,195,114,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: 'rgba(198,198,199,0.22)', fontSize: '0.575rem' }}>
          {formatCacheAge(cacheAgeMs)}
        </span>
      </div>
    </div>
  );
}

// ─── VoidReliquariesPage ──────────────────────────────────────────────────────

export function VoidReliquariesPage() {
  const { tokens } = useThemeStore();

  const [activeView,        setActiveView]       = useState<'myRelics' | 'allRelics'>('myRelics');
  const [activeEras,        setActiveEras]        = useState<Set<FissureTier>>(new Set(TIER_ORDER));
  const [activeRefinements, setActiveRefinements] = useState<Set<Refinement>>(new Set(REFINEMENT_LEVELS));
  const [search,            setSearch]            = useState('');
  const [highlightedTier,   setHighlightedTier]   = useState<FissureTier | null>(null);

  const { grouped, isLoading: fissuresLoading, totalActive, cacheAgeMs, forceRefetch, hasEverLoaded } = useFissures(DEFAULT_FILTERS);

  const filteredRelics = useMemo(() => {
    let list = MOCK_RELICS;
    if (activeView === 'myRelics') list = list.filter(r => r.owned > 0);
    if (activeEras.size < TIER_ORDER.length) list = list.filter(r => activeEras.has(r.tier));
    if (activeRefinements.size < REFINEMENT_LEVELS.length) list = list.filter(r => activeRefinements.has(r.refinement));
    if (search.trim()) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase().trim()));
    if (highlightedTier) list = list.filter(r => r.tier === highlightedTier);
    return list;
  }, [activeView, activeEras, activeRefinements, search, highlightedTier]);

  const toggleEra = (tier: FissureTier) =>
    setActiveEras(prev => { const n = new Set(prev); n.has(tier) ? n.delete(tier) : n.add(tier); return n; });

  const toggleRefinement = (ref: Refinement) =>
    setActiveRefinements(prev => { const n = new Set(prev); n.has(ref) ? n.delete(ref) : n.add(ref); return n; });

  const handleTierHighlight = (tier: FissureTier | null) =>
    setHighlightedTier(prev => prev === tier ? null : tier);

  if (!hasEverLoaded && fissuresLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px', color: 'rgba(198,198,199,0.40)' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E3C372', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <span style={{ ...getTypographyStyle(tokens, 'labelSmall'), color: 'rgba(198,198,199,0.38)' }}>
          Initializing Void Reliquaries…
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      <PageHero prefix="VOID" title="RELIQUARIES" subtitle="Active Fissures & Relic Vault" />

      {/* ── Controls bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
        padding: '8px 12px',
        background: 'rgba(18,17,15,0.85)',
        border: '1px solid rgba(227,195,114,0.10)',
        borderRadius: '4px',
      }}>
        {/* View tabs */}
        {(['myRelics', 'allRelics'] as const).map(view => {
          const active = activeView === view;
          return (
            <button key={view} onClick={() => setActiveView(view)} style={{
              ...getTypographyStyle(tokens, 'labelSmall'),
              padding: '4px 12px',
              background: active ? 'rgba(227,195,114,0.08)' : 'transparent',
              border: `1px solid ${active ? 'rgba(227,195,114,0.30)' : 'rgba(198,198,199,0.10)'}`,
              borderRadius: '3px',
              color: active ? tokens.colors.primary : 'rgba(198,198,199,0.40)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {view === 'myRelics' ? 'MY RELICS' : 'ALL RELICS'}
            </button>
          );
        })}

        {/* Fissures tab */}
        <button style={{
          ...getTypographyStyle(tokens, 'labelSmall'),
          padding: '4px 12px',
          background: 'transparent',
          border: '1px solid rgba(198,198,199,0.10)',
          borderRadius: '3px',
          color: 'rgba(198,198,199,0.40)',
          cursor: 'pointer',
        }}>
          FISSURES
        </button>

        <div style={{ width: 1, height: 14, background: 'rgba(198,198,199,0.10)', margin: '0 2px' }} />

        {/* Era filters */}
        {TIER_ORDER.map(tier => {
          const active = activeEras.has(tier);
          const c      = TIER_COLOR[tier];
          return (
            <button key={tier} onClick={() => toggleEra(tier)} style={{
              ...getTypographyStyle(tokens, 'labelTiny'),
              padding: '3px 9px',
              background: active ? `${c}12` : 'transparent',
              border: `1px solid ${active ? `${c}40` : 'rgba(198,198,199,0.08)'}`,
              borderRadius: '2px',
              color: active ? c : 'rgba(198,198,199,0.25)',
              cursor: 'pointer', transition: 'all 0.12s',
            }}>
              {tier.toUpperCase()}
            </button>
          );
        })}

        <div style={{ width: 1, height: 14, background: 'rgba(198,198,199,0.10)', margin: '0 2px' }} />

        {/* Refinement filters */}
        {REFINEMENT_LEVELS.map(ref => {
          const active = activeRefinements.has(ref);
          const c      = REFINEMENT_COLOR[ref];
          return (
            <button key={ref} onClick={() => toggleRefinement(ref)} style={{
              ...getTypographyStyle(tokens, 'labelTiny'),
              padding: '3px 9px',
              background: active ? `${c}10` : 'transparent',
              border: `1px solid ${active ? `${c}35` : 'rgba(198,198,199,0.07)'}`,
              borderRadius: '2px',
              color: active ? c : 'rgba(198,198,199,0.22)',
              cursor: 'pointer', transition: 'all 0.12s',
            }}>
              {ref.toUpperCase()}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(198,198,199,0.09)',
          borderRadius: '3px', padding: '4px 10px',
        }}>
          <Search size={10} color="rgba(198,198,199,0.30)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search relics…"
            style={{
              ...getTypographyStyle(tokens, 'labelSmall'),
              background: 'transparent', border: 'none', outline: 'none',
              color: 'rgba(198,198,199,0.70)', width: 120,
            }}
          />
        </div>
      </div>

      {/* ── Results count ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...getTypographyStyle(tokens, 'sectionHeader'), color: 'rgba(227,195,114,0.65)' }}>
          {activeView === 'myRelics' ? 'MY RELICS' : 'ALL RELICS'}
        </span>
        <span style={{
          ...getTypographyStyle(tokens, 'labelTiny'),
          background: 'rgba(227,195,114,0.08)', border: '1px solid rgba(227,195,114,0.18)',
          borderRadius: '2px', padding: '1px 6px', color: 'rgba(227,195,114,0.55)',
        }}>
          {filteredRelics.length}
        </span>
        {highlightedTier && (
          <span style={{
            ...getTypographyStyle(tokens, 'labelTiny'),
            color: TIER_COLOR[highlightedTier],
            background: `${TIER_COLOR[highlightedTier]}10`,
            border: `1px solid ${TIER_COLOR[highlightedTier]}30`,
            borderRadius: '2px', padding: '1px 8px',
          }}>
            {highlightedTier.toUpperCase()} FILTER ACTIVE — <button
              onClick={() => setHighlightedTier(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, font: 'inherit' }}
            >✕ CLEAR</button>
          </span>
        )}
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>

        {/* Relic grid */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredRelics.length === 0 ? (
            <div style={{
              background: 'rgba(18,17,15,0.85)',
              border: '1px solid rgba(227,195,114,0.10)',
              borderRadius: '4px',
              padding: '40px 24px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '24px', opacity: 0.18 }}>◈</span>
              <span style={{ ...getTypographyStyle(tokens, 'sectionHeader'), color: 'rgba(198,198,199,0.30)' }}>
                {activeView === 'myRelics' ? 'NO OWNED RELICS MATCH FILTERS' : 'NO RELICS MATCH FILTERS'}
              </span>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '10px',
            }}>
              {filteredRelics.map(relic => (
                <RelicCard
                  key={relic.id}
                  relic={relic}
                  isHighlighted={highlightedTier === relic.tier}
                  onClick={() => handleTierHighlight(relic.tier)}
                />
              ))}
            </div>
          )}

          {/* Vault Deficiencies panel */}
          <div style={{
            background: 'rgba(18,17,15,0.85)',
            border: '1px solid rgba(227,195,114,0.10)',
            borderRadius: '4px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px',
              borderBottom: '1px solid rgba(227,195,114,0.07)',
            }}>
              <span style={{ ...getTypographyStyle(tokens, 'sectionHeader'), color: 'rgba(227,195,114,0.65)' }}>
                VAULT DEFICIENCIES
              </span>
              <span style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: 'rgba(198,198,199,0.22)' }}>
                PRIME PARTS NEEDED
              </span>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <span style={{ ...getTypographyStyle(tokens, 'body'), color: 'rgba(198,198,199,0.25)' }}>
                Add your owned relics to reveal missing prime parts from your collection.
              </span>
            </div>
          </div>
        </div>

        {/* Fissures sidebar */}
        <FissuresSidebar
          grouped={grouped}
          totalActive={totalActive}
          highlightedTier={highlightedTier}
          onTierClick={handleTierHighlight}
          cacheAgeMs={cacheAgeMs}
          forceRefetch={forceRefetch}
          isLoading={fissuresLoading}
        />
      </div>
    </div>
  );
}
