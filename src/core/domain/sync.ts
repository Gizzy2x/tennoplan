/**
 * Static-data sync state — one row per dataset.
 *
 * Replaces the scattered `drops:etag` / `drops:lastSynced` keys the old
 * ItemsService wrote into the `settings` table. Having a dedicated table
 * keeps sync metadata discoverable and lets the UI show stale/fresh status
 * per dataset without inventing string key conventions.
 *
 * Pure domain file — no runtime dependencies.
 */

/** Identifies which dataset a sync-state row describes. */
export type DataSyncId = 'items' | 'dropLocations';

export interface DataSyncState {
  /** Primary key — stable string identifier. */
  id: DataSyncId;
  /** Unix ms of the last successful write. Null means never synced. */
  lastUpdated: number;
  /** Source version string (e.g. "1.1273.21") — useful for upgrade banners. */
  dataVersion?: string;
  /** Number of rows written on the last sync. */
  rowCount?: number;
  /** ETag returned by the source on the last 200/304 response. */
  etag?: string;
  /** Last error message, if the previous sync failed. Cleared on success. */
  lastErrorMessage?: string;
}
