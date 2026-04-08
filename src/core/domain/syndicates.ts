/**
 * Domain types for the open-world syndicates displayed on the Celestial Pendulum.
 * Zero imports from React, Dexie, or fetch — pure TS.
 */

export interface SyndicateJob {
  type:           string;
  enemyLevels:    [number, number];
  standingStages: number[];
  rewardPool?:    string[];
}

export interface SyndicateMission {
  id:        string;
  syndicate: string;   // canonical name, e.g. "Ostron"
  expiry:    string;   // ISO timestamp (may be empty string when absent from API)
  expiryMs:  number;   // parsed ms epoch (0 when expiry absent)
  jobs:      SyndicateJob[];
}
