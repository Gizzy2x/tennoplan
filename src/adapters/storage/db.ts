import Dexie, { type Table } from "dexie";
import type { AssetRecord, SyncError } from "@/core/domain/assets";
import type { ProgressionRecord } from "@/core/domain/progression";

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
  }
}

export const db = new TennoplanDB();
