/**
 * BountyBoard — Warframe-style bounty selection + reward display.
 *
 * Replaces BountyMatrix. Layout:
 *   Tier strip   — scrollable horizontal tabs, one per bounty tier
 *   Reward pane  — selected bounty's reward breakdown
 *     Header     — level range + standing + "Why run this?" callout
 *     Rot. tabs  — A / B / C when rotation data is available
 *     Reward grid — RewardCard × N
 *       Hover: card expands downward (mod-card style) showing rotation + chance
 *       Click: RewardPopup floating window with codex stub
 */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { findByName } from '@/adapters/items/itemsAdapter';
import type { EnrichedBounty, BountyRewardRarity, EnrichedBountyReward } from '@/core/domain/bounty';
import type { RotationTier } from '@/core/domain/drops';

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
  const allNames = [
    ...bounty.rotations.flatMap(r => r.rewards.map(rw => rw.itemName)),
    ...(bounty.fallbackPool ?? []),
  ];
  for (const [pattern, pitch] of ITEM_PITCH) {
    if (allNames.some(n => pattern.test(n))) return pitch;
  }
  const ttv = classifyTtv(bounty);
  if (ttv === 'Fast')       return 'Quick clear, good for standing stacking between high-value runs.';
  if (ttv === 'High Yield') return 'High enemy level = best drop weights for rare rewards.';
  return 'Balanced standing-to-time ratio. Good mid-session option.';
}

// ─── Deduplicate rewards (same item can appear twice in a rotation pool) ─────

function deduplicateRewards(rewards: EnrichedBountyReward[]): EnrichedBountyReward[] {
  const seen = new Map<string, EnrichedBountyReward>();
  for (const r of rewards) {
    const existing = seen.get(r.itemName);
    if (!existing || r.chance > existing.chance) seen.set(r.itemName, r);
  }
  return Array.from(seen.values());
}

// ─── Popup data ───────────────────────────────────────────────────────────────

interface PopupData {
  itemName:             string;
  rarity:               BountyRewardRarity;
  chance:               number;
  allRotationChances:   { tier: string; chance: number }[];
  imageName?:           string;
}

// ─── Reward popup ─────────────────────────────────────────────────────────────

