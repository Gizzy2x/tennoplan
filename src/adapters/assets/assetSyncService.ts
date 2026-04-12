/**
 * Asset Sync Service — top-level orchestrator.
 *
 * Startup sequence:
 *   1. Hydrate in-memory lookup from Dexie (fast, no network)
 *   2. ETag-check the WFCD manifest (may skip re-parse if unchanged)
 *   3. Upsert new items from manifest into Dexie (preserves existing status)
 *   4. Download Tier 1 (eager) — BLOCKS "ready" state
 *   5. Download Tier 2 (lazy) — background, non-blocking
 *   6. Run LRU eviction after bulk sync
 *
 * Public API:
 *   initializeSync()          — call once on app start
 *   getAsset(uniqueName)      — async, returns best available URL
 *   getAssetSync(uniqueName)  — sync, returns CDN URL or placeholder immediately
 *   onProgress(listener)      — subscribe to SyncProgress events
 */

import { fetchManifest } from './manifestAdapter';
import { downloadBatch, prioritizeAsset } from './assetDownloader';
import {
  upsertAssetRecord,
  resolveAssetUrl,
  evictLRU,
  PLACEHOLDER_URL,
} from './assetStorage';
import { processManifest, filterByPriority } from '@/core/services/manifestService';
import { db } from '@/adapters/storage/db';
import type { AssetPriority, AssetRecord, SyncProgress } from '@/core/domain/assets';

// ─── Event bus ────────────────────────────────────────────────────────────────

export type ProgressListener = (progress: SyncProgress) => void;

const _listeners = new Set<ProgressListener>();

function emit(progress: SyncProgress): void {
  for (const fn of _listeners) fn(progress);
}

