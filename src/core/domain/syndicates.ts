/**
 * Domain types for the open-world syndicates displayed on the Celestial Pendulum.
 * Zero imports from React, Dexie, or fetch — pure TS.
 */

export interface SyndicateJob {
  type:           string;
  enemyLevels:    [number, number];
  standingStages: number[];
  rewardPool?:    string[];
  /** Mastery Rank required to accept this tier (0/absent = no lock). */
  minMR?:         number;
  /** True for Deimos Isolation Vault bounties. */
  isVault?:       boolean;
  /** True for time-limited bounties (e.g. Narmer). */
  timeBound?:     boolean;
  /** The CURRENT live reward rotation (the "Table" the board sits on now). */
  rotation?:      'A' | 'B' | 'C';
  /** Live drops for the current rotation (warframestat only — real chances). */
  rewardPoolDrops?: BountyDrop[];
}

/** One live bounty drop (current rotation). `chance` is a percent (0–100). */
export interface BountyDrop {
  item:   string;
  rarity: string;
  chance: number;
  count?: number;
}

export interface SyndicateMission {
  id:        string;
  syndicate: string;   // canonical name, e.g. "Ostron"
  expiry:    string;   // ISO timestamp (may be empty string when absent from API)
  expiryMs:  number;   // parsed ms epoch (0 when expiry absent)
  jobs:      SyndicateJob[];
}
