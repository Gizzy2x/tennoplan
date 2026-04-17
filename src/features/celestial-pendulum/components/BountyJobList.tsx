/**
 * BountyJobList — Celestial Pendulum bounty board, driven by EnrichedBounty[].
 *
 * Visual design (preserved from Phase 1):
 *   - Master-detail 30/70 layout
 *   - .terminal-power-on animation on panel remount
 *   - Rarity section headers (Rare / Uncommon / Common)
 *   - 80px icon grid cells with drop-% badge
 *
 * New in Phase 2:
 *   - Real drop % + rarity from drops.warframestat.us (no more heuristics)
 *   - Rotation tabs (A / B / C) inside the terminal panel when multiple exist
 *   - Cycle-context note banner above the board
 *   - Graceful fallback pool rendering when Dexie has no match yet
 *
 * New in Phase 3:
 *   - Icons resolved via build-time itemsAdapter (findByName → imageName → CDN)
 *     instead of per-item search-API calls. Zero network overhead for icons.
 *   - LazyItemIcon (IntersectionObserver) prevents off-screen icon fetches
 *     in long reward pools, keeping older PCs snappy.
 */

import { useState, useEffect, type CSSProperties } from 'react';
import type {
  EnrichedBounty,
  EnrichedBountyRotation,
  EnrichedBountyReward,
  BountyRewardRarity,
} from '@/core/domain/bounty';
import { findByName } from '@/adapters/items/itemsAdapter';
import { LazyItemIcon } from '@/components/ui/LazyItemIcon';

// ─── Static faction info per world ──────────────────────────────────────────

const WORLD_FACTION: Record<string, { label: string; color: string; icon: string }> = {
  cetus:   { label: 'Grineer',  color: '#f87171', icon: '☠' },
  vallis:  { label: 'Corpus',   color: '#60a5fa', icon: '⊕' },
  cambion: { label: 'Infested', color: '#4ade80', icon: '◈' },
  zariman: { label: 'Varies',   color: '#c084fc', icon: '✗' },
  earth:   { label: 'Grineer',  color: '#f87171', icon: '☠' },
  duviri:  { label: 'Dax',      color: '#E3C372', icon: '◆' },
};

// ─── Rarity metadata ────────────────────────────────────────────────────────

const RARITY_META: Record<BountyRewardRarity, {
  dot:    string;
  label:  string;
  glow:   string;
  border: string;
}> = {
  Rare:     { dot: '#E3C372',              label: 'Rare',     glow: 'rgba(227,195,114,0.30)', border: 'rgba(227,195,114,0.50)' },
  Uncommon: { dot: '#60a5fa',              label: 'Uncommon', glow: 'rgba(96,165,250,0.22)',  border: 'rgba(96,165,250,0.35)'  },
  Common:   { dot: 'rgba(198,198,199,0.45)', label: 'Common',   glow: 'transparent',            border: 'rgba(255,255,255,0.10)' },
  Unknown:  { dot: 'rgba(198,198,199,0.30)', label: 'Unknown',  glow: 'transparent',            border: 'rgba(255,255,255,0.07)' },
};

const RARITY_ORDER: BountyRewardRarity[] = ['Rare', 'Uncommon', 'Common', 'Unknown'];

function formatChance(chance: number): string {
  if (!Number.isFinite(chance) || chance <= 0) return '—';
  if (chance < 0.1) return chance.toFixed(3) + '%';
  if (chance < 10)  return chance.toFixed(2) + '%';
  return chance.toFixed(1) + '%';
}

// ─── Reward icon cell ────────────────────────────────────────────────────────

interface RewardIconCellProps {
  reward: EnrichedBountyReward;
}

