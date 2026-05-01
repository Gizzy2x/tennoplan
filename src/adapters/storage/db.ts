import Dexie, { type Table } from "dexie";
import type { AssetRecord, SyncError } from "@/core/domain/assets";
import type { ProgressionRecord } from "@/core/domain/progression";
import type { ItemState } from "@/core/domain/itemState";
import type { DropLocation } from "@/core/domain/drops";
import type { StoredItem } from "@/core/domain/items";
import type { DataSyncState } from "@/core/domain/sync";
import type {
  ParsedWorldstate,
  SyncMetadata,
  TennoplanItem,
} from "@/core/domain/tennoplanApi";

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

// ── Phase D.1 — new typed table rows ─────────────────────────────────────────

/**
 * Worldstate table row — one entry per snapshot key. Replaces the
 * `db.cache.get('worldstate_master')` pattern (which mixed typed and
 * untyped data in the generic `cache` table).
 *
 * Keys:
 *   'current'  — latest ParsedWorldstate from /v1/worldstate
 *   'previous' — rollback snapshot, written when a new sync replaces 'current'
 *
 * timestamp is the Unix ms at which we received the response from the
 * Worker. SyncMetadata.lastSync (in the syncMetadata table) is the
 * authoritative age signal; this field is a convenience for `useLiveQuery`
 * subscribers that don't want to read from two tables.
 */
export interface WorldstateRow {
  key:       'current' | 'previous';
  data:      ParsedWorldstate;
  timestamp: number;
}

/**
 * SyncMetadata table row — one entry per dataset.
 *
 * Carries the Worker's SyncMetadata shape verbatim (lastSync, etag,
 * version, source, quality, errorCount, lastError, itemCount) plus an
 * `id` discriminator used as the primary key.
 *
 * Replaces the scattered `worldstate:etag` / `worldstate:source` keys in
 * the `cache` table — sync state is now discoverable via a typed table
 * with strict shape rather than untyped string lookups.
 */
export interface StoredSyncMetadata extends SyncMetadata {
  id: 'worldstate' | 'codex';
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
  /**
   * Full item catalogue with pre-resolved icon URLs. Written by DropDataService
   * from the build-time items-map.json. Survives cache clears — only wiped
   * when the user hits "Clear Data" in Settings.
   */
  items!: Table<StoredItem, string>;
  /** One row per synced dataset. Replaces the old drops:etag / drops:lastSynced settings keys. */
  dataSyncState!: Table<DataSyncState, string>;
  /**
   * ParsedWorldstate snapshots (Phase D.1).
   * Key = 'current' | 'previous'. Replaces `db.cache.get('worldstate_master')`
   * with a typed table whose subscribers see strict ParsedWorldstate data.
   */
  worldstate!: Table<WorldstateRow, string>;
  /**
   * Sync state for both worldstate and codex datasets (Phase D.1).
   * Carries lastSync, etag, version, source, quality, errorCount per dataset
   * so the UI can show staleness banners and the heartbeat indicator can
   * read accurate age information without inventing string-key conventions.
   */
  syncMetadata!: Table<StoredSyncMetadata, string>;
  /**
   * TennoplanItem catalogue from /v1/codex (Phase D.3).
   * One row per item, keyed by uniqueName. Indexed on `category`,
   * `masteryRank`, and `vaulted` so StaticDataService.findItems() can
   * filter without scanning ~8k rows.
   *
   * Sits alongside the legacy `items` (StoredItem) table during the D
   * transition. D.4 swaps UI consumers off the legacy table; a Phase E
   * cleanup will retire it.
   */
  tennoplanItems!: Table<TennoplanItem, string>;

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

