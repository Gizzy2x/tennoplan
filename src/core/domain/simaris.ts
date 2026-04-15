/**
 * Domain types for Simaris Sanctuary (daily synthesis target).
 * Zero imports from React, Dexie, or fetch — pure TS.
 */

export interface SynthesisTarget {
  name:       string;
  type:       string;
  isArchwing: boolean;
  isBoss:     boolean;
}

export interface SimarisData {
  activeSynthesisTarget: SynthesisTarget | null;
}
