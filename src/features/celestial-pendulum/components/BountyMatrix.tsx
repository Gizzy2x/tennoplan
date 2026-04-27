/**
 * BountyMatrix — Phase 4 of the Celestial Pendulum redesign.
 *
 * Replaces BountyDetailPanel. Endgame-focused HUD for bounty data:
 *
 *   • Tightly packed 40px rows — maximum information density
 *   • TTV (Time-To-Value) badge — Fast / Efficient / High Yield
 *   • Heartbeat progress bar — 1px bottom border shrinks with world cycle
 *   • Decode accordion — inline expansion, no page load; shows drop%,
 *     rotation breakdown, and "Why run this?" editorial
 *   • Reward icon tooltip — hover 16px icon for item usage context
 */

import { memo, useState, useCallback, useMemo, useRef } from 'react';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { findByName } from '@/adapters/items/itemsAdapter';
import type { EnrichedBounty, BountyRewardRarity } from '@/core/domain/bounty';

// ─── TTV Classification ───────────────────────────────────────────────────────

type TtvTier = 'Fast' | 'Efficient' | 'High Yield';

function classifyTtv(bounty: EnrichedBounty): TtvTier {
  if (bounty.isSteelPath) return 'High Yield';
  const maxLv = bounty.enemyLevels[1] ?? 0;
  if (maxLv > 50)  return 'High Yield';
  if (maxLv <= 25) return 'Fast';
  return 'Efficient';
}

const TTV_LABELS: Record<TtvTier, string> = {
  'Fast':       'FAST',
  'Efficient':  'EFFICIENT',
  'High Yield': 'HIGH YIELD',
};

// ─── "Why run this?" editorial ────────────────────────────────────────────────

/** Notable items and their pitch. Checked against all reward names. */
const ITEM_PITCH: [RegExp, string][] = [
  [/\bAya\b/i,              'Best source of Aya — trades for Prime Vault items.'],
  [/arcane energize/i,      'Highest-value Eidolon Arcane. Night only.'],
  [/arcane/i,               'Arcanes drop here — strong endgame mod alternatives.'],
  [/scintillant/i,          'Scintillant has a low spawn rate; vaults are the best source.'],
  [/breath of eidolon/i,    'Required for Eidolon-related crafting and ranking.'],
  [/voidplume quill/i,      'Primary Holdfast standing currency — prioritise Lv.3.'],
  [/incarnon genesis/i,     'Incarnon weapon upgrade — limited weekly rotation.'],
  [/toroid/i,               'Toroids are the core Corpus standing currency on Vallis.'],
  [/gyromag systems/i,      'Profit-Taker component — farm during Heist bounties.'],
];

function whyRunThis(bounty: EnrichedBounty): string {
  // Scan all reward names for known high-value items
  const allNames = [
    ...bounty.rotations.flatMap(r => r.rewards.map(rw => rw.itemName)),
    ...(bounty.fallbackPool ?? []),
  ];

  for (const [pattern, pitch] of ITEM_PITCH) {
    if (allNames.some(n => pattern.test(n))) return pitch;
  }

  // Generic fallback based on tier
  const ttv = classifyTtv(bounty);
  if (ttv === 'Fast')       return 'Quick clear, good for standing stacking between high-value runs.';
  if (ttv === 'High Yield') return 'High enemy level = best drop weights for rare rewards.';
  return 'Balanced standing-to-time ratio. Good mid-session option.';
}

// ─── Reward data helpers ──────────────────────────────────────────────────────

const RARITY_ORDER: BountyRewardRarity[] = ['Rare', 'Uncommon', 'Common', 'Unknown'];

interface FlatReward {
  itemName:  string;
  chance:    number;
  rarity:    BountyRewardRarity;
  rotations: string[];
}

/** Flatten all rotations into a deduplicated list sorted by rarity then chance */
function flattenRewards(bounty: EnrichedBounty): FlatReward[] {
  const map = new Map<string, FlatReward>();
  for (const rot of bounty.rotations) {
    for (const rw of rot.rewards) {
      const existing = map.get(rw.itemName);
      if (existing) {
        existing.chance = Math.max(existing.chance, rw.chance);
        if (rot.tier && !existing.rotations.includes(rot.tier)) {
          existing.rotations.push(rot.tier);
        }
      } else {
        map.set(rw.itemName, {
          itemName:  rw.itemName,
          chance:    rw.chance,
          rarity:    rw.tier,
          rotations: rot.tier ? [rot.tier] : [],
        });
      }
    }
  }
  const all = Array.from(map.values());
  all.sort((a, b) => {
    const ri = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    return ri !== 0 ? ri : b.chance - a.chance;
  });
  return all;
}