    // Version 5 — Reliable Static Data Foundation (2026-04-18)
    //
    // items:
    //   Primary key = uniqueName. One row per Warframe item.
    //   `iconUrl` is pre-resolved at sync time so the UI never computes it per-render.
    //   `category` indexed for fast filtering in Ascension Registry and search UIs.
    //   `lastUpdated` indexed so the UI can surface the newest entries.
    //
    // dataSyncState:
    //   Primary key = id ('items' | 'dropLocations'). One row per dataset.
    //   Replaces the scattered drops:etag / drops:lastSynced settings keys.
    //   `lastUpdated` indexed so "days old" banners can be queried cheaply.
    //
    // Additive migration — existing tables carry forward unchanged. No data loss.
    this.version(5).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
      assetMeta: "uniqueName, cacheKey, status, priority, lastAccessedAt",
      syncErrors: "++id, occurredAt, uniqueName",
      progression: "++id, itemId, category, status, lastUpdated",
      itemStates: "uniqueName, markedAt",
      dropLocations:
        "locationKey, type, bountyLocation, relicTier, fetchedAt, [type+bountyLocation], [bountyLocation+bountyLevel]",
      items: "uniqueName, category, lastUpdated",
      dataSyncState: "id, lastUpdated",
    });

    // Version 6 — Phase D.1: Worker-backed worldstate + sync metadata
    //
    // worldstate:
    //   Primary key = 'current' | 'previous' (string).
    //   Stores the full ParsedWorldstate snapshot served by /v1/worldstate.
    //   Replaces the old `db.cache.get('worldstate_master')` pattern with a
    //   typed table — useLiveQuery subscribers receive ParsedWorldstate
    //   directly instead of casting from `unknown`.
    //
    // syncMetadata:
    //   Primary key = id ('worldstate' | 'codex').
    //   Carries the Worker's SyncMetadata shape (lastSync, etag, version,
    //   source, quality, errorCount, ...). HeartbeatStore reads this for
    //   accurate age signalling; SyncService reads it for ETag (304) state.
    //
    // Additive migration — no data loss. Existing `items` / `cache` /
    // `dropLocations` tables carry forward unchanged. The codex `items`
    // table will be repurposed in Phase D.3 (currently still holds
    // StoredItem rows from items-map.json; DropDataService keeps writing
    // to it until D.3 retires that path).
    this.version(6).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
      assetMeta: "uniqueName, cacheKey, status, priority, lastAccessedAt",
      syncErrors: "++id, occurredAt, uniqueName",
      progression: "++id, itemId, category, status, lastUpdated",
      itemStates: "uniqueName, markedAt",
      dropLocations:
        "locationKey, type, bountyLocation, relicTier, fetchedAt, [type+bountyLocation], [bountyLocation+bountyLevel]",
      items: "uniqueName, category, lastUpdated",
      dataSyncState: "id, lastUpdated",
      worldstate: "key",
      syncMetadata: "id",
    });

    // Version 7 — Phase D.3: Worker-backed codex (TennoplanItem catalogue)
    //
    // tennoplanItems:
    //   Primary key = uniqueName.
    //   One row per item, sourced from the Cloudflare Worker's /v1/codex
    //   endpoint (~8k items). Indexed on category / masteryRank / vaulted
    //   so StaticDataService.findItems() can filter without scanning.
    //
    //   Sits alongside the legacy `items` (StoredItem from items-map.json)
    //   table during the D transition — DropDataService keeps writing to
    //   the old one. D.4 will migrate UI consumers, after which a Phase E
    //   cleanup retires the legacy table.
    //
    // Additive migration — existing tables carry forward unchanged.
    this.version(7).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
      assetMeta: "uniqueName, cacheKey, status, priority, lastAccessedAt",
      syncErrors: "++id, occurredAt, uniqueName",
      progression: "++id, itemId, category, status, lastUpdated",
      itemStates: "uniqueName, markedAt",
      dropLocations:
        "locationKey, type, bountyLocation, relicTier, fetchedAt, [type+bountyLocation], [bountyLocation+bountyLevel]",
      items: "uniqueName, category, lastUpdated",
      dataSyncState: "id, lastUpdated",
      worldstate: "key",
      syncMetadata: "id",
      tennoplanItems: "uniqueName, category, masteryRank, vaulted",
    });
  }
}

export const db = new TennoplanDB();
