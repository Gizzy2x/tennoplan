import Dexie, { type Table } from "dexie";
import type { AssetRecord, SyncError } from "@/core/domain/assets";

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
  }
}

export const db = new TennoplanDB();
