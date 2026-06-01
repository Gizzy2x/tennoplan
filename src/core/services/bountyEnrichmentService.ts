/**
 * bountyEnrichmentService — pure function that merges one SyndicateJob with
 * the world's DropLocation rows to produce an EnrichedBounty.
 *
 * Match strategy:
 *   1. Parse "X - Y" level range from SyndicateJob.type
 *      (e.g. "Cetus Bounty Level 5 - 15" → [5, 15])
 *   2. Parse the same from DropLocation.bountyLevel
 *      (e.g. "Level 5 - 15 Ostron Bounty" → [5, 15])
 *   3. Match on (bountyLocation, lo, hi)
 *   4. Group matched rewards by rotationTier (A / B / C / null=flat)
 *   5. Sort each rotation by chance desc, then name asc
 *
 * Fallback: if no matches are found (never-synced Dexie, or level-range
 * format the parser doesn't recognise), surface `job.rewardPool` verbatim
 * so the UI never goes blank.
 *
 * Pure: no React, no Dexie, no fetch. All inputs arrive as plain data.
 */

import type { SyndicateJob } from '@/core/domain/syndicates';
import type {
  DropLocation,
  DropReward,
  BountyLocation,
  RotationTier,
} from '@/core/domain/drops';
import type {
  EnrichedBounty,
  EnrichedBountyReward,
  EnrichedBountyRotation,
  BountyRewardRarity,
} from '@/core/domain/bounty';

// ─── Level-range parsing ─────────────────────────────────────────────────────

/** Matches "5 - 15", "5-15", "5 – 15" (em dash), etc. */
const LEVEL_RANGE_RX = /(\d+)\s*[-–—]\s*(\d+)/;

function parseLevelRange(raw: string | undefined | null): [number, number] | null {
  if (!raw) return null;
  const m = LEVEL_RANGE_RX.exec(raw);
  if (!m || !m[1] || !m[2]) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
}

// ─── Rarity normalisation ────────────────────────────────────────────────────

/**
 * Collapse the upstream rarity string into our 4-tier bucket. Falls back to
 * drop-chance heuristics when the API omits the rarity field.
 *
 *   < 5%    → Rare
 *   < 15%   → Uncommon
 *   ≥ 15%   → Common
 */
function normaliseRarity(rarity: string, chance: number): BountyRewardRarity {
  const r = rarity?.toLowerCase() ?? '';
  if (r.includes('legendary') || r.includes('rare')) return 'Rare';
  if (r.includes('uncommon')) return 'Uncommon';
  if (r.includes('common')) return 'Common';

  // Unknown / empty — derive from chance
  if (chance > 0 && chance < 5)  return 'Rare';
  if (chance > 0 && chance < 15) return 'Uncommon';
  if (chance >= 15)              return 'Common';

  return 'Unknown';
}

function toEnrichedReward(r: DropReward): EnrichedBountyReward {
  return {
    itemName:   r.itemName,
    uniqueName: r.uniqueName,
    chance:     r.chance,
    rawRarity:  r.rarity,
    tier:       normaliseRarity(r.rarity, r.chance),
    ...(r.stage ? { stage: r.stage } : {}),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface EnrichBountyArgs {
  job: SyndicateJob;
  bountyLocation: BountyLocation;
  /** All DropLocation rows already scoped to this world (via the Dexie query). */
  locations: DropLocation[];
  /** Short cycle note to attach (from cycleAffinityService). May be null. */
  cycleNote?: string | null;
}

/** Short "LEVEL 5 - 15" or fallback to uppercased job type. */
function buildTierLabel(jobType: string, range: [number, number] | null): string {
  if (range) return `LEVEL ${range[0]} - ${range[1]}`;
  return jobType
    .replace(/\s*bounty\s*/gi, '')
    .trim()
    .toUpperCase();
}

export function enrichBounty({
  job,
  bountyLocation,
  locations,
  cycleNote = null,
}: EnrichBountyArgs): EnrichedBounty {
  // Prefer enemyLevels — the API sends job names like "Proof of Life" in
  // job.type, not level ranges, so parseLevelRange(job.type) always returns
  // null. enemyLevels is the authoritative [lo, hi] pair from the worldstate.
  const levelRange: [number, number] | null =
    job.enemyLevels[0] !== 0 || job.enemyLevels[1] !== 0
      ? job.enemyLevels
      : parseLevelRange(job.type);
  const isSteelPath   = /steel/i.test(job.type);
  const standingTotal = job.standingStages.reduce((a, b) => a + b, 0);

  // 1. Filter locations: right world + same level range
  const matches: DropLocation[] = [];
  if (levelRange) {
    for (const loc of locations) {
      if (loc.type !== 'Bounty') continue;
      if (loc.bountyLocation !== bountyLocation) continue;
      const locRange = parseLevelRange(loc.bountyLevel);
      if (!locRange) continue;
      if (locRange[0] === levelRange[0] && locRange[1] === levelRange[1]) {
        matches.push(loc);
      }
    }
  }

  // 2. Bucket rewards by rotation tier.
  //    Use a single Map keyed by 'A' | 'B' | 'C' | 'flat' so we preserve a
  //    deterministic render order.
  const bucket = new Map<RotationTier | 'flat', EnrichedBountyReward[]>();
  for (const loc of matches) {
    const key: RotationTier | 'flat' = loc.rotationTier ?? 'flat';
    const arr = bucket.get(key) ?? [];
    for (const r of loc.rewards) arr.push(toEnrichedReward(r));
    bucket.set(key, arr);
  }

  // 3. Sort + build rotations in deterministic order
  const ROTATION_ORDER: Array<RotationTier | 'flat'> = ['A', 'B', 'C', 'flat'];
  const rotations: EnrichedBountyRotation[] = [];
  for (const key of ROTATION_ORDER) {
    const rewards = bucket.get(key);
    if (!rewards || rewards.length === 0) continue;
    rewards.sort((a, b) => {
      if (b.chance !== a.chance) return b.chance - a.chance;
      return a.itemName.localeCompare(b.itemName);
    });
    rotations.push({
      tier:    key === 'flat' ? null : key,
      label:   key === 'flat' ? 'POOL' : `ROTATION ${key}`,
      rewards,
    });
  }

  // 4. Fallback: no drop-location matches → surface the flat rewardPool
  const fallbackPool =
    rotations.length === 0 && job.rewardPool && job.rewardPool.length > 0
      ? [...job.rewardPool]
      : null;

  return {
    jobType:       job.type,
    tierLabel:     buildTierLabel(job.type, levelRange),
    bountyLocation,
    levelRange,
    enemyLevels:   job.enemyLevels,
    standingTotal,
    isSteelPath,
    rotations,
    fallbackPool,
    cycleNote,
  };
}