function RewardIconCell({ reward }: RewardIconCellProps) {
  // Phase 3: resolve imageName synchronously from the build-time static items
  // map — no network call, no useItemIcon search-API round-trip.
  const staticItem = findByName(reward.itemName);
  const meta       = RARITY_META[reward.tier];
  const pct        = formatChance(reward.chance);

  const iconFilter =
    reward.tier === 'Rare'
      ? 'brightness(1.15) drop-shadow(0 0 4px rgba(227,195,114,0.45))'
      : 'brightness(1.05)';

  return (
    <div
      title={`${reward.itemName} · ${meta.label} · ${pct}${reward.rawRarity ? ` (${reward.rawRarity})` : ''}`}
      style={{
        width:         80,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           5,
        cursor:        'default',
        flexShrink:    0,
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width:          56,
          height:         56,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          position:       'relative',
          overflow:       'hidden',
          background:
            reward.tier === 'Rare'     ? 'rgba(227,195,114,0.07)' :
            reward.tier === 'Uncommon' ? 'rgba(96,165,250,0.05)'  :
                                          'rgba(255,255,255,0.03)',
          border:         `1px solid ${meta.border}`,
          boxShadow:
            reward.tier === 'Rare'     ? `0 0 14px ${meta.glow}, inset 0 0 10px rgba(227,195,114,0.04)` :
            reward.tier === 'Uncommon' ? `0 0 8px ${meta.glow}` :
                                          'none',
          transition:     'box-shadow 0.2s',
        }}
      >
        {/* LazyItemIcon fires only when the cell scrolls into view.
            When the static map has an imageName we skip any network lookup.
            Falls back to the letter-avatar below when the item isn't found. */}
        {staticItem?.imageName ? (
          <LazyItemIcon
            imageName={staticItem.imageName}
            name={reward.itemName}
            size={42}
            className="object-contain"
            style={{ filter: iconFilter } as CSSProperties}
          />
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize:   '1.2rem',
              fontWeight: 900,
              color:      meta.dot,
              opacity:    0.55,
              lineHeight: 1,
            }}
          >
            {reward.itemName[0]?.toUpperCase() ?? '?'}
          </span>
        )}

        {/* Drop % badge */}
        <span
          style={{
            position:      'absolute',
            bottom:        2,
            right:         3,
            fontFamily:    'var(--font-body)',
            fontSize:      '0.32rem',
            fontWeight:    700,
            color:         meta.dot,
            letterSpacing: '0.02em',
            opacity:       0.90,
            lineHeight:    1,
            textShadow:    '0 1px 2px rgba(0,0,0,0.80)',
          }}
        >
          {pct}
        </span>
      </div>

      {/* Item name */}
      <p
        style={{
          fontFamily:      'var(--font-body)',
          fontSize:        '0.40rem',
          color:
            reward.tier === 'Rare'     ? 'rgba(227,195,114,0.92)' :
            reward.tier === 'Uncommon' ? 'rgba(190,214,255,0.85)' :
                                          'rgba(198,198,199,0.60)',
          textAlign:       'center',
          lineHeight:      1.3,
          width:           '100%',
          overflow:        'hidden',
          display:         '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          fontWeight:      reward.tier === 'Rare' ? 600 : 400,
        }}
      >
        {reward.itemName}
      </p>
    </div>
  );
}

// ─── Rotation renderer ───────────────────────────────────────────────────────

interface RotationViewProps {
  rotation: EnrichedBountyRotation;
}

