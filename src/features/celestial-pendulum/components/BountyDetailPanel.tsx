import { memo, useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { findByName } from '@/adapters/items/itemsAdapter';
import type { EnrichedBounty, BountyRewardRarity } from '@/core/domain/bounty';

// ─── Rarity helpers ───────────────────────────────────────────────────────────

const RARITY_ORDER: BountyRewardRarity[] = ['Rare', 'Uncommon', 'Common', 'Unknown'];

function rarityColor(rarity: BountyRewardRarity): string {
  switch (rarity) {
    case 'Rare':     return 'rgba(227, 195, 114, 0.90)';
    case 'Uncommon': return 'rgba(186, 195, 254, 0.80)';
    case 'Common':   return 'rgba(168, 165, 160, 0.55)';
    default:         return 'rgba(168, 165, 160, 0.32)';
  }
}

// ─── Data transform: rotations → rarity groups ────────────────────────────────

interface RarityGroupItem {
  itemName:  string;
  maxChance: number;
  rotations: string[];
}

interface RarityGroup {
  rarity: BountyRewardRarity;
  items:  RarityGroupItem[];
}

function buildRarityGroups(bounty: EnrichedBounty): RarityGroup[] {
  const byRarity = new Map<BountyRewardRarity, Map<string, RarityGroupItem>>();

  for (const rotation of bounty.rotations) {
    const rotLabel = rotation.tier ?? null;
    for (const reward of rotation.rewards) {
      if (!byRarity.has(reward.tier)) byRarity.set(reward.tier, new Map());
      const group = byRarity.get(reward.tier)!;
      const existing = group.get(reward.itemName);
      if (existing) {
        if (rotLabel && !existing.rotations.includes(rotLabel)) {
          existing.rotations.push(rotLabel);
        }
        existing.maxChance = Math.max(existing.maxChance, reward.chance);
      } else {
        group.set(reward.itemName, {
          itemName:  reward.itemName,
          maxChance: reward.chance,
          rotations: rotLabel ? [rotLabel] : [],
        });
      }
    }
  }

  return RARITY_ORDER
    .filter(r => byRarity.has(r))
    .map(r => ({
      rarity: r,
      items:  Array.from(byRarity.get(r)!.values()).sort((a, b) => b.maxChance - a.maxChance),
    }));
}

// ─── Reward card (grid item) ──────────────────────────────────────────────────

const RewardCard = memo(function RewardCard({ item }: { item: RarityGroupItem }) {
  const found = findByName(item.itemName);

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           6,
      padding:       8,
      textAlign:     'center',
    }}>
      {/* Icon container */}
      <div style={{
        position:     'relative',
        width:        48,
        height:       48,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        borderRadius: 4,
        background:   'rgba(0, 212, 255, 0.03)',
        border:       '1px solid rgba(0, 212, 255, 0.08)',
      }}>
        {found?.imageName ? (
          <ItemIcon imageName={found.imageName} name={item.itemName} size={40} style={{ opacity: 0.90 }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: 2,
            background: 'rgba(227, 195, 114, 0.05)', border: '1px solid rgba(227, 195, 114, 0.10)',
          }} />
        )}

        {/* Drop chance indicator (bottom-right corner) */}
        <span style={{
          position:          'absolute',
          bottom:            -2,
          right:             -2,
          fontFamily:        'var(--font-sans)',
          fontSize:          '0.65rem',
          fontWeight:        700,
          color:             item.maxChance >= 20 ? 'rgba(227, 195, 114, 0.90)' : 'rgba(168, 165, 160, 0.60)',
          background:        item.maxChance >= 20 ? 'rgba(227, 195, 114, 0.15)' : 'rgba(0, 0, 0, 0.50)',
          border:            '1px solid ' + (item.maxChance >= 20 ? 'rgba(227, 195, 114, 0.25)' : 'rgba(255, 255, 255, 0.10)'),
          borderRadius:      '2px',
          padding:           '2px 4px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {item.maxChance.toFixed(0)}%
        </span>
      </div>

      {/* Item name */}
      <span style={{
        fontFamily:   'var(--font-sans)',
        fontSize:     '0.72rem',
        color:        'var(--color-text-primary)',
        lineHeight:   1.3,
        overflow:     'hidden',
        display:      '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        wordBreak:    'break-word',
      }}>
        {item.itemName}
      </span>

      {/* Rotation badges */}
      {item.rotations.length > 0 && (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {item.rotations.map(r => (
            <span key={r} style={{
              fontFamily:    'var(--font-sans)',
              fontSize:      '0.65rem',
              fontWeight:    700,
              letterSpacing: '0.08em',
              color:         'rgba(0, 212, 255, 0.80)',
              background:    'rgba(0, 212, 255, 0.10)',
              border:        '1px solid rgba(0, 212, 255, 0.20)',
              borderRadius:  2,
              padding:       '2px 4px',
            }}>
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Rarity section ───────────────────────────────────────────────────────────

const RaritySection = memo(function RaritySection({ group }: { group: RarityGroup }) {
  const color = rarityColor(group.rarity);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           5,
        marginBottom:  10,
        paddingBottom: 6,
        borderBottom:  '1px solid rgba(255, 255, 255, 0.04)',
      }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontFamily:    'var(--font-sans)',
          fontSize:      '0.75rem',
          fontWeight:    700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color,
          opacity: 0.90,
        }}>
          {group.rarity}
        </span>
      </div>
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
        gap:                 6,
        paddingLeft:         0,
      }}>
        {group.items.map(item => (
          <RewardCard key={item.itemName} item={item} />
        ))}
      </div>
    </div>
  );
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface BountyDetailPanelProps {
  bounties:   EnrichedBounty[];
  hasMission: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BountyDetailPanel({ bounties, hasMission }: BountyDetailPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Pre-compute rarity groups for all tiers once — not per-click
  const allRarityGroups = useMemo(
    () => bounties.map(buildRarityGroups),
    [bounties],
  );

  if (bounties.length === 0) {
    return (
      <Panel>
        <div style={{ padding: '20px 16px' }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize:   '0.55rem',
            color:      'rgba(168, 165, 160, 0.35)',
            fontStyle:  'italic',
          }}>
            {hasMission
              ? 'Sync drop data to see bounty rewards.'
              : 'No active bounties for this world.'}
          </span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      {/* Section label */}
      <div style={{
        fontFamily:    'var(--font-sans)',
        fontSize:      '0.40rem',
        fontWeight:    700,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color:         'rgba(168, 165, 160, 0.35)',
        marginBottom:  10,
        paddingBottom: 6,
        borderBottom:  '1px solid rgba(255, 255, 255, 0.04)',
      }}>
        Bounty Protocol · Possible Rewards
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {bounties.map((bounty, i) => {
          const isExpanded   = expandedIndex === i;
          const rarityGroups = isExpanded ? (allRarityGroups[i] ?? []) : [];

          return (
            <div key={i}>
              {/* Tier card / toggle */}
              <button
                onClick={() => setExpandedIndex(isExpanded ? -1 : i)}
                style={{
                  width:      '100%',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        8,
                  padding:    '7px 10px',
                  background: isExpanded
                    ? 'rgba(227, 195, 114, 0.06)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${
                    isExpanded
                      ? 'rgba(227, 195, 114, 0.18)'
                      : 'rgba(255, 255, 255, 0.05)'
                  }`,
                  borderRadius:  isExpanded ? '4px 4px 0 0' : 4,
                  cursor:        'pointer',
                  textAlign:     'left',
                  transition:    'background 150ms ease, border-color 150ms ease',
                }}
              >
                <span style={{
                  fontFamily:    'var(--font-sans)',
                  fontSize:      '0.57rem',
                  fontWeight:    700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color:         isExpanded
                    ? 'rgba(227, 195, 114, 0.90)'
                    : 'rgba(227, 195, 114, 0.55)',
                  flex: 1,
                }}>
                  {bounty.tierLabel}
                </span>

                {bounty.isSteelPath && (
                  <span className="badge-steel-path">STEEL PATH</span>
                )}

                {bounty.standingTotal > 0 && (
                  <span style={{
                    fontFamily:         'var(--font-sans)',
                    fontSize:           '0.46rem',
                    color:              'rgba(168, 165, 160, 0.40)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {bounty.standingTotal.toLocaleString()} rep
                  </span>
                )}

                <span style={{
                  fontSize:   '0.55rem',
                  color:      'rgba(168, 165, 160, 0.38)',
                  transform:  isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease',
                  lineHeight: 1,
                }}>
                  ▾
                </span>
              </button>

              {/* Expanded reward list */}
              {isExpanded && (
                <div style={{
                  padding:      '10px 10px 6px',
                  border:       '1px solid rgba(227, 195, 114, 0.12)',
                  borderTop:    'none',
                  borderRadius: '0 0 4px 4px',
                  background:   'rgba(0, 0, 0, 0.18)',
                }}>
                  {bounty.cycleNote && (
                    <div style={{
                      fontFamily:   'var(--font-sans)',
                      fontSize:     '0.48rem',
                      color:        'rgba(0, 212, 255, 0.60)',
                      fontStyle:    'italic',
                      marginBottom: 8,
                    }}>
                      {bounty.cycleNote}
                    </div>
                  )}

                  {rarityGroups.length > 0 ? (
                    rarityGroups.map(group => (
                      <RaritySection key={group.rarity} group={group} />
                    ))
                  ) : bounty.fallbackPool && bounty.fallbackPool.length > 0 ? (
                    <div style={{ marginBottom: 4 }}>
                      <div style={{
                        display:       'flex',
                        alignItems:    'center',
                        gap:           5,
                        marginBottom:  4,
                        paddingBottom: 3,
                        borderBottom:  '1px solid rgba(255, 255, 255, 0.04)',
                      }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(168, 165, 160, 0.32)', flexShrink: 0 }} />
                        <span style={{
                          fontFamily:    'var(--font-sans)',
                          fontSize:      '0.40rem',
                          fontWeight:    700,
                          letterSpacing: '0.24em',
                          textTransform: 'uppercase',
                          color:         'rgba(168, 165, 160, 0.40)',
                        }}>
                          Reward Pool
                        </span>
                      </div>
                      {bounty.fallbackPool.map((name, j) => {
                        const found = findByName(name);
                        return (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                            {found?.imageName && <ItemIcon imageName={found.imageName} name={name} size={16} style={{ opacity: 0.80 }} />}
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.60rem', color: 'var(--color-text-primary)' }}>
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize:   '0.50rem',
                      color:      'rgba(168, 165, 160, 0.30)',
                      fontStyle:  'italic',
                    }}>
                      No drop data for this tier.
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
