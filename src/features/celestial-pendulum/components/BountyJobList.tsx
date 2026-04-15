import { useState } from 'react';
import type { SyndicateJob } from '@/core/domain/syndicates';
import { useItemIcon } from '../hooks/useItemIcon';

// ── Static faction info per world ──────────────────────────────────────────

const WORLD_FACTION: Record<string, { label: string; color: string; icon: string }> = {
  cetus:   { label: 'Grineer', color: '#f87171', icon: '☠' },
  vallis:  { label: 'Corpus',  color: '#60a5fa', icon: '⊕' },
  cambion: { label: 'Infested',color: '#4ade80', icon: '◈' },
  zariman: { label: 'Varies',  color: '#c084fc', icon: '✗' },
  earth:   { label: 'Grineer', color: '#f87171', icon: '☠' },
  duviri:  { label: 'Dax',     color: '#E3C372', icon: '◆' },
};

// ── Rarity heuristic ───────────────────────────────────────────────────────

type Rarity = 'RARE' | 'UNCOMMON' | 'COMMON';

function getRarity(name: string, idx: number, total: number): Rarity {
  const n = name.toLowerCase();
  if (
    n.includes('arcane') || n.includes('riven') || n.includes('prime') ||
    n.includes('eidolon') || n.includes('shard') || n.includes('breath') ||
    n.includes('lens') || n.includes('wisp') || n.includes('toroid') ||
    n.includes('scintillant') || n.includes('incarnon') || n.includes('voidplume')
  ) return 'RARE';
  if (
    n.includes('endo') || n.includes('credits') || n.includes('alloy') ||
    n.includes('salvage') || n.includes('polymer') || n.includes('ferrite') ||
    n.includes('nano') || n.includes('circuits')
  ) return 'COMMON';
  const pct = total > 1 ? idx / (total - 1) : 0;
  if (pct < 0.30) return 'RARE';
  if (pct < 0.65) return 'UNCOMMON';
  return 'COMMON';
}

const RARITY_META: Record<Rarity, { dot: string; label: string; glow: string; border: string }> = {
  RARE:     { dot: '#E3C372', label: 'Rare',     glow: 'rgba(227,195,114,0.30)', border: 'rgba(227,195,114,0.50)' },
  UNCOMMON: { dot: '#60a5fa', label: 'Uncommon', glow: 'rgba(96,165,250,0.22)',  border: 'rgba(96,165,250,0.35)'  },
  COMMON:   { dot: 'rgba(198,198,199,0.45)', label: 'Common', glow: 'transparent', border: 'rgba(255,255,255,0.10)' },
};

// ── Drop % calculation ──────────────────────────────────────────────────────

function calcDropPercents(pool: string[]): string[] {
  const rarities = pool.map((item, i) => getRarity(item, i, pool.length));
  const totalWeight = rarities.reduce((sum, r) => {
    return sum + (r === 'RARE' ? 1 : r === 'UNCOMMON' ? 3 : 6);
  }, 0);
  if (totalWeight === 0) return pool.map(() => '—');
  return rarities.map(r => {
    const w = r === 'RARE' ? 1 : r === 'UNCOMMON' ? 3 : 6;
    return ((w / totalWeight) * 100).toFixed(1) + '%';
  });
}

// ── Rotation badge ──────────────────────────────────────────────────────────

function getRotBadge(regularIdx: number, regularCount: number): 'A' | 'B' | 'C' | null {
  if (regularCount <= 0) return null;
  if (regularCount <= 3) {
    const map: Record<number, 'A' | 'B' | 'C'> = { 0: 'C', 1: 'B', 2: 'A' };
    return map[regularIdx] ?? 'A';
  }
  return (['A', 'B', 'C'] as const)[regularIdx % 3];
}

function isSteelPath(jobType: string): boolean {
  return jobType.toLowerCase().includes('steel');
}

// ── Reward icon cell ────────────────────────────────────────────────────────

interface RewardIconCellProps {
  name:   string;
  drop:   string;
  rarity: Rarity;
}

