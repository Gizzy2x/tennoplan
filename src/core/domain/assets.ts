/**
 * Core domain types for the Asset Intelligence & Sync Engine.
 * Zero dependencies on React, Dexie, or fetch.
 */

// ─── Priority Tiers ───────────────────────────────────────────────────────────

/**
 * Download priority tier.
 *   tier1 — Eager: currency/polarity/UI icons, downloaded on startup
 *   tier2 — Lazy:  Warframes, weapons, mods — background or on-demand
 *   tier3 — On-Demand: lore renders, glyphs, sigils — user-triggered only
 */
export type AssetPriority = 'tier1' | 'tier2' | 'tier3';

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/** Per-asset download lifecycle. */
export type AssetStatus =
  | 'pending'      // known from manifest, not yet queued
  | 'queued'       // waiting in download queue
  | 'downloading'  // in-flight
  | 'cached'       // stored in Cache API, ready to serve
  | 'not-found'    // HTTP 404 — logged, permanent placeholder served
  | 'error';       // transient error — will be retried next sync

/** Sync orchestration phases — drives the loading-screen progress bar. */
export type SyncPhase =
  | 'idle'
  | 'manifest'  // fetching / ETag-checking All.json
  | 'tier1'     // eager core-asset downloads (blocks "ready" state)
  | 'tier2'     // background lazy sync (non-blocking)
  | 'complete'
  | 'error';

// ─── Records ──────────────────────────────────────────────────────────────────

/** Manifest metadata persisted to Dexie settings for differential updates. */
export interface ManifestMeta {
  etag?: string;
  lastModified?: string;
  lastChecked: number;
  itemCount: number;
}

/**
 * Per-asset record stored in the Dexie `assetMeta` table.
 * Primary key: `uniqueName`.
 */
export interface AssetRecord {
  /** Canonical item ID — e.g. "/Lotus/Powersuits/Ash/Ash". Primary key. */
  uniqueName: string;
  /** CDN filename — e.g. "ash-f2c6f3ab3f.png". Used as Cache API key suffix. */
  imageName: string;
  category: string;
  /** Rarity string from WFCD — "Common" | "Uncommon" | "Rare" | "Legendary" etc. */
  rarity?: string;
  displayName: string;
  status: AssetStatus;
  /** Full CDN URL — also serves as the Cache API cache key. */
  cacheKey: string;
  priority: AssetPriority;
  downloadedAt?: number;
  lastAccessedAt?: number;
  byteSize?: number;
}

/** Error record written to Dexie `syncErrors` — replaces a crash log file. */
export interface SyncError {
  id?: number;
  uniqueName: string;
  imageName: string;
  url: string;
  statusCode?: number;
  message: string;
  occurredAt: number;
}

/** Progress snapshot emitted to the Zustand store during sync. */
export interface SyncProgress {
  phase: SyncPhase;
  total: number;
  completed: number;
  failed: number;
  currentItem?: string;
  message: string;
  percentComplete: number;
}

// ─── Core Assets (Tier 1) ─────────────────────────────────────────────────────

/**
 * Image filenames that MUST be cached before the app is considered "ready".
 * These are currency, resource, and UI-critical icons.
 *
 * Filenames match the WFCD CDN convention (lowercase, no path prefix).
 * To add an icon: run `npm run generate-items` and find the imageName in items-map.json.
 */
export const CORE_IMAGE_NAMES: ReadonlySet<string> = new Set([
  // Currency
  'platinum.png',
  'credits.png',
  'ducat.png',
  'endo.png',
  // Resources
  'kuva.png',
  'forma.png',
  'neuroptics.png',
  'chassis.png',
  'systems.png',
  // Catalysts / Reactors
  'orokincatalyst.png',
  'orokinreactor.png',
]);

// ─── Category Priority Map ────────────────────────────────────────────────────

/**
 * Default tier assignment by item category.
 * Categories not listed here fall back to tier3.
 */
export const CATEGORY_PRIORITY: Readonly<Record<string, AssetPriority>> = {
  // tier2 — shown in primary UI surfaces
  Warframes: 'tier2',
  Primary: 'tier2',
  Secondary: 'tier2',
  Melee: 'tier2',
  Mods: 'tier2',
  Resources: 'tier2',
  Relics: 'tier2',
  Sentinels: 'tier2',
  Pets: 'tier2',
  Archwing: 'tier2',
  'Arch-Gun': 'tier2',
  'Arch-Melee': 'tier2',
  // tier3 — detail views / niche surfaces
  Arcanes: 'tier3',
  Fish: 'tier3',
  Gear: 'tier3',
  Glyphs: 'tier3',
  Misc: 'tier3',
  Node: 'tier3',
  Quests: 'tier3',
  Railjack: 'tier3',
  Sigils: 'tier3',
  Skins: 'tier3',
  Enemy: 'tier3',
};
