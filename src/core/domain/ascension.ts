// ---------------------------------------------------------------------------
// Raw API shapes — matches warframestat.us /pc/nightwave and /pc/sortie
// ---------------------------------------------------------------------------

export interface NightwaveChallengeRaw {
  id:          string;
  title:       string;
  desc:        string;
  standing:    number;  // NW standing reward
  isDaily:     boolean;
  isElite:     boolean;
  isPermanent: boolean;
  expiry:      string;  // ISO timestamp
  activation:  string;  // ISO timestamp
}

export interface NightwaveRaw {
  season:           number;
  tag:              string;
  expiry:           string;
  activeChallenges: NightwaveChallengeRaw[];
}

export interface SortieMission {
  missionType:         string;
  modifierType:        string;
  modifierDescription: string;
  node:                string;
}

export interface SortieRaw {
  expiry:   string;  // ISO timestamp — daily reset
  faction:  string;
  boss:     string;
  variants: SortieMission[];
}

// ---------------------------------------------------------------------------
// Derived types — computed at render time, never stored
// ---------------------------------------------------------------------------

/** Classified challenge kind — drives colors and section grouping. */
export type ChallengeKind = 'daily' | 'weekly' | 'elite';

/**
 * Derived view of a Nightwave challenge at a specific instant.
 * Merged with local completion state from userMarks.
 */
export interface ChallengeStatus {
  raw:         NightwaveChallengeRaw;
  kind:        ChallengeKind;
  completed:   boolean;
  msRemaining: number;  // 0 for permanents or expired
}

/** Derived view of the daily Sortie. */
export interface SortieStatus {
  raw:         SortieRaw;
  msRemaining: number;
}

/** Weekly standing summary for the header metric block. */
export interface StandingSummary {
  earned:    number;  // sum of completed challenge standing
  available: number;  // sum of all challenge standing
  pct:       number;  // 0–1 fraction
}
