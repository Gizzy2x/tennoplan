/**
 * Drops domain — pure types for normalized drop-location rows.
 *
 * Source: drops.warframestat.us/data/all.json (updated ~monthly).
 * Rows are stored in the Dexie `dropLocations` table after normalization
 * by src/core/services/dropsService.ts.
 *
 * Pure domain file — no runtime dependencies.
 */

export type DropLocationType =
  | 'Mission Reward'
  | 'Relic'
  | 'Bounty'
  | 'Enemy Drop'
  | 'Enemy Mod Table'
  | 'Transient Reward'
  | 'Sortie Reward'
  | 'Key Reward';

export type BountyLocation =
  | 'Cetus'
  | 'Solaris'
  | 'Deimos'
  | 'Zariman'
  | 'Sanctum'     // Sanctum Anatomica / Albrecht's Laboratories (Fibonacci)
  | 'Hollvania';  // Höllvania / 1999 (The Hex)

export type RotationTier = 'A' | 'B' | 'C';

/**
 * Cycle-specific gating for a drop (e.g. Cetus night, Orb Vallis warm).
 * Not populated in Phase 1 — reserved for a Phase 2 manual mapping layer
 * because the upstream API does not expose this flag directly.
 */
export type CycleAffinity =
  | 'day'
  | 'night'
  | 'warm'
  | 'cold'
  | 'fass'
  | 'vome';

export interface DropReward {
  /** Display name of the reward item (matches WarframeItem.name in most cases). */
  itemName: string;
  /**
   * Canonical codex identity (TennoplanItem.uniqueName). Carried through from
   * the source item so downstream surfaces deep-link to the *exact* codex
   * entry instead of re-resolving by display name (which collides for generic
   * labels). Absent only for the legacy fallback reward pool.
   */
  uniqueName?: string;
  /** Drop chance as a percentage, 0–100. */
  chance: number;
  /** Rarity tier ("Common" | "Uncommon" | "Rare" | "Legendary" | "Unknown"). */
  rarity: string;
  /**
   * Bounty stage group this reward belongs to, e.g. "Stage 1", "Final Stage",
   * "Stage 2, Stage 3 of 4, and Stage 3 of 5". Preserved so the bounty view can
   * present the full per-stage table like the wiki. Only set for bounty rewards.
   */
  stage?: string;
}

export interface DropLocation {
  /**
   * Unique, deterministic key used as the Dexie primary key.
   * Built from type + facets so re-normalization produces stable upserts.
   */
  locationKey: string;

  /** High-level location category. */
  type: DropLocationType;

  /** Human-readable name — safe to render directly in UI. */
  displayName: string;

  /** Rewards obtainable from this location. */
  rewards: DropReward[];

  // ─── Faceted fields (present only where meaningful) ────────────────────────

  /** e.g. "Mars". Present for mission rewards. */
  planet?: string;
  /** e.g. "Apollo". Present for mission rewards. */
  node?: string;
  /** e.g. "Survival", "Defense". Present for mission rewards. */
  missionType?: string;

  /** Present when type === "Bounty". */
  bountyLocation?: BountyLocation;
  /** e.g. "Level 30 - 40". Present for bounties. */
  bountyLevel?: string;
  /** Present when type === "Bounty" and the API exposes rotations. */
  rotationTier?: RotationTier;

  /** Present when type === "Relic". */
  relicTier?: string;
  relicName?: string;
  relicState?: string;

  /** Phase 2 field — manual mapping layer. Undefined in Phase 1. */
  cycleAffinity?: CycleAffinity;

  /** Unix ms when this entry was last synced from the API. */
  fetchedAt: number;
}
