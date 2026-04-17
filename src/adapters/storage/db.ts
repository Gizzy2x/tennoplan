import Dexie, { type Table } from "dexie";
import type { AssetRecord, SyncError } from "@/core/domain/assets";
import type { ProgressionRecord } from "@/core/domain/progression";
import type { ItemState } from "@/core/domain/itemState";
import type { DropLocation } from "@/core/domain/drops";

export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface CacheEntry {
  key: string;
  data: unknown;
  expiresAt: number;
  updatedAt: number;
}

export interface UserMark {
  id?: number;
  type: string;
  referenceId: string;
  status: string;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
}

export class TennoplanDB extends Dexie {
  settings!: Table<Setting, string>;
  cache!: Table<CacheEntry, string>;
  userMarks!: Table<UserMark, number>;
  /** Per-asset metadata for the Asset Sync Engine. Primary key: uniqueName. */
  assetMeta!: Table<AssetRecord, string>;
  /** Error log for failed/404 asset downloads. Replaces a flat log file. */
  syncErrors!: Table<SyncError, number>;
  /** Ascension Registry — one row per masterable item. Written only by MasteryService. */
  progression!: Table<ProgressionRecord, number>;
  /** Per-user overlay state for items (owned flag). Sparse: rows only exist for touched items. */
  itemStates!: Table<ItemState, string>;
  /** Normalized drop locations from drops.warframestat.us. Wipe + bulkPut on sync. */
  dropLocations!: Table<DropLocation, string>;

  constructor() {
    super("tennoplan");

    this.version(1).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
    });

    // Version 2 — Asset Sync Engine tables
    // uniqueName is the primary key; cacheKey, status, priority, lastAccessedAt are indexed
    // for LRU eviction (filter by status='cached', sort by lastAccessedAt).
    this.version(2).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
      assetMeta: "uniqueName, cacheKey, status, priority, lastAccessedAt",
      syncErrors: "++id, occurredAt, uniqueName",
    });

    // Version 3 — Ascension Registry
    // progression: auto-increment PK; itemId, category, status, lastUpdated indexed
    // so the UI can filter by category and sort by lastUpdated without a full scan.
    // No upgrade() callback needed — existing tables are carried forward as-is by
    // Dexie when their store definitions are repeated unchanged.
    this.version(3).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
      assetMeta: "uniqueName, cacheKey, status, priority, lastAccessedAt",
      syncErrors: "++id, occurredAt, uniqueName",
      progression: "++id, itemId, category, status, lastUpdated",
    });

    // Version 4 — Items Integration Plan (Phase 1)
    //
    // itemStates:
    //   Primary key = uniqueName (string; matches itemsAdapter).
    //   Only touched items have rows (sparse table — saves space on older PCs).
    //   `owned` is deliberately NOT indexed: IndexedDB's support for boolean
    //   indexes is inconsistent across browsers; we filter in-memory instead.
    //   `markedAt` is indexed so the UI can sort by most-recently-touched.
    //
    // dropLocations:
    //   Primary key = locationKey (deterministic string, built by dropsService).
    //   Using a string PK (not ++id) means re-syncs upsert cleanly — same input
    //   → same row, no duplicates.
    //   Compound indexes [type+bountyLocation] and [bountyLocation+bountyLevel]
    //   cover Celestial Pendulum's most common faceted queries without scans.
    this.version(4).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
      assetMeta: "uniqueName, cacheKey, status, priority, lastAccessedAt",
      syncErrors: "++id, occurredAt, uniqueName",
      progression: "++id, itemId, category, status, lastUpdated",
      itemStates: "uniqueName, markedAt",
      dropLocations:
        "locationKey, type, bountyLocation, relicTier, fetchedAt, [type+bountyLocation], [bountyLocation+bountyLevel]",
    });
  }
}

export const db = new TennoplanDB();