const RewardPopup = memo(function RewardPopup({
  data,
  onClose,
}: {
  data:    PopupData;
  onClose: () => void;
}) {
  return (
    <>
      <div className="bb-popup-backdrop" onClick={onClose} />
      <div className="bb-popup" role="dialog" aria-modal="true" aria-label={data.itemName}>
        <button className="bb-popup-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="bb-popup-icon-area">
          {data.imageName ? (
            <ItemIcon imageName={data.imageName} name={data.itemName} size={72} />
          ) : (
            <div className="bb-popup-icon-fallback" />
          )}
        </div>

        <div className="bb-popup-name">{data.itemName}</div>

        <div className="bb-popup-meta">
          <span className={`bb-popup-rarity bb-popup-rarity--${data.rarity.toLowerCase()}`}>
            {data.rarity}
          </span>
          <span className="bb-popup-chance">{data.chance.toFixed(1)}% drop chance</span>
        </div>

        {data.allRotationChances.length > 0 && (
          <div className="bb-popup-rotations">
            <div className="bb-popup-rotations-label">DROP BREAKDOWN BY ROTATION</div>
            {data.allRotationChances.map(({ tier, chance }) => (
              <div key={tier} className="bb-popup-rotation-row">
                <span className="bb-popup-rotation-tier">Rotation {tier}</span>
                <span className="bb-popup-rotation-chance">{chance.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}

        <div className="bb-popup-codex-section">
          <button className="bb-popup-codex-btn" disabled title="Full codex coming soon">
            Open in Codex →
          </button>
          <span className="bb-popup-codex-note">Codex integration coming soon</span>
        </div>
      </div>
    </>
  );
});

// ─── Reward card ──────────────────────────────────────────────────────────────

interface RewardCardProps {
  reward:              EnrichedBountyReward;
  allRotationChances:  { tier: string; chance: number }[];
  onPopup:             (data: PopupData) => void;
}

const RewardCard = memo(function RewardCard({
  reward,
  allRotationChances,
  onPopup,
}: RewardCardProps) {
  const found = useMemo(() => findByName(reward.itemName), [reward.itemName]);

  const handleClick = useCallback(() => {
    onPopup({
      itemName:           reward.itemName,
      rarity:             reward.tier,
      chance:             reward.chance,
      allRotationChances,
      imageName:          found?.imageName,
    });
  }, [reward, allRotationChances, found, onPopup]);

  const hoverInfo = useMemo(() => {
    if (allRotationChances.length > 1) {
      return `Drops in ${allRotationChances.length} rotations  ·  best ${Math.max(...allRotationChances.map(r => r.chance)).toFixed(1)}%`;
    }
    if (allRotationChances.length === 1) {
      return `Rotation ${allRotationChances[0].tier}  ·  ${allRotationChances[0].chance.toFixed(1)}%`;
    }
    return `${reward.chance.toFixed(1)}% drop chance`;
  }, [reward.chance, allRotationChances]);

  return (
    <div
      className={`bb-reward-card bb-reward-card--${reward.tier.toLowerCase()}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      aria-label={`${reward.itemName}, ${reward.tier}, ${reward.chance.toFixed(1)}%`}
    >
      {/* Icon */}
      <div className="bb-card-icon-area">
        {found?.imageName ? (
          <ItemIcon imageName={found.imageName} name={reward.itemName} size={72} />
        ) : (
          <div className="bb-card-icon-fallback" />
        )}
      </div>

      {/* Name + chance (always visible) */}
      <div className="bb-card-info">
        <span className="bb-card-name">{reward.itemName}</span>
        <span className={`bb-card-chance bb-card-chance--${reward.tier.toLowerCase()}`}>
          {reward.chance.toFixed(1)}%
        </span>
      </div>

      {/* Hover expansion — slides down like a mod card */}
      <div className="bb-card-hover">
        <span className="bb-card-hover-text">{hoverInfo}</span>
        <span className="bb-card-hover-cta">Click for details</span>
      </div>
    </div>
  );
});

// ─── Bounty tier tab ──────────────────────────────────────────────────────────

interface TierTabProps {
  bounty:        EnrichedBounty;
  isActive:      boolean;
  cycleProgress: number;
  onClick:       () => void;
}

const TierTab = memo(function TierTab({
  bounty,
  isActive,
  cycleProgress,
  onClick,
}: TierTabProps) {
  const ttv     = classifyTtv(bounty);
  const barPct  = ((1 - cycleProgress) * 100).toFixed(1);

  // Best reward for the preview icon — prefer Rare, then Uncommon
  const previewReward = useMemo(() => {
    const all = bounty.rotations.flatMap(r => r.rewards);
    return (
      all.find(r => r.tier === 'Rare') ??
      all.find(r => r.tier === 'Uncommon') ??
      all[0] ??
      null
    );
  }, [bounty]);

  const found = previewReward ? findByName(previewReward.itemName) : null;

  return (
    <button
      className={`bb-tier-tab${isActive ? ' bb-tier-tab--active' : ''}`}
      onClick={onClick}
      data-ttv={ttv.toLowerCase().replace(' ', '-')}
      aria-pressed={isActive}
      aria-label={bounty.tierLabel}
    >
      {/* Preview icon for the top reward */}
      <div className="bb-tier-tab-icon">
        {found?.imageName ? (
          <ItemIcon imageName={found.imageName} name={previewReward?.itemName ?? ''} size={28} />
        ) : (
          <div className="bb-tier-tab-icon-fallback" />
        )}
      </div>

      {/* Level range + SP flag */}
      <div className="bb-tier-tab-info">
        <span className="bb-tier-tab-level">{bounty.tierLabel}</span>
        {bounty.isSteelPath && <span className="bb-tier-tab-sp">STEEL PATH</span>}
      </div>

      {/* TTV badge */}
      <span className={`bb-tier-tab-ttv bm-badge--${ttv.toLowerCase().replace(' ', '-')}`}>
        {TTV_LABELS[ttv]}
      </span>

      {/* Cycle heartbeat bar */}
      <div className="bb-tier-heartbeat" aria-hidden="true">
        <div className="bb-tier-heartbeat-fill" style={{ width: `${barPct}%` }} />
      </div>
    </button>
  );
});

// ─── Main board ───────────────────────────────────────────────────────────────

interface BountyBoardProps {
  bounties:      EnrichedBounty[];
  hasMission:    boolean;
  cycleProgress: number;
}

export const BountyBoard = memo(function BountyBoard({
  bounties,
  hasMission,
  cycleProgress,
}: BountyBoardProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeRot,   setActiveRot]   = useState<RotationTier | null>(null);
  const [popup,       setPopup]       = useState<PopupData | null>(null);

  const selectedBounty = bounties[selectedIdx] ?? null;

  // Clamp selection when bounties list changes (world switch)
  useEffect(() => {
    if (bounties.length > 0 && selectedIdx >= bounties.length) {
      setSelectedIdx(0);
    }
  }, [bounties.length, selectedIdx]);

  // Reset active rotation when the selected bounty changes
  useEffect(() => {
    if (!selectedBounty) { setActiveRot(null); return; }
    const hasTiers = selectedBounty.rotations.some(r => r.tier !== null);
    setActiveRot(hasTiers ? (selectedBounty.rotations[0]?.tier ?? null) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx]);

  const hasTiers = useMemo(
    () => selectedBounty?.rotations.some(r => r.tier !== null) ?? false,
    [selectedBounty],
  );

  const rotations = selectedBounty?.rotations ?? [];

  // Rewards shown for the active rotation (or flat pool) — deduplicated
  const displayedRewards = useMemo<EnrichedBountyReward[]>(() => {
    if (!selectedBounty || rotations.length === 0) return [];
    const raw = hasTiers && activeRot !== null
      ? (rotations.find(r => r.tier === activeRot)?.rewards ?? [])
      : (rotations[0]?.rewards ?? []);
    return deduplicateRewards(raw);
  }, [selectedBounty, rotations, hasTiers, activeRot]);

  // Map: itemName → all {tier, chance} pairs across every rotation
  const itemRotationMap = useMemo(() => {
    const map = new Map<string, { tier: string; chance: number }[]>();
    if (!selectedBounty) return map;
    for (const rot of selectedBounty.rotations) {
      for (const rw of rot.rewards) {
        const entries = map.get(rw.itemName) ?? [];
        if (rot.tier) entries.push({ tier: rot.tier, chance: rw.chance });
        map.set(rw.itemName, entries);
      }
    }
    return map;
  }, [selectedBounty]);

  const why = useMemo(
    () => (selectedBounty ? whyRunThis(selectedBounty) : ''),
    [selectedBounty],
  );

  const handlePopup  = useCallback((data: PopupData) => setPopup(data), []);
  const handleClose  = useCallback(() => setPopup(null), []);

  const hasFallback = displayedRewards.length === 0
    && (selectedBounty?.fallbackPool?.length ?? 0) > 0;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (bounties.length === 0) {
    return (
      <div className="bb-empty">
        <span className="bb-empty-text">
          {hasMission
            ? 'Tap Refresh to load bounty data.'
            : 'No active bounties for this world.'}
        </span>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="bb-board">

      {/* ── Tier selection strip ─────────────────────────────────────── */}
      <div className="bb-tier-strip" role="tablist" aria-label="Bounty tiers">
        {bounties.map((bounty, i) => (
          <TierTab
            key={bounty.jobType}
            bounty={bounty}
            isActive={i === selectedIdx}
            cycleProgress={cycleProgress}
            onClick={() => setSelectedIdx(i)}
          />
        ))}
      </div>

      {/* ── Reward pane ──────────────────────────────────────────────── */}
      {selectedBounty && (
        <div className="bb-reward-pane">

          {/* Header: tier label + standing + Why */}
          <div className="bb-pane-header">
            <div className="bb-pane-header-top">
              <span className="bb-pane-title">{selectedBounty.tierLabel}</span>
              {selectedBounty.standingTotal > 0 && (
                <span className="bb-pane-rep">
                  {selectedBounty.standingTotal.toLocaleString()} rep
                </span>
              )}
            </div>
            <div className="bb-pane-why">
              <span className="bb-pane-why-icon">↗</span>
              <span className="bb-pane-why-text">{why}</span>
            </div>
          </div>

          {/* Rotation tabs — A / B / C (only when data has tiers) */}
          {hasTiers && rotations.filter(r => r.tier !== null).length > 1 && (
            <div className="bb-rotation-strip" role="tablist" aria-label="Reward rotations">
              {rotations.filter(r => r.tier !== null).map(rot => (
                <button
                  key={rot.tier}
                  role="tab"
                  aria-selected={activeRot === rot.tier}
                  className={`bb-rotation-tab${activeRot === rot.tier ? ' bb-rotation-tab--active' : ''}`}
                  onClick={() => setActiveRot(rot.tier as RotationTier)}
                >
                  <span className="bb-rotation-tab-label">ROT. {rot.tier}</span>
                  {rot.rewards[0] && (
                    <span
                      className={`bb-rotation-dot bb-rotation-dot--${rot.rewards[0].tier.toLowerCase()}`}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Reward grid */}
          <div className="bb-reward-grid">
            {displayedRewards.map(reward => (
              <RewardCard
                key={reward.itemName}
                reward={reward}
                allRotationChances={itemRotationMap.get(reward.itemName) ?? []}
                onPopup={handlePopup}
              />
            ))}

            {/* Fallback pool (no rotation data) */}
            {hasFallback && selectedBounty.fallbackPool!.map((name, i) => {
              const item = findByName(name);
              return (
                <div key={`fb-${i}`} className="bb-reward-card bb-reward-card--unknown">
                  <div className="bb-card-icon-area">
                    {item?.imageName ? (
                      <ItemIcon imageName={item.imageName} name={name} size={72} />
                    ) : (
                      <div className="bb-card-icon-fallback" />
                    )}
                  </div>
                  <div className="bb-card-info">
                    <span className="bb-card-name">{name}</span>
                    <span className="bb-card-chance bb-card-chance--unknown">—</span>
                  </div>
                </div>
              );
            })}

            {displayedRewards.length === 0 && !hasFallback && (
              <div className="bb-reward-grid-empty">No drop data for this rotation.</div>
            )}
          </div>

          {/* Cycle note */}
          {selectedBounty.cycleNote && (
            <div className="bb-cycle-note">
              <span className="bb-cycle-note-icon" aria-hidden="true">◆</span>
              <span className="bb-cycle-note-text">{selectedBounty.cycleNote}</span>
            </div>
          )}

        </div>
      )}

      {/* Item detail popup */}
      {popup && <RewardPopup data={popup} onClose={handleClose} />}
    </div>
  );
});
