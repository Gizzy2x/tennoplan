/** All world cycle identifiers in Tennoplan */
export type CycleId = 'cetus' | 'vallis' | 'cambion' | 'zariman' | 'earth' | 'duviri';

// Per-world state unions
export type CetusState   = 'day' | 'night';
export type VallisState  = 'warm' | 'cold';
export type CambionState = 'fass' | 'vome';
export type ZarimanState = 'corpus' | 'grineer';
export type EarthState   = 'day' | 'night';
export type DuviriState  = 'joy' | 'anger' | 'envy' | 'sorrow' | 'fear';

export type CycleState =
  | CetusState
  | VallisState
  | CambionState
  | ZarimanState
  | EarthState
  | DuviriState;

/**
 * A live snapshot of one world's cycle, as received from the API or restored
 * from the Dexie cache. Timestamps are Unix milliseconds.
 */
export interface WorldCycle {
  id:           CycleId;
  name:         string;  // e.g. "Plains of Eidolon"
  location:     string;  // e.g. "Cetus"
  state:        CycleState;
  expiryMs:     number;  // when the current state ends
  activationMs: number;  // when the current state started
  fetchedAt:    number;  // when we last retrieved this record
}

/**
 * Derived view computed at render time from a WorldCycle + Date.now().
 * Never stored — always recomputed.
 */
export interface CycleStatus {
  cycle:       WorldCycle;
  msRemaining: number;
  /** 0–1: how far through the current state we are */
  progress:    number;
  isExpired:   boolean;
}
