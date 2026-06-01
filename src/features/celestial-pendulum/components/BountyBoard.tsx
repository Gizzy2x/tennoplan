/**
 * BountyBoard — full wiki-style bounty reward tables for the selected world.
 *
 * Structure mirrors wiki.warframe.com/w/Bounty:
 *   Tier (a live job, by level)  →  Rotation A/B/C  →  Stage groups  →  table
 *
 * Each stage group ("Stage 1", "Final Stage", …) shows its exact reward table
 * with per-item drop chances — no dedup, no compacting. Items that exist in the
 * codex are quick-look-able (click → smart window → full entry); currencies
 * render as accurate non-linkable tiles.
 *
 * Data: the real WFCD bounty tables via useEnrichedBounties → db.dropLocations
 * (populated by the drop-data sync). When that sync hasn't run, the empty state
 * offers an inline "Load bounty data" action.
 */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { findByName, findByUniqueName } from '@/adapters/items/itemsAdapter';
import { useQuickLook } from '@/store/quickLook';
import type { EnrichedBounty, EnrichedBountyReward, BountyRewardRarity } from '@/core/domain/bounty';
import type { RotationTier } from '@/core/domain/drops';
import styles from '../CelestialPendulum.module.css';

// ─── "Why run this?" editorial ────────────────────────────────────────────────

const ITEM_PITCH: [RegExp, string][] = [
  [/\bAya\b/i,            'Best source of Aya — trades toward Prime Vault items.'],
  [/arcane energize/i,    'Highest-value Eidolon arcane. Night only.'],
  [/arcane/i,             'Arcanes drop here — strong endgame alternatives.'],
  [/scintillant/i,        'Scintillant is rare; vaults are the best source.'],
  [/voidplume/i,          'Primary Holdfast standing currency — prioritise Lv.3.'],
  [/incarnon genesis/i,   'Incarnon weapon upgrade — limited weekly rotation.'],
  [/toroid/i,             'Core Corpus standing currency on Vallis.'],
  [/gyromag systems/i,    'Profit-Taker component — farm during Heist bounties.'],
];

function whyRunThis(bounty: EnrichedBounty): string {
  const allNames = bounty.rotations.flatMap((r) => r.rewards.map((rw) => rw.itemName));
  for (const [pattern, pitch] of ITEM_PITCH) {
    if (allNames.some((n) => pattern.test(n))) return pitch;
  }
  const maxLv = bounty.enemyLevels[1] ?? 0;
  if (bounty.isSteelPath || maxLv > 50) return 'High enemy level — best drop weights for rare rewards.';
  if (maxLv <= 25) return 'Quick clear — good for stacking standing between high-value runs.';
  return 'Balanced standing-to-time ratio. Solid mid-session option.';
}

// ─── Stage grouping ────────────────────────────────────────────────────────────

const RARITY_RANK: Record<BountyRewardRarity, number> = { Rare: 3, Uncommon: 2, Common: 1, Unknown: 0 };

/** Order stages: Stage 1 → 2/3 → 4 → Final. */
function stageRank(stage: string | undefined): number {
  if (!stage) return 50;
  if (/final/i.test(stage)) return 99;
  const m = /\d+/.exec(stage);
  return m ? Number(m[0]) : 50;
}

interface StageGroup { stage: string; rewards: EnrichedBountyReward[]; }

function groupByStage(rewards: EnrichedBountyReward[]): StageGroup[] {
  const map = new Map<string, StageGroup>();
  for (const r of rewards) {
    const stage = r.stage ?? 'Rewards';
    let g = map.get(stage);
    if (!g) { g = { stage, rewards: [] }; map.set(stage, g); }
    g.rewards.push(r);
  }
  const groups = [...map.values()].sort((a, b) => stageRank(a.stage) - stageRank(b.stage));
  for (const g of groups) {
    g.rewards.sort((a, b) => RARITY_RANK[b.tier] - RARITY_RANK[a.tier] || b.chance - a.chance);
  }
  return groups;
}

type OpenPreview = (uniqueName: string, name: string) => void;

// ─── Reward tile ──────────────────────────────────────────────────────────────

