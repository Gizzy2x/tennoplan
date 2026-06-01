/**
 * Bounty domain — types for the enrichment pipeline that merges:
 *   - SyndicateJob (live worldstate — what's active right now)
 *   - DropLocation (drops.warframestat.us — what CAN drop at this level range)
 *   - CycleState    (world cycle — gates some rewards to day/night/warm/cold)
 *
 * Pure domain: no React, no Dexie, no fetch. Consumed by:
 *   - src/core/services/bountyEnrichmentService.ts (producer)
 *   - src/features/celestial-pendulum/components/BountyJobList.tsx (consumer)
 */

import type { BountyLocation, RotationTier } from './drops';

/**
 * Normalised rarity bucket. The upstream API uses freeform strings
 * ("Common", "Uncommon", "Rare", "Legendary"), sometimes missing.
 * We collapse them into 4 tiers for consistent UI rendering.
 */
export type BountyRewardRarity = 'Rare' | 'Uncommon' | 'Common' | 'Unknown';

export interface EnrichedBountyReward {
  itemName: string;
  /** Canonical codex identity, threaded from the source item for deterministic deep-linking. */
  uniqueName?: string;
  /** Drop chance as a percentage (0–100). Copied verbatim from DropReward.chance. */
  chance: number;
  /** Original rarity string from the API (preserved for tooltips). */
  rawRarity: string;
  /** Collapsed rarity tier for UI grouping. */
  tier: BountyRewardRarity;
  /** Bounty stage group, e.g. "Stage 1" / "Final Stage" — drives the per-stage view. */
  stage?: string;
}

export interface EnrichedBountyRotation {
  /** 'A' | 'B' | 'C', or null when the upstream data is a flat pool. */
  tier: RotationTier | null;
  /** UI label, e.g. "ROTATION A" or "POOL". */
  label: string;
  /** Rewards sorted by chance desc, then name asc. */
  rewards: EnrichedBountyReward[];
}

/**
 * One bounty tier (matches a single SyndicateJob) enriched with real drop data.
 * The renderer iterates `rotations` to produce tabs/sections.
 */
export interface EnrichedBounty {
  /** Raw SyndicateJob.type, e.g. "Cetus Bounty Level 5 - 15". */
  jobType: string;
  /** Short display tier label, e.g. "LEVEL 5 - 15". */
  tierLabel: string;
  /** Which open world this bounty belongs to. */
  bountyLocation: BountyLocation;
  /** Parsed range, or null when the job type did not contain a range. */
  levelRange: [number, number] | null;
  /** SyndicateJob.enemyLevels — the actual in-game enemy levels. */
  enemyLevels: [number, number];
  /** Total standing across all stages. */
  standingTotal: number;
  /** True when the job type mentions Steel Path. */
  isSteelPath: boolean;
  /** One entry per rotation tier; always has ≥1 when rewards exist. */
  rotations: EnrichedBountyRotation[];
  /**
   * If zero drop-location matches were found, the pre-Phase-2 flat reward
   * pool is surfaced here so the UI can still render something.
   * When this is set, `rotations` will be empty.
   */
  fallbackPool: string[] | null;
  /** Short cycle-context note, e.g. "Eidolon Hunts active (night-only)." */
  cycleNote: string | null;
}
