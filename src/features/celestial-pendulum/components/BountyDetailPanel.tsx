import { memo, useMemo, useState } from 'react';
import { Panel, PanelHeader, PanelLabel } from '@/components/ui/Panel';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { findByName } from '@/adapters/items/itemsAdapter';
import type { EnrichedBounty, BountyRewardRarity } from '@/core/domain/bounty';

// ─── Rarity helpers ───────────────────────────────────────────────────────────

const RARITY_ORDER: BountyRewardRarity[] = ['Rare', 'Uncommon', 'Common', 'Unknown'];

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

const RewardCard = memo(
  function RewardCard({ item }: { item: RarityGroupItem }) {
    const found = findByName(item.itemName);

    return (
      <div className="bounty-reward-card">
        {/* Icon container */}
        <div className="bounty-reward-icon-container">
          {found?.imageName ? (
            <ItemIcon imageName={found.imageName} name={item.itemName} size={40} style={{ opacity: 0.90 }} />
          ) : (
            <div className="bounty-reward-icon-fallback" />
          )}

          {/* Drop chance indicator (bottom-right corner) */}
          <span className={`bounty-reward-chance ${item.maxChance >= 20 ? 'bounty-reward-chance-high' : ''}`}>
            {item.maxChance.toFixed(0)}%
          </span>
        </div>

        {/* Item name */}
        <span className="bounty-reward-name">
          {item.itemName}
        </span>

        {/* Rotation badges */}
        {item.rotations.length > 0 && (
          <div className="bounty-reward-rotations">
            {item.rotations.map(r => (
              <span key={r} className="bounty-reward-rotation-badge" title={`Rotation ${r} — higher difficulty, better drops`}>
                Rotation {r}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => prev.item.itemName === next.item.itemName && prev.item.maxChance === next.item.maxChance
);

// ─── Rarity section ───────────────────────────────────────────────────────────

const RaritySection = memo(
  function RaritySection({ group }: { group: RarityGroup }) {
    const rarityKey = group.rarity.toLowerCase();

    return (
      <div className="bounty-rarity-section">
        <div className="bounty-rarity-header">
          <div className={`bounty-rarity-dot bounty-rarity-dot--${rarityKey}`} />
          <span className={`bounty-rarity-label bounty-rarity-label--${rarityKey}`}>
            {group.rarity}
          </span>
        </div>
        <div className="bounty-reward-grid">
          {group.items.map(item => (
            <RewardCard key={item.itemName} item={item} />
          ))}
        </div>
      </div>
    );
  },
  (prev, next) => prev.group.rarity === next.group.rarity && prev.group.items.length === next.group.items.length
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface BountyDetailPanelProps {
  bounties:   EnrichedBounty[];
  hasMission: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BountyDetailPanel({ bounties, hasMission }: BountyDetailPanelProps) {
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set([0]));

  // Pre-compute rarity groups for all tiers once — not per-click
  const allRarityGroups = useMemo(
    () => bounties.map(buildRarityGroups),
    [bounties],
  );

  const toggleExpanded = (index: number) => {
    const newSet = new Set(expandedSet);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedSet(newSet);
  };

  if (bounties.length === 0) {
    return (
      <Panel>
        <div className="bounty-empty-state">
          <span className="bounty-empty-message">
            {hasMission
              ? 'Tap Refresh to load bounty rewards.'
              : 'No active bounties for this world.'}
          </span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelLabel>Bounty Rewards by Rarity</PanelLabel>
      </PanelHeader>

      <div className="bounty-tiers-container">
        {bounties.map((bounty, i) => {
          const isExpanded   = expandedSet.has(i);
          const rarityGroups = isExpanded ? (allRarityGroups[i] ?? []) : [];

          return (
            <div key={i} className={`bounty-tier-group ${isExpanded ? 'bounty-tier-expanded' : ''}`}>
              {/* Tier card / toggle */}
              <button
                onClick={() => toggleExpanded(i)}
                className={`bounty-tier-btn ${isExpanded ? 'bounty-tier-btn-expanded' : ''}`}
                aria-expanded={isExpanded}
                aria-controls={`bounty-tier-content-${i}`}
              >
                <span className="bounty-tier-label">
                  {bounty.tierLabel}
                </span>

                {bounty.isSteelPath && (
                  <span className="badge-steel-path">STEEL PATH</span>
                )}

                {bounty.standingTotal > 0 && (
                  <span className="bounty-tier-standing">
                    {bounty.standingTotal.toLocaleString()} rep
                  </span>
                )}

                <span className="bounty-tier-chevron">
                  ▾
                </span>
              </button>

              {/* Expanded reward list */}
              {isExpanded && (
                <div
                  id={`bounty-tier-content-${i}`}
                  className="bounty-tier-expanded-content terminal-power-on"
                >
                  {bounty.cycleNote && (
                    <div className="bounty-cycle-note">
                      {bounty.cycleNote}
                    </div>
                  )}

                  {rarityGroups.length > 0 ? (
                    rarityGroups.map(group => (
                      <RaritySection key={group.rarity} group={group} />
                    ))
                  ) : bounty.fallbackPool && bounty.fallbackPool.length > 0 ? (
                    <div className="bounty-fallback-pool">
                      <div className="bounty-fallback-header">
                        <div className="bounty-fallback-dot" />
                        <span className="bounty-fallback-label">Reward Pool</span>
                      </div>
                      {bounty.fallbackPool.map((name, j) => {
                        const found = findByName(name);
                        return (
                          <div key={j} className="bounty-fallback-item">
                            {found?.imageName && <ItemIcon imageName={found.imageName} name={name} size={16} style={{ opacity: 0.80 }} />}
                            <span className="bounty-fallback-name">
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="bounty-no-data">
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
