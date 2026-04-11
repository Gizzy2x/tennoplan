import { useState } from 'react';
import type { SyndicateJob } from '@/core/domain/syndicates';

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
  // Positional fallback
  const pct = total > 1 ? idx / (total - 1) : 0;
  if (pct < 0.30) return 'RARE';
  if (pct < 0.65) return 'UNCOMMON';
  return 'COMMON';
}

const RARITY_DOT: Record<Rarity, string> = {
  RARE:     '#E3C372',
  UNCOMMON: '#60a5fa',
  COMMON:   'rgba(198,198,199,0.45)',
};

// ── Drop % calculation ──────────────────────────────────────────────────────
// Approximate distribution — RARE ~10%, UNCOMMON ~28%, COMMON ~62%
// Weights: RARE=1, UNCOMMON=3, COMMON=6

function calcDropPercents(pool: string[]): string[] {
  const rarities = pool.map((item, i) => getRarity(item, i, pool.length));
  const totalWeight = rarities.reduce((sum, r) => {
    return sum + (r === 'RARE' ? 1 : r === 'UNCOMMON' ? 3 : 6);
  }, 0);
  if (totalWeight === 0) return pool.map(() => '—');
  return rarities.map(r => {
    const w = r === 'RARE' ? 1 : r === 'UNCOMMON' ? 3 : 6;
    return ((w / totalWeight) * 100).toFixed(2) + '%';
  });
}

// ── Rotation badge ──────────────────────────────────────────────────────────
// For pools with ≤3 regular tiers: highest = ROT C, lowest = ROT A
// For pools with >3 regular tiers: cycle A→B→C from highest non-SP tier