function RewardIconCell({ name, drop, rarity }: RewardIconCellProps) {
  const iconUrl = useItemIcon(name);
  const meta    = RARITY_META[rarity];

  return (
    <div
      title={`${name} · ${meta.label} · ${drop}`}
      style={{
        width:          80,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            5,
        cursor:         'default',
        flexShrink:     0,
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width:        56,
          height:       56,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          position:     'relative',
          overflow:     'hidden',
          background:   rarity === 'RARE'
            ? 'rgba(227,195,114,0.07)'
            : rarity === 'UNCOMMON'
            ? 'rgba(96,165,250,0.05)'
            : 'rgba(255,255,255,0.03)',
          border:       `1px solid ${meta.border}`,
          boxShadow:    rarity === 'RARE'
            ? `0 0 14px ${meta.glow}, inset 0 0 10px rgba(227,195,114,0.04)`
            : rarity === 'UNCOMMON'
            ? `0 0 8px ${meta.glow}`
            : 'none',
          transition:   'box-shadow 0.2s',
        }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name}
            style={{
              width:      42,
              height:     42,
              objectFit:  'contain',
              filter:     rarity === 'RARE'
                ? 'brightness(1.15) drop-shadow(0 0 4px rgba(227,195,114,0.45))'
                : 'brightness(1.05)',
            }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          /* Letter fallback while loading or if icon not found */
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
            {name[0]?.toUpperCase() ?? '?'}
          </span>
        )}

        {/* Drop % badge pinned to bottom-right */}
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
            opacity:       0.85,
            lineHeight:    1,
          }}
        >
          {drop}
        </span>
      </div>

      {/* Item name — 2-line clamp */}
      <p
        style={{
          fontFamily:        'var(--font-body)',
          fontSize:          '0.40rem',
          color:             rarity === 'RARE'
            ? 'rgba(227,195,114,0.92)'
            : rarity === 'UNCOMMON'
            ? 'rgba(190,214,255,0.85)'
            : 'rgba(198,198,199,0.60)',
          textAlign:         'center',
          lineHeight:        1.3,
          width:             '100%',
          overflow:          'hidden',
          display:           '-webkit-box',
          WebkitLineClamp:   2,
          WebkitBoxOrient:   'vertical' as const,
          fontWeight:        rarity === 'RARE' ? 600 : 400,
        }}
      >
        {name}
      </p>
    </div>
  );
}

// ── Active Terminal Panel ───────────────────────────────────────────────────

interface TerminalPanelProps {
  job:         SyndicateJob;
  rotBadge:    'A' | 'B' | 'C' | null;
  accentColor: string;
  faction:     { label: string; color: string; icon: string };
  /** key-based remount triggers the power-on animation */
}