/** Subscribe to sync progress events. Returns an unsubscribe function. */
export function onProgress(listener: ProgressListener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

// ─── In-memory lookup (uniqueName → AssetRecord) ─────────────────────────────

const _lookup = new Map<string, AssetRecord>();

async function hydrateFromDexie(): Promise<void> {
  const all = await db.assetMeta.toArray();
  for (const record of all) {
    _lookup.set(record.uniqueName, record);
  }
}

// ─── Initialization guard ─────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

// ─── initializeSync ───────────────────────────────────────────────────────────

/**
 * Entry point for the "Downloading Content" startup phase.
 *
 * Safe to call multiple times — subsequent calls return the same promise.
 * Integrate with your splash/loading screen by subscribing via onProgress().
 */
export function initializeSync(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _run();
  return _initPromise;
}

async function _run(): Promise<void> {
  // ── Step 1: Hydrate from Dexie (no network, instant) ──
  await hydrateFromDexie();

  // ── Step 2: Manifest check ──
  emit({
    phase: 'manifest',
    total: 0,
    completed: 0,
    failed: 0,
    message: 'Checking item manifest…',
    percentComplete: 0,
  });

  try {
    const result = await fetchManifest();

    if (!result.unchanged && result.items) {
      // Fresh manifest — process and upsert new items
      const { lookup, tier1Count, tier2Count, tier3Count } = processManifest(result.items);

      emit({
        phase: 'manifest',
        total: lookup.size,
        completed: 0,
        failed: 0,
        message: `Processing ${lookup.size.toLocaleString()} items (${tier1Count} eager, ${tier2Count} lazy, ${tier3Count} on-demand)…`,
        percentComplete: 0,
      });

      // Only upsert records not already in memory — preserves cached/not-found status
      const toUpsert: AssetRecord[] = [];
      for (const [uniqueName, record] of lookup) {
        if (!_lookup.has(uniqueName)) {
          toUpsert.push(record);
          _lookup.set(uniqueName, record);
        }
      }

      if (toUpsert.length > 0) {
        // bulkPut in chunks to avoid locking IndexedDB for too long
        const CHUNK = 500;
        for (let i = 0; i < toUpsert.length; i += CHUNK) {
          await db.assetMeta.bulkPut(toUpsert.slice(i, i + CHUNK));
        }
      }
    }
  } catch (err) {
    // Non-fatal — fall back to whatever is already in Dexie
    emit({
      phase: 'manifest',
      total: 0,
      completed: 0,
      failed: 1,
      message: `Manifest unavailable: ${err instanceof Error ? err.message : String(err)}. Using cached data.`,
      percentComplete: 0,
    });
  }

  // ── Step 3: Tier 1 eager downloads (BLOCKS ready state) ──
  const allRecords = Array.from(_lookup.values());
  const lookupForFilter = new Map(allRecords.map((r) => [r.uniqueName, r]));
  const tier1 = filterByPriority(lookupForFilter, 'tier1');

  if (tier1.length > 0) {
    emit({
      phase: 'tier1',
      total: tier1.length,
      completed: 0,
      failed: 0,
      message: 'Downloading core assets…',
      percentComplete: 0,
    });

    await downloadBatch(tier1, (completed, failed, currentItem) => {
      const settled = completed + failed;
      emit({
        phase: 'tier1',
        total: tier1.length,
        completed,
        failed,
        currentItem,
        message: `Core assets (${settled}/${tier1.length}): ${currentItem}`,
        percentComplete: Math.round((settled / tier1.length) * 100),
      });
    });
  }

  // ── Step 4: Signal "ready" — app can render ──
  emit({
    phase: 'complete',
    total: tier1.length,
    completed: tier1.length,
    failed: 0,
    message: 'Ready',
    percentComplete: 100,
  });

  // ── Step 5: Tier 2 background sync (non-blocking) ──
  void _syncBackground(lookupForFilter);
}

async function _syncBackground(lookup: Map<string, AssetRecord>): Promise<void> {
  const tier2 = filterByPriority(lookup, 'tier2');

  if (tier2.length === 0) return;

  emit({
    phase: 'tier2',
    total: tier2.length,
    completed: 0,
    failed: 0,
    message: `Background sync: 0/${tier2.length} icons…`,
    percentComplete: 0,
  });

  await downloadBatch(tier2, (completed, failed) => {
    const settled = completed + failed;
    emit({
      phase: 'tier2',
      total: tier2.length,
      completed,
      failed,
      message: `Background sync: ${settled}/${tier2.length}`,
      percentComplete: Math.round((settled / tier2.length) * 100),
    });
  });

  // Clean up after bulk sync
  const { evicted, freedBytes } = await evictLRU();
  if (evicted > 0) {
    console.info(
      `[AssetSync] LRU evicted ${evicted} assets, freed ${(freedBytes / 1024 / 1024).toFixed(1)} MB`,
    );
  }
}

// ─── getAsset ─────────────────────────────────────────────────────────────────

/**
 * Returns the best available URL for an asset, async.
 *
 * Resolution order:
 *   1. Cached blob URL (offline-capable, instant after first download)
 *   2. CDN URL (live network, browser handles the actual fetch)
 *   3. Generic SVG placeholder
 *
 * If the asset is not cached and `priority === 'tier1'`, it is moved to the
 * front of the download queue and this Promise waits for it.
 *
 * For all other priorities, the CDN URL is returned immediately and the
 * background queue will cache it on the next sync.
 *
 * @param uniqueName — canonical item ID (e.g. "/Lotus/Powersuits/Ash/Ash")
 * @param priority   — urgency hint; 'tier1' = wait for download
 */
export async function getAsset(
  uniqueName: string,
  priority: AssetPriority = 'tier2',
): Promise<string> {
  // Ensure we've at least hydrated from Dexie
  if (!_initPromise) void initializeSync();

  const record = _lookup.get(uniqueName) ?? (await db.assetMeta.get(uniqueName));
  if (!record) return PLACEHOLDER_URL;

  // Permanent 404 — serve placeholder, don't queue again
  if (record.status === 'not-found') return PLACEHOLDER_URL;

  // Already cached — resolve from Cache API
  if (record.status === 'cached') {
    return resolveAssetUrl(record.uniqueName, record.cacheKey);
  }

  // Urgent request — bump to front, await completion
  if (priority === 'tier1') {
    return new Promise((resolve) => {
      prioritizeAsset({ ...record, priority }, async () => {
        const url = await resolveAssetUrl(record.uniqueName, record.cacheKey);
        resolve(url);
      });
    });
  }

  // Lazy — return CDN URL now, cache in background
  return record.cacheKey;
}

/**
 * Synchronous URL resolver for render functions.
 *
 * Never blocks — returns CDN URL or placeholder immediately.
 * The Cache API is NOT checked (use getAsset() for that).
 * Suitable for <img src> where the browser handles network fetching.
 */
export function getAssetSync(uniqueName: string): string {
  const record = _lookup.get(uniqueName);
  if (!record || record.status === 'not-found') return PLACEHOLDER_URL;
  return record.cacheKey; // CDN URL — browser fetches directly
}