function getRotBadge(
  regularIdx: number,
  regularCount: number,
): 'A' | 'B' | 'C' | null {
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

// ── Component ──────────────────────────────────────────────────────────────

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

  // Reverse so highest tier shows first
  const reversed = [...jobs].reverse();

  // Count regular (non-Steel Path) jobs for rotation badge assignment
  const regularJobs = reversed.filter(j => !isSteelPath(j.type));
  const regularCount = regularJobs.length;

  // Default: expand second item (index 1) — typically the highest regular bounty
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(reversed.length > 1 ? [1] : reversed.length > 0 ? [0] : [])
  );

  function toggle(idx: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

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

  // Track regular-job counter for rotation badges
  let regularIdx = -1;

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

      {/* Tier rows */}
      <div>
        {reversed.map((job, idx) => {
          const isOpen    = expanded.has(idx);
          const total     = job.standingStages.reduce((a, b) => a + b, 0);
          const stages    = job.standingStages.length;
          const isSP      = isSteelPath(job.type);
          const tierLabel = job.type
            .replace(/\s*bounty\s*/gi, '')
            .trim()
            .toUpperCase();
          const rewards   = job.rewardPool ?? [];
          const dropPcts  = rewards.length > 0 ? calcDropPercents(rewards) : [];

          // Assign rotation badge only to regular (non-SP) bounties
          let rotBadge: 'A' | 'B' | 'C' | null = null;
          if (!isSP) {
            regularIdx++;
            rotBadge = getRotBadge(regularIdx, regularCount);
          }

          return (
            <div
              key={job.type + idx}
              style={{
                borderTop: idx > 0 ? '1px solid rgba(227,195,114,0.07)' : undefined,
              }}
            >
              {/* ── Tier header (clickable) ─────────────────────────── */}
              <button
                onClick={() => toggle(idx)}
                style={{
                  width:      '100%',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        8,
                  padding:    '8px 0',
                  background: 'transparent',
                  cursor:     'pointer',
                  textAlign:  'left',
                  border:     'none',
                }}
              >
                {/* Chevron */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '0.52rem',
                    color:      accentColor,
                    opacity:    0.55,
                    flexShrink: 0,
                    width:      10,
                    transition: 'transform 0.15s',
                    transform:  isOpen ? 'rotate(90deg)' : 'none',
                    display:    'inline-block',
                  }}
                >
                  ▸
                </span>

                {/* Tier name */}
                <span
                  style={{
                    fontFamily:    'var(--font-body)',
                    fontSize:      '0.63rem',
                    fontWeight:    700,
                    color:         'rgba(229,226,225,0.88)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    flex:          1,
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                    whiteSpace:    'nowrap',
                  }}
                >
                  {tierLabel}
                </span>

                {/* Faction badge */}
                <span
                  style={{
                    fontFamily:    'var(--font-body)',
                    fontSize:      '0.46rem',
                    color:         faction.color,
                    border:        `1px solid ${faction.color}30`,
                    padding:       '1px 6px',
                    letterSpacing: '0.10em',
                    flexShrink:    0,
                    whiteSpace:    'nowrap',
                  }}
                >
                  {faction.icon} {faction.label}
                </span>

                {/* Level range */}
                <span
                  style={{
                    fontFamily:    'var(--font-body)',
                    fontSize:      '0.50rem',
                    color:         'rgba(198,198,199,0.45)',
                    letterSpacing: '0.06em',
                    flexShrink:    0,
                    whiteSpace:    'nowrap',
                  }}
                >
                  Lv. {job.enemyLevels[0]}–{job.enemyLevels[1]}
                </span>

                {/* Rotation badge — only for non-Steel-Path tiers */}
                {rotBadge && (
                  <span
                    style={{
                      fontFamily:    'var(--font-body)',
                      fontSize:      '0.44rem',
                      fontWeight:    700,
                      letterSpacing: '0.10em',
                      color:         accentColor,
                      border:        `1px solid ${accentColor}38`,
                      padding:       '1px 5px',
                      flexShrink:    0,
                      whiteSpace:    'nowrap',
                    }}
                  >
                    ROT {rotBadge}
                  </span>
                )}

                {/* Standing total */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '0.50rem',
                    color:      accentColor,
                    opacity:    0.65,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{total.toLocaleString()}
                </span>

                {/* Stage count */}
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize:   '0.46rem',
                    color:      'rgba(198,198,199,0.28)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stages} stages
                </span>
              </button>

              {/* ── Expanded reward pool ──────────────────────────── */}
              {isOpen && rewards.length > 0 && (
                <div style={{ paddingLeft: 18, paddingBottom: 10 }}>
                  {/* Column headers */}
                  <div
                    style={{
                      display:       'flex',
                      alignItems:    'center',
                      gap:           8,
                      paddingBottom: 5,
                      marginBottom:  4,
                      borderBottom:  '1px solid rgba(227,195,114,0.09)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.42rem', letterSpacing: '0.32em', color: 'rgba(198,198,199,0.32)', textTransform: 'uppercase', flex: 1 }}>
                      Reward
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.42rem', letterSpacing: '0.32em', color: 'rgba(198,198,199,0.32)', textTransform: 'uppercase', width: 60, textAlign: 'right' }}>
                      Drop %
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.42rem', letterSpacing: '0.32em', color: 'rgba(198,198,199,0.32)', textTransform: 'uppercase', width: 72, textAlign: 'right' }}>
                      Rarity
                    </span>
                  </div>

                  {/* Reward items */}
                  {rewards.map((item, i) => {
                    const rarity = getRarity(item, i, rewards.length);
                    const dot    = RARITY_DOT[rarity];
                    const drop   = dropPcts[i] ?? '—';
                    return (
                      <div
                        key={item + i}
                        style={{
                          display:    'flex',
                          alignItems: 'center',
                          gap:        8,
                          padding:    '3px 0',
                        }}
                      >
                        {/* Rarity dot */}
                        <span
                          style={{
                            width:        5,
                            height:       5,
                            borderRadius: '50%',
                            background:   dot,
                            flexShrink:   0,
                            boxShadow:    `0 0 4px ${dot}80`,
                            display:      'inline-block',
                          }}
                        />
                        {/* Item name */}
                        <span
                          style={{
                            fontFamily:   'var(--font-body)',
                            fontSize:     '0.60rem',
                            color:        'rgba(229,226,225,0.75)',
                            flex:         1,
                            overflow:     'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace:   'nowrap',
                          }}
                        >
                          {item}
                        </span>
                        {/* Drop % */}
                        <span
                          style={{
                            fontFamily:    'var(--font-body)',
                            fontSize:      '0.50rem',
                            fontWeight:    600,
                            color:         dot,
                            width:         60,
                            textAlign:     'right',
                            flexShrink:    0,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {drop}
                        </span>
                        {/* Rarity label */}
                        <span
                          style={{
                            fontFamily:    'var(--font-body)',
                            fontSize:      '0.44rem',
                            letterSpacing: '0.08em',
                            color:         dot,
                            textTransform: 'uppercase',
                            width:         72,
                            textAlign:     'right',
                            flexShrink:    0,
                          }}
                        >
                          {rarity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