/** Pick the best reward to show as the 16px icon in the collapsed row */
function primaryReward(bounty: EnrichedBounty): FlatReward | null {
  const flat = flattenRewards(bounty);
  // Prefer Rare, then Uncommon, skip pure standing/endo entries
  const skip = /standing|endo|credits/i;
  return flat.find(r => (r.rarity === 'Rare' || r.rarity === 'Uncommon') && !skip.test(r.itemName))
    ?? flat[0]
    ?? null;
}

// ─── Reward icon with tooltip ─────────────────────────────────────────────────

const RewardIcon = memo(function RewardIcon({ reward }: { reward: FlatReward }) {
  const [tip, setTip] = useState(false);
  const found = findByName(reward.itemName);

  return (
    <div
      className="bm-reward-icon-wrap"
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      {found?.imageName ? (
        <ItemIcon imageName={found.imageName} name={reward.itemName} size={16} />
      ) : (
        <div className="bm-reward-icon-fallback" />
      )}
      {tip && (
        <div className="bm-reward-tooltip">
          <span className="bm-reward-tooltip-name">{reward.itemName}</span>
          <span className={`bm-reward-tooltip-rarity bm-reward-tooltip-rarity--${reward.rarity.toLowerCase()}`}>
            {reward.rarity} · {reward.chance.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
});

// ─── Decode accordion (expanded content) ─────────────────────────────────────

const DecodePanel = memo(function DecodePanel({ bounty }: { bounty: EnrichedBounty }) {
  const flat     = useMemo(() => flattenRewards(bounty), [bounty]);
  const why      = useMemo(() => whyRunThis(bounty),    [bounty]);
  const byRarity = useMemo(() => {
    const groups = new Map<BountyRewardRarity, FlatReward[]>();
    for (const r of flat) {
      if (!groups.has(r.rarity)) groups.set(r.rarity, []);
      groups.get(r.rarity)!.push(r);
    }
    return RARITY_ORDER.filter(r => groups.has(r)).map(r => ({ rarity: r, items: groups.get(r)! }));
  }, [flat]);

  const hasFallback = flat.length === 0 && bounty.fallbackPool && bounty.fallbackPool.length > 0;

  return (
    <div className="bm-decode">
      {/* Why run this? */}
      <div className="bm-decode-why">
        <span className="bm-decode-why-label">WHY RUN THIS?</span>
        <span className="bm-decode-why-text">{why}</span>
      </div>

      {/* Drop breakdown */}
      {byRarity.length > 0 ? (
        <div className="bm-decode-rewards">
          {byRarity.map(({ rarity, items }) => (
            <div key={rarity} className="bm-decode-rarity-group">
              <div className="bm-decode-rarity-header">
                <span className={`bm-decode-rarity-dot bm-decode-rarity-dot--${rarity.toLowerCase()}`} />
                <span className={`bm-decode-rarity-label bm-decode-rarity-label--${rarity.toLowerCase()}`}>
                  {rarity}
                </span>
              </div>
              <div className="bm-decode-items">
                {items.map(item => {
                  const found = findByName(item.itemName);
                  return (
                    <div key={item.itemName} className="bm-decode-item">
                      {found?.imageName && (
                        <ItemIcon imageName={found.imageName} name={item.itemName} size={16} />
                      )}
                      <span className="bm-decode-item-name">{item.itemName}</span>
                      <span className="bm-decode-item-chance">{item.chance.toFixed(1)}%</span>
                      {item.rotations.length > 0 && (
                        <span className="bm-decode-item-rot">
                          {item.rotations.map(r => `Rot.${r}`).join(' ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : hasFallback ? (
        <div className="bm-decode-fallback">
          {bounty.fallbackPool!.map((name, i) => {
            const found = findByName(name);
            return (
              <div key={i} className="bm-decode-item">
                {found?.imageName && (
                  <ItemIcon imageName={found.imageName} name={name} size={16} />
                )}
                <span className="bm-decode-item-name">{name}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <span className="bm-decode-no-data">No drop data for this tier.</span>
      )}
    </div>
  );
});

// ─── Single bounty row ────────────────────────────────────────────────────────

const BountyRow = memo(function BountyRow({
  bounty,
  index,
  isExpanded,
  cycleProgress,
  onToggle,
}: {
  bounty:        EnrichedBounty;
  index:         number;
  isExpanded:    boolean;
  cycleProgress: number;
  onToggle:      (i: number) => void;
}) {
  const ttv      = useMemo(() => classifyTtv(bounty), [bounty]);
  const primary  = useMemo(() => primaryReward(bounty), [bounty]);
  const decodeRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => onToggle(index), [onToggle, index]);

  // Heartbeat bar: shrinks as cycle nears its end (1 → 0)
  const barPct = ((1 - cycleProgress) * 100).toFixed(1);

  return (
    <div
      className={`bm-row-wrap${isExpanded ? ' bm-row-wrap--open' : ''}`}
      data-ttv={ttv.toLowerCase().replace(' ', '-')}
    >
      {/* Collapsed row — always 40px */}
      <button
        type="button"
        className="bm-row"
        onClick={handleClick}
        aria-expanded={isExpanded}
        aria-controls={`bm-decode-${index}`}
      >
        {/* Left: level range + standing */}
        <div className="bm-row-left">
          <span className="bm-row-tier">{bounty.tierLabel}</span>
          {bounty.standingTotal > 0 && (
            <span className="bm-row-rep">
              {bounty.standingTotal.toLocaleString()} rep
            </span>
          )}
        </div>

        {/* Center: primary reward icon */}
        <div className="bm-row-icon">
          {primary && <RewardIcon reward={primary} />}
        </div>

        {/* Right: badges + chevron */}
        <div className="bm-row-right">
          {bounty.isSteelPath && (
            <span className="bm-badge bm-badge--steel">SP</span>
          )}
          <span className={`bm-badge bm-badge--ttv bm-badge--${ttv.toLowerCase().replace(' ', '-')}`}>
            {TTV_LABELS[ttv]}
          </span>
          <span className="bm-row-chevron" aria-hidden="true">
            {isExpanded ? '▴' : '▾'}
          </span>
        </div>

        {/* Heartbeat progress bar — 1px, shrinks with cycle time */}
        <div className="bm-heartbeat" aria-hidden="true">
          <div className="bm-heartbeat-fill" style={{ width: `${barPct}%` }} />
        </div>
      </button>

      {/* Decode accordion */}
      <div
        id={`bm-decode-${index}`}
        className="bm-decode-wrap"
        ref={decodeRef}
        style={{ '--decode-open': isExpanded ? '1' : '0' } as React.CSSProperties}
      >
        <DecodePanel bounty={bounty} />
      </div>
    </div>
  );
});

// ─── Matrix ───────────────────────────────────────────────────────────────────

interface BountyMatrixProps {
  bounties:      EnrichedBounty[];
  hasMission:    boolean;
  cycleProgress: number;   // 0–1 — drives heartbeat bars
}

export const BountyMatrix = memo(function BountyMatrix({
  bounties,
  hasMission,
  cycleProgress,
}: BountyMatrixProps) {
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());

  const toggle = useCallback((i: number) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }, []);

  if (bounties.length === 0) {
    return (
      <div className="bm-empty">
        <span className="bm-empty-text">
          {hasMission ? 'Tap Refresh to load bounty data.' : 'No active bounties for this world.'}
        </span>
      </div>
    );
  }

  return (
    <div className="bm-matrix">
      {/* Header */}
      <div className="bm-header">
        <span className="bm-header-col bm-header-col--tier">BOUNTY TIER</span>
        <span className="bm-header-col bm-header-col--reward">TOP REWARD</span>
        <span className="bm-header-col bm-header-col--ttv">EFFICIENCY</span>
      </div>

      {/* Rows */}
      <div className="bm-rows">
        {bounties.map((bounty, i) => (
          <BountyRow
            key={bounty.jobType}
            bounty={bounty}
            index={i}
            isExpanded={expandedSet.has(i)}
            cycleProgress={cycleProgress}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
});
