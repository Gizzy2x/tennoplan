/** Void fissure tier — matches the API "tier" string exactly. */
export type FissureTier = 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem' | 'Omnia';

/** Numeric rank 1–6 corresponding to each tier. */
export const TIER_NUM: Record<FissureTier, number> = {
  Lith:    1,
  Meso:    2,
  Neo:     3,
  Axi:     4,
  Requiem: 5,
  Omnia:   6,
};

export const TIER_ORDER: FissureTier[] = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Omnia'];

/** Enemy faction label as returned by the API. */
export type FissureEnemy =
  | 'Grineer'
  | 'Corpus'
  | 'Infested'
  | 'Corrupted'
  | 'Orokin'
  | 'Crossfire';

/**
 * A single active void fissure, as received from the API or Dexie cache.
 * Timestamps are Unix milliseconds.
 */
export interface Fissure {
  id:           string;
  node:         string;   // e.g. "Apollodorus (Mercury)"
  missionType:  string;   // e.g. "Survival"
  enemy:        FissureEnemy;
  tier:         FissureTier;
  tierNum:      number;   // 1–6
  expiryMs:     number;
  activationMs: number;
  fetchedAt:    number;
  isStorm:      boolean;  // Void Storm variant
  isHard:       boolean;  // Steel Path
}

/**
 * Derived view of a Fissure at a specific instant.
 * Never stored — always recomputed.
 */
export interface FissureStatus {
  fissure:     Fissure;
  msRemaining: number;
  /** 0–1: elapsed fraction of fissure duration */
  progress:    number;
  isExpired:   boolean;
}
