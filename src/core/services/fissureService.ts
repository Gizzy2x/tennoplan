import type { Fissure, FissureStatus, FissureTier } from '../domain/relics';
import { TIER_ORDER } from '../domain/relics';

// ---------------------------------------------------------------------------
// Stat helpers
// ---------------------------------------------------------------------------

/** Fissure with the soonest expiry from a flat array. Returns null if empty. */
export function getNextToExpire(fissures: Fissure[]): Fissure | null {
  if (fissures.length === 0) return null;
  return fissures.reduce((a, b) => (a.expiryMs < b.expiryMs ? a : b));
}

/** Count Steel Path (isHard) fissures in a flat array. */
export function countSteelPath(fissures: Fissure[]): number {
  return fissures.filter(f => f.isHard).length;
}

/**
 * Returns tier keys ordered by each tier's soonest-expiring fissure.
 * Tiers with no fissures sort last (Infinity). Input map holds FissureStatus
 * arrays (already expiry-sorted ascending from groupByTier + computeFissureStatus).
 */
export function sortTiersByEarliestExpiry(
  grouped: Map<FissureTier, FissureStatus[]>,
): FissureTier[] {
  return [...TIER_ORDER].sort((a, b) => {
    const aMin = (grouped.get(a) ?? [])[0]?.fissure.expiryMs ?? Infinity;
    const bMin = (grouped.get(b) ?? [])[0]?.fissure.expiryMs ?? Infinity;
    return aMin - bMin;
  });
}

// ---------------------------------------------------------------------------
// Status computation
// ---------------------------------------------------------------------------

/**
 * Derive a FissureStatus from a Fissure at the given instant.
 * Pure function — safe to call every second.
 */
export function computeFissureStatus(fissure: Fissure, now: number): FissureStatus {
  const msRemaining = Math.max(0, fissure.expiryMs - now);
  const duration    = fissure.expiryMs - fissure.activationMs;
  const elapsed     = now - fissure.activationMs;
  const progress    = duration > 0
    ? Math.min(1, Math.max(0, elapsed / duration))
    : 0;

  return { fissure, msRemaining, progress, isExpired: msRemaining === 0 };
}

// ---------------------------------------------------------------------------
// Sorting and grouping
// ---------------------------------------------------------------------------

/** Sort fissures by expiry ascending (soonest first within a tier group). */
export function sortByExpiry(fissures: Fissure[]): Fissure[] {
  return [...fissures].sort((a, b) => a.expiryMs - b.expiryMs);
}

/** Group fissures by tier, in canonical tier order (Lith → Omnia). */
export function groupByTier(fissures: Fissure[]): Map<FissureTier, Fissure[]> {
  const map = new Map<FissureTier, Fissure[]>();
  for (const tier of TIER_ORDER) {
    map.set(tier, []);
  }
  for (const f of fissures) {
    map.get(f.tier)?.push(f);
  }
  // Sort within each tier by expiry
  for (const [tier, list] of map) {
    map.set(tier, sortByExpiry(list));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export interface FissureFilters {
  showNormal:    boolean;
  showStorm:     boolean;
  showSteelPath: boolean;
}

export function filterFissures(fissures: Fissure[], filters: FissureFilters): Fissure[] {
  return fissures.filter(f => {
    if (f.isStorm)    return filters.showStorm;
    if (f.isHard)     return filters.showSteelPath;
    return filters.showNormal;
  });
}

// ---------------------------------------------------------------------------
// Presentation helpers (pure — no React)
// ---------------------------------------------------------------------------

/** Hex color for each tier. */
export const TIER_COLOR: Record<FissureTier, string> = {
  Lith:    '#E3C372',  // gold   — most common
  Meso:    '#bac3fe',  // violet
  Neo:     '#67e8f9',  // cyan
  Axi:     '#c084fc',  // purple
  Requiem: '#fb923c',  // orange
  Omnia:   '#f87171',  // red    — rarest
};

/** Hex color for each enemy faction. */
export const ENEMY_COLOR: Record<string, string> = {
  Grineer:   '#f87171',
  Corpus:    '#60a5fa',
  Infested:  '#86efac',
  Corrupted: '#E3C372',
  Orokin:    '#E3C372',
  Crossfire: '#bac3fe',
};
