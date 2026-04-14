/**
 * Core domain types for the Ascension Registry / Mastery Progression system.
 * Zero dependencies on React, Dexie, or any adapter.
 */

import type { ItemCategory } from './items';

// ---------------------------------------------------------------------------
// Status enum — ordered from least to most progressed
// ---------------------------------------------------------------------------

export enum ProgressionStatus {
  /** Item exists in the manifest but has never appeared in the log. */
  MISSING     = 'MISSING',
  /** Blueprint has been seen in the inventory log. */
  BLUEPRINT   = 'BLUEPRINT',
  /** Item is built / owned but not yet rank 30. */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Item has reached rank 30 (fully mastered). */
  MASTERED    = 'MASTERED',
}

// ---------------------------------------------------------------------------
// Stored record — mirrors the `progression` Dexie table row
// ---------------------------------------------------------------------------

/** Single item record stored in the `progression` table. */
export interface ProgressionRecord {
  id?:         number;
  /** Canonical item ID — e.g. "/Lotus/Powersuits/Ninja/Ninja" */
  itemId:      string;
  /** Human-readable display name — e.g. "Ash" */
  itemName:    string;
  category:    ItemCategory;
  status:      ProgressionStatus;
  /** Unix epoch ms — set by MasteryService on every write. */
  lastUpdated: number;
}

// ---------------------------------------------------------------------------
// Manifest entry — describes a single masterable item
// ---------------------------------------------------------------------------

/**
 * Entry in the Master Item Manifest used by MasteryService for reconciliation.
 * `logKey` is the short token that LogParserService currently extracts from EE.log
 * (last path segment of the matched `/Lotus/…` path).
 */
export interface ManifestItem {
  uniqueName: string;
  name:       string;
  category:   ItemCategory;
  /** Short token the LogParser extracts — used as the reconciliation key. */
  logKey:     string;
}

// ---------------------------------------------------------------------------
// Stats — returned by MasteryService.getProgressStats()
// ---------------------------------------------------------------------------

/** Per-category mastery summary. */
export interface CategoryProgress {
  category: ItemCategory;
  mastered: number;
  total:    number;
  /** 0–1 fraction */
  pct:      number;
  /** Human-readable label — e.g. "Warframes: 42/55 Mastered" */
  label:    string;
}