const RewardTile = memo(function RewardTile({ reward, onPreview }: { reward: EnrichedBountyReward; onPreview: OpenPreview }) {
  const found = useMemo(
    () => (reward.uniqueName ? findByUniqueName(reward.uniqueName) : findByName(reward.itemName)),
    [reward.uniqueName, reward.itemName],
  );
  const linkable = Boolean(reward.uniqueName);
  const chance = `${reward.chance.toFixed(1)}%`;

  const inner = (
    <>
      <span className={styles.rewardIcon}>
        {found?.imageName ? <ItemIcon imageName={found.imageName} name={reward.itemName} size={40} /> : <span className={styles.iconFallback} />}
      </span>
      <span className={styles.rewardName}>{reward.itemName}</span>
      <span className={styles.rewardChance} data-rarity={reward.tier.toLowerCase()}>{chance}</span>
    </>
  );

  if (linkable && reward.uniqueName) {
    const un = reward.uniqueName;
    return (
      <button
        type="button"
        className={styles.reward}
        data-rarity={reward.tier.toLowerCase()}
        data-link
        title={`${reward.itemName} — ${chance} · Click to preview`}
        onClick={() => onPreview(un, reward.itemName)}
        aria-label={`${reward.itemName}, ${reward.tier}, ${chance} — preview`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={styles.reward} data-rarity={reward.tier.toLowerCase()} title={`${reward.itemName} — ${chance}`}>
      {inner}
    </div>
  );
});

// ─── Board ────────────────────────────────────────────────────────────────────

interface BountyBoardProps {
  bounties:      EnrichedBounty[];
  accent:        string;
  emptyReason:   string;
  /** Inline action to fetch the drop-data tables when they're missing. */
  onLoadData?:   () => void;
  isLoadingData?: boolean;
}

export const BountyBoard = memo(function BountyBoard({ bounties, accent, emptyReason, onLoadData, isLoadingData }: BountyBoardProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeRot,   setActiveRot]   = useState<RotationTier | null>(null);
  const openQuickLook = useQuickLook((s) => s.open);
  const onPreview = useCallback<OpenPreview>((u, n) => openQuickLook(u, n), [openQuickLook]);

  const selectedBounty = bounties[selectedIdx] ?? null;

  useEffect(() => {
    if (selectedIdx >= bounties.length) setSelectedIdx(0);
  }, [bounties.length, selectedIdx]);

  const rotTabs = useMemo(
    () => (selectedBounty ? selectedBounty.rotations.filter((r) => r.tier !== null) : []),
    [selectedBounty],
  );

  useEffect(() => {
    if (!selectedBounty) { setActiveRot(null); return; }
    setActiveRot(selectedBounty.rotations.find((r) => r.tier !== null)?.tier ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx, bounties]);

  const activeRewards = useMemo<EnrichedBountyReward[]>(() => {
    if (!selectedBounty) return [];
    if (rotTabs.length > 0) {
      const rot = selectedBounty.rotations.find((r) => r.tier === activeRot)
        ?? selectedBounty.rotations.find((r) => r.tier !== null);
      return rot?.rewards ?? [];
    }
    return selectedBounty.rotations[0]?.rewards ?? [];
  }, [selectedBounty, rotTabs, activeRot]);

  const stageGroups = useMemo(() => groupByStage(activeRewards), [activeRewards]);
  const why = useMemo(() => (selectedBounty ? whyRunThis(selectedBounty) : ''), [selectedBounty]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (bounties.length === 0) {
    return (
      <div className={styles.bountyEmpty}>
        <span className={styles.bountyEmptyGlyph} aria-hidden="true">◇</span>
        <span className={styles.bountyEmptyText}>{emptyReason}</span>
        {onLoadData && (
          <button type="button" className={styles.loadBtn} onClick={onLoadData} disabled={isLoadingData}>
            {isLoadingData ? 'Loading… (~10 MB)' : 'Load bounty data'}
          </button>
        )}
      </div>
    );
  }

  // ── Board ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.bounty} style={{ ['--accent' as string]: accent } as React.CSSProperties}>
      <div className={styles.bountyHead}>
        <span className={styles.bountyTitle}>BOUNTIES</span>
        {selectedBounty && selectedBounty.standingTotal > 0 && (
          <span className={styles.bountyRep}>{selectedBounty.standingTotal.toLocaleString()} standing</span>
        )}
      </div>

      <div className={styles.tierStrip} role="tablist" aria-label="Bounty tiers">
        {bounties.map((b, i) => (
          <button
            key={b.jobType}
            role="tab"
            aria-selected={i === selectedIdx}
            className={styles.tier}
            data-active={i === selectedIdx || undefined}
            onClick={() => setSelectedIdx(i)}
          >
            <span className={styles.tierLabel}>{b.tierLabel}</span>
            {b.isSteelPath && <span className={styles.tierSp}>SP</span>}
          </button>
        ))}
      </div>

      {selectedBounty && (
        <>
          <p className={styles.bountyWhy}>{why}</p>

          {rotTabs.length > 1 && (
            <div className={styles.rotStrip} role="tablist" aria-label="Reward rotations">
              {rotTabs.map((rot) => (
                <button
                  key={rot.tier}
                  role="tab"
                  aria-selected={activeRot === rot.tier}
                  className={styles.rot}
                  data-active={activeRot === rot.tier || undefined}
                  onClick={() => setActiveRot(rot.tier as RotationTier)}
                >
                  ROT {rot.tier}
                </button>
              ))}
            </div>
          )}

          {stageGroups.map((g) => (
            <div key={g.stage} className={styles.stageSection}>
              <div className={styles.stageLabel}>{g.stage}</div>
              <div className={styles.rewardGrid}>
                {g.rewards.map((r, i) => (
                  <RewardTile key={`${r.itemName}-${i}`} reward={r} onPreview={onPreview} />
                ))}
              </div>
            </div>
          ))}

          {stageGroups.length === 0 && (
            <span className={styles.rewardGridEmpty}>No reward data for this tier.</span>
          )}
        </>
      )}
    </div>
  );
});