function TerminalPanel({ job, rotBadge, accentColor, faction }: TerminalPanelProps) {
  const rewards   = job.rewardPool ?? [];
  const dropPcts  = rewards.length > 0 ? calcDropPercents(rewards) : [];
  const tierLabel = job.type.replace(/\s*bounty\s*/gi, '').trim().toUpperCase();
  const total     = job.standingStages.reduce((a, b) => a + b, 0);
  const isSP      = isSteelPath(job.type);

  // Group by rarity
  const groups: Record<Rarity, { name: string; drop: string }[]> = { RARE: [], UNCOMMON: [], COMMON: [] };
  rewards.forEach((item, i) => {
    const r = getRarity(item, i, rewards.length);
    groups[r].push({ name: item, drop: dropPcts[i] ?? '—' });
  });

  const RARITY_ORDER: Rarity[] = ['RARE', 'UNCOMMON', 'COMMON'];

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
      {/* ── Terminal header bar ──────────────────────────────────────────── */}
      <div
        style={{
          padding:     '10px 14px',
          background:  `${accentColor}08`,
          borderBottom: `1px solid ${accentColor}18`,
          flexShrink:  0,
        }}
      >
        {/* Tier title */}
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
            {tierLabel}
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
            +{total.toLocaleString()} ◆
          </span>
        </div>

        {/* Meta badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      '0.42rem',
              color:         'rgba(198,198,199,0.50)',
              letterSpacing: '0.06em',
            }}
          >
            Lv. {job.enemyLevels[0]}–{job.enemyLevels[1]}
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

          {rotBadge && !isSP && (
            <span
              style={{
                fontFamily:    'var(--font-body)',
                fontSize:      '0.40rem',
                fontWeight:    700,
                letterSpacing: '0.10em',
                color:         accentColor,
                border:        `1px solid ${accentColor}40`,
                padding:       '1px 5px',
                whiteSpace:    'nowrap',
              }}
            >
              ROT {rotBadge}
            </span>
          )}

          {isSP && (
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

      {/* ── Reward grid ─────────────────────────────────────────────────── */}
      {rewards.length === 0 ? (
        <div
          style={{
            flex:           1,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
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
      ) : (
        <div
          style={{
            flex:       1,
            overflowY:  'auto',
            overflowX:  'hidden',
            scrollbarWidth: 'none',
            padding:    '12px 14px',
            display:    'flex',
            flexDirection: 'column',
            gap:        14,
          }}
        >
          {RARITY_ORDER.map(rarity => {
            const items = groups[rarity];
            if (items.length === 0) return null;
            const meta  = RARITY_META[rarity];

            return (
              <div key={rarity}>
                {/* Rarity section header */}
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
                      opacity:       rarity === 'COMMON' ? 0.55 : 1,
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

                {/* Icon grid */}
                <div
                  style={{
                    display:   'flex',
                    flexWrap:  'wrap',
                    gap:       8,
                  }}
                >
                  {items.map((item, i) => (
                    <RewardIconCell
                      key={item.name + i}
                      name={item.name}
                      drop={item.drop}
                      rarity={rarity}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Empty-selection placeholder ────────────────────────────────────────────

function EmptyTerminalState() {
  return (
    <div
      style={{
        height:          '100%',
        minHeight:       160,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             12,
        border:          '1px dashed rgba(227,195,114,0.10)',
        background:      'rgba(0,0,0,0.18)',
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

// ── Main Component ─────────────────────────────────────────────────────────

interface BountyJobListProps {
  jobs:        SyndicateJob[];
  accentColor: string;
  expiryMs:    number;
  now:         number;
  worldId?:    string;
  /** @deprecated No longer used */
  onHoverJob?: (job: SyndicateJob | null) => void;
}

export function BountyJobList({
  jobs,
  accentColor,
  worldId = 'cetus',
}: BountyJobListProps) {
  const faction = WORLD_FACTION[worldId] ?? { label: 'Enemy', color: '#E3C372', icon: '◆' };

  // Highest tier first
  const reversed = [...jobs].reverse();

  const regularJobs  = reversed.filter(j => !isSteelPath(j.type));
  const regularCount = regularJobs.length;

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  function selectRow(idx: number) {
    setSelectedIdx(prev => (prev === idx ? null : idx));
  }

  // Loading skeleton
  if (jobs.length === 0) {
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

  // Pre-compute rotation badges
  let regularIdx = -1;
  const rowMeta = reversed.map(job => {
    const isSP = isSteelPath(job.type);
    let rotBadge: 'A' | 'B' | 'C' | null = null;
    if (!isSP) {
      regularIdx++;
      rotBadge = getRotBadge(regularIdx, regularCount);
    }
    return { isSP, rotBadge };
  });

  const selectedJob  = selectedIdx !== null ? reversed[selectedIdx]  : null;
  const selectedMeta = selectedIdx !== null ? rowMeta[selectedIdx]   : null;

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
          marginBottom:  10,
        }}
      >
        Bounty Board
      </p>

      {/* ── Master-Detail layout  30 / 70 ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', minHeight: 260 }}>

        {/* ══ MASTER — tier list (30%) ════════════════════════════════════ */}
        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column' }}>
          {reversed.map((job, idx) => {
            const { isSP, rotBadge } = rowMeta[idx];
            const isSelected         = selectedIdx === idx;
            const total              = job.standingStages.reduce((a, b) => a + b, 0);
            const tierLabel          = job.type
              .replace(/\s*bounty\s*/gi, '')
              .trim()
              .toUpperCase();

            return (
              <button
                key={job.type + idx}
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
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}07`;
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {/* Selection chevron */}
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

                {/* Tier name */}
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
                  {tierLabel}
                </span>

                {/* Badges — only on selected row to keep list clean */}
                {isSelected && rotBadge && !isSP && (
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
                    {rotBadge}
                  </span>
                )}

                {isSP && (
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

                {/* Standing — condensed, always visible */}
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
                  +{total.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══ ACTIVE TERMINAL (70%) ══════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedJob && selectedMeta ? (
            /* key forces remount → re-triggers .terminal-power-on animation */
            <TerminalPanel
              key={selectedJob.type}
              job={selectedJob}
              rotBadge={selectedMeta.rotBadge}
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