function RotationView({ rotation }: RotationViewProps) {
  // Group rewards by rarity (preserve per-rotation chance sort)
  const groups: Record<BountyRewardRarity, EnrichedBountyReward[]> = {
    Rare: [], Uncommon: [], Common: [], Unknown: [],
  };
  for (const r of rotation.rewards) groups[r.tier].push(r);

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           14,
      }}
    >
      {RARITY_ORDER.map(rarity => {
        const items = groups[rarity];
        if (items.length === 0) return null;
        const meta = RARITY_META[rarity];

        return (
          <div key={rarity}>
            <div
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           6,
                marginBottom:  8,
                paddingBottom: 5,
                borderBottom:  `1px solid ${meta.dot}20`,
              }}
            >
              <span
                style={{
                  width:        4,
                  height:       4,
                  borderRadius: '50%',
                  background:   meta.dot,
                  boxShadow:    `0 0 5px ${meta.glow}`,
                  flexShrink:   0,
                  display:      'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      '0.38rem',
                  fontWeight:    700,
                  letterSpacing: '0.32em',
                  color:         meta.dot,
                  textTransform: 'uppercase',
                  opacity:       rarity === 'Common' || rarity === 'Unknown' ? 0.55 : 1,
                }}
              >
                {meta.label}
              </span>
              <span
                style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      '0.36rem',
                  color:         'rgba(198,198,199,0.20)',
                  letterSpacing: '0.08em',
                  marginLeft:    'auto',
                }}
              >
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {items.map((reward, i) => (
                <RewardIconCell
                  key={reward.itemName + i}
                  reward={reward}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Fallback pool renderer ──────────────────────────────────────────────────

interface FallbackPoolViewProps {
  names: string[];
}

function FallbackPoolView({ names }: FallbackPoolViewProps) {
  // Use Unknown tier so icons still render but no fake % appears
  const rewards: EnrichedBountyReward[] = names.map(n => ({
    itemName:  n,
    chance:    0,
    rawRarity: 'Unknown',
    tier:      'Unknown' as const,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p
        style={{
          fontFamily:    'var(--font-body)',
          fontSize:      '0.40rem',
          color:         'rgba(198,198,199,0.50)',
          letterSpacing: '0.08em',
          fontStyle:     'italic',
          lineHeight:    1.6,
        }}
      >
        Drop data not yet synced — showing live reward pool without chances.
        Pull "Refresh" or wait for the next sync (24 h).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {rewards.map((reward, i) => (
          <RewardIconCell key={reward.itemName + i} reward={reward} />
        ))}
      </div>
    </div>
  );
}

// ─── Active Terminal Panel ───────────────────────────────────────────────────

interface TerminalPanelProps {
  bounty:      EnrichedBounty;
  accentColor: string;
  faction:     { label: string; color: string; icon: string };
}

function TerminalPanel({ bounty, accentColor, faction }: TerminalPanelProps) {
  const hasRotations  = bounty.rotations.length > 0;
  const hasMultiple   = bounty.rotations.length > 1;

  // Local tab state — reset when bounty changes (parent uses key prop)
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => { setActiveIdx(0); }, [bounty.jobType]);
  const activeRotation = hasRotations ? bounty.rotations[activeIdx] ?? bounty.rotations[0] : null;

  return (
    <div
      className="terminal-power-on"
      style={{
        height:               '100%',
        display:              'flex',
        flexDirection:        'column',
        background:           'rgba(8,9,11,0.62)',
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop:            `1px solid ${accentColor}20`,
        borderRight:          `1px solid ${accentColor}20`,
        borderBottom:         `1px solid ${accentColor}20`,
        borderLeft:           `2px solid ${accentColor}60`,
        overflow:             'hidden',
      }}
    >
      {/* ── Terminal header ──────────────────────────────────────────── */}
      <div
        style={{
          padding:      '10px 14px',
          background:   `${accentColor}08`,
          borderBottom: `1px solid ${accentColor}18`,
          flexShrink:   0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      '0.58rem',
              fontWeight:    700,
              color:         accentColor,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              flex:          1,
            }}
          >
            {bounty.tierLabel}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize:   '0.46rem',
              color:      accentColor,
              opacity:    0.60,
              whiteSpace: 'nowrap',
            }}
          >
            +{bounty.standingTotal.toLocaleString()} ◆
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      '0.42rem',
              color:         'rgba(198,198,199,0.50)',
              letterSpacing: '0.06em',
            }}
          >
            Lv. {bounty.enemyLevels[0]}–{bounty.enemyLevels[1]}
          </span>

          <span style={{ color: 'rgba(198,198,199,0.20)', fontSize: '0.42rem' }}>·</span>

          <span
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      '0.40rem',
              color:         faction.color,
              border:        `1px solid ${faction.color}30`,
              padding:       '1px 5px',
              letterSpacing: '0.08em',
              whiteSpace:    'nowrap',
            }}
          >
            {faction.icon} {faction.label}
          </span>

          {bounty.isSteelPath && (
            <span
              style={{
                fontFamily:    'var(--font-body)',
                fontSize:      '0.40rem',
                fontWeight:    700,
                color:         '#f87171',
                border:        '1px solid rgba(248,113,113,0.30)',
                padding:       '1px 5px',
                letterSpacing: '0.08em',
              }}
            >
              STEEL PATH
            </span>
          )}
        </div>
      </div>

      {/* ── Rotation tabs (only when >1 rotation) ────────────────────── */}
      {hasMultiple && activeRotation && (
        <div
          style={{
            display:       'flex',
            gap:           0,
            borderBottom:  `1px solid ${accentColor}18`,
            background:    `${accentColor}04`,
            flexShrink:    0,
          }}
        >
          {bounty.rotations.map((rot, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={rot.label}
                onClick={() => setActiveIdx(idx)}
                style={{
                  flex:          1,
                  padding:       '7px 10px',
                  background:    isActive ? `${accentColor}10` : 'transparent',
                  border:        'none',
                  borderRight:   idx < bounty.rotations.length - 1 ? `1px solid ${accentColor}14` : 'none',
                  borderBottom:  isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                  cursor:        'pointer',
                  fontFamily:    'var(--font-body)',
                  fontSize:      '0.44rem',
                  fontWeight:    isActive ? 700 : 500,
                  color:         isActive ? accentColor : 'rgba(229,226,225,0.55)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  transition:    'background 0.15s, color 0.15s, border-bottom 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}07`;
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {rot.label}
                <span
                  style={{
                    marginLeft:    6,
                    fontSize:      '0.36rem',
                    opacity:       0.55,
                    letterSpacing: '0.08em',
                  }}
                >
                  {rot.rewards.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Reward content ───────────────────────────────────────────── */}
      <div
        style={{
          flex:           1,
          overflowY:      'auto',
          overflowX:      'hidden',
          scrollbarWidth: 'none',
          padding:        '12px 14px',
        }}
      >
        {activeRotation ? (
          <RotationView rotation={activeRotation} />
        ) : bounty.fallbackPool && bounty.fallbackPool.length > 0 ? (
          <FallbackPoolView names={bounty.fallbackPool} />
        ) : (
          <div
            style={{
              flex:           1,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '40px 0',
            }}
          >
            <p
              style={{
                fontFamily:    'var(--font-body)',
                fontSize:      '0.52rem',
                color:         'rgba(198,198,199,0.25)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textAlign:     'center',
              }}
            >
              No reward data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty-selection placeholder ─────────────────────────────────────────────

function EmptyTerminalState() {
  return (
    <div
      style={{
        height:         '100%',
        minHeight:      160,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            12,
        border:         '1px dashed rgba(227,195,114,0.10)',
        background:     'rgba(0,0,0,0.18)',
      }}
    >
      <span style={{ fontSize: '1.4rem', color: 'rgba(227,195,114,0.15)', lineHeight: 1 }}>◈</span>
      <p
        style={{
          fontFamily:    'var(--font-body)',
          fontSize:      '0.46rem',
          color:         'rgba(198,198,199,0.22)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          textAlign:     'center',
          lineHeight:    1.8,
        }}
      >
        Active Terminal<br />
        <span style={{ opacity: 0.7 }}>Select a tier to power on</span>
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface BountyJobListProps {
  bounties:    EnrichedBounty[];
  accentColor: string;
  worldId?:    string;
  /** Short cycle-context note. Rendered as a banner above the board. */
  cycleNote?:  string | null;
}

export function BountyJobList({
  bounties,
  accentColor,
  worldId = 'cetus',
  cycleNote = null,
}: BountyJobListProps) {
  const faction = WORLD_FACTION[worldId] ?? { label: 'Enemy', color: '#E3C372', icon: '◆' };

  // Highest tier first (same order convention as Phase 1)
  const reversed = [...bounties].reverse();

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  function selectRow(idx: number) {
    setSelectedIdx(prev => (prev === idx ? null : idx));
  }

  // Loading skeleton
  if (bounties.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              height:          8,
              borderRadius:    2,
              backgroundColor: `${accentColor}18`,
              width:           `${50 + i * 12}%`,
              animation:       'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
        ))}
      </div>
    );
  }

  const selectedBounty = selectedIdx !== null ? reversed[selectedIdx] : null;

  return (
    <div>
      {/* Section heading */}
      <p
        style={{
          fontFamily:    'var(--font-body)',
          fontSize:      '0.48rem',
          fontWeight:    700,
          letterSpacing: '0.55em',
          color:         'rgba(227,195,114,0.50)',
          textTransform: 'uppercase',
          marginBottom:  cycleNote ? 6 : 10,
        }}
      >
        Bounty Board
      </p>

      {/* Cycle context note */}
      {cycleNote && (
        <p
          style={{
            fontFamily:    'var(--font-body)',
            fontSize:      '0.48rem',
            color:         accentColor,
            opacity:       0.75,
            letterSpacing: '0.06em',
            marginBottom:  10,
            padding:       '5px 10px',
            background:    `${accentColor}08`,
            borderLeft:    `2px solid ${accentColor}55`,
          }}
        >
          {cycleNote}
        </p>
      )}

      {/* ── Master-Detail layout 30 / 70 ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', minHeight: 260 }}>

        {/* ══ MASTER — tier list (30%) ═════════════════════════════════ */}
        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column' }}>
          {reversed.map((bounty, idx) => {
            const isSelected  = selectedIdx === idx;
            const rotCount    = bounty.rotations.length;
            const rotSummary  =
              rotCount === 0 ? null :
              rotCount === 1 && bounty.rotations[0]?.tier === null ? null :
              bounty.rotations.map(r => r.tier ?? '·').join('');

            return (
              <button
                key={bounty.jobType + idx}
                onClick={() => selectRow(idx)}
                style={{
                  width:      '100%',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        6,
                  padding:    '8px 8px 8px 10px',
                  background: isSelected ? `${accentColor}12` : 'transparent',
                  boxShadow:  [
                    `inset 2px 0 0 ${isSelected ? accentColor : 'transparent'}`,
                    idx > 0 ? 'inset 0 1px 0 rgba(227,195,114,0.06)' : '',
                  ].filter(Boolean).join(', '),
                  cursor:    'pointer',
                  textAlign: 'left',
                  transition:'background 0.15s, box-shadow 0.15s',
                  border:    'none',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}07`;
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {/* Chevron */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '0.42rem',
                    color:      accentColor,
                    opacity:    isSelected ? 0.80 : 0.18,
                    flexShrink: 0,
                    width:      7,
                    transition: 'opacity 0.12s',
                  }}
                >
                  ▸
                </span>

                {/* Tier label */}
                <span
                  style={{
                    fontFamily:    'var(--font-body)',
                    fontSize:      '0.54rem',
                    fontWeight:    isSelected ? 700 : 500,
                    color:         isSelected ? accentColor : 'rgba(229,226,225,0.65)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    flex:          1,
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                    whiteSpace:    'nowrap',
                    transition:    'color 0.12s',
                  }}
                >
                  {bounty.tierLabel}
                </span>

                {/* Rotation summary — only on selected row */}
                {isSelected && rotSummary && !bounty.isSteelPath && (
                  <span
                    style={{
                      fontFamily:    'var(--font-body)',
                      fontSize:      '0.36rem',
                      fontWeight:    700,
                      letterSpacing: '0.08em',
                      color:         accentColor,
                      border:        `1px solid ${accentColor}45`,
                      padding:       '1px 4px',
                      flexShrink:    0,
                      whiteSpace:    'nowrap',
                    }}
                  >
                    {rotSummary}
                  </span>
                )}

                {bounty.isSteelPath && (
                  <span
                    style={{
                      fontFamily:    'var(--font-body)',
                      fontSize:      '0.34rem',
                      fontWeight:    700,
                      color:         '#f87171',
                      border:        '1px solid rgba(248,113,113,0.22)',
                      padding:       '1px 4px',
                      letterSpacing: '0.06em',
                      flexShrink:    0,
                    }}
                  >
                    SP
                  </span>
                )}

                {/* Standing */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '0.40rem',
                    color:      accentColor,
                    opacity:    isSelected ? 0.65 : 0.28,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{bounty.standingTotal.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══ ACTIVE TERMINAL (70%) ════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedBounty ? (
            /* key forces remount → re-triggers .terminal-power-on animation */
            <TerminalPanel
              key={selectedBounty.jobType}
              bounty={selectedBounty}
              accentColor={accentColor}
              faction={faction}
            />
          ) : (
            <EmptyTerminalState />
          )}
        </div>
      </div>
    </div>
  );
}
