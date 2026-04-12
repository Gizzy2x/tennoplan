/**
 * Asset Downloader — concurrent fetch queue with retry and rate-limiting.
 *
 * Design:
 *   - Max 5 simultaneous requests (CDN-friendly, avoids socket exhaustion)
 *   - 3 retry attempts with exponential back-off (500ms → 1s → 2s)
 *   - HTTP 404s are NOT retried — logged to Dexie and treated as permanent
 *   - Results are written via assetStorage so the Cache API and Dexie stay in sync
 *   - Queue is a module-level singleton — survives React re-renders
 */

import { db } from '@/adapters/storage/db';
import type { AssetRecord, SyncError } from '@/core/domain/assets';
import { markAssetStatus, writeToCache } from './assetStorage';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_CONCURRENT = 5;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

// ─── Internal queue state (module-level singleton) ────────────────────────────

let _active = 0;
const _queue: Array<() => Promise<void>> = [];

function drainQueue(): void {
  while (_active < MAX_CONCURRENT && _queue.length > 0) {
    const task = _queue.shift()!;
    _active++;
    void task().finally(() => {
      _active--;
      drainQueue();
    });
  }
}

function enqueue(task: () => Promise<void>, front = false): void {
  if (front) {
    _queue.unshift(task);
  } else {
    _queue.push(task);
  }
  drainQueue();
}

// ─── Fetch with retry ─────────────────────────────────────────────────────────

async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    // Network-level error (offline, DNS failure, etc.)
    if (attempt >= MAX_RETRIES) throw err;
    await backoff(attempt);
    return fetchWithRetry(url, attempt + 1);
  }

  // 404 — game updated, filename changed; propagate without retry
  if (res.status === 404) return res;

  // Server error — retry with back-off
  if (!res.ok) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`HTTP ${res.status} after ${MAX_RETRIES} attempts`);
    }
    await backoff(attempt);
    return fetchWithRetry(url, attempt + 1);
  }

  return res;
}

function backoff(attempt: number): Promise<void> {
  return new Promise((r) => setTimeout(r, BASE_BACKOFF_MS * 2 ** (attempt - 1)));
}

// ─── Single-asset download ────────────────────────────────────────────────────

async function downloadAsset(record: AssetRecord): Promise<void> {
  await markAssetStatus(record.cacheKey, 'downloading');

  try {
    const res = await fetchWithRetry(record.cacheKey);

    if (res.status === 404) {
      await markAssetStatus(record.cacheKey, 'not-found');
      const err: SyncError = {
        uniqueName: record.uniqueName,
        imageName: record.imageName,
        url: record.cacheKey,
        statusCode: 404,
        message: 'Asset not found on CDN — likely renamed after a game update',
        occurredAt: Date.now(),
      };
      await db.syncErrors.add(err);
      return;
    }

    const blob = await res.blob();
    // Pass a fresh Response so writeToCache can clone it safely
    await writeToCache(
      record.cacheKey,
      new Response(blob, { status: 200, headers: res.headers }),
      blob.size,
    );
  } catch (err) {
    await markAssetStatus(record.cacheKey, 'error');
    const syncErr: SyncError = {
      uniqueName: record.uniqueName,
      imageName: record.imageName,
      url: record.cacheKey,
      message: err instanceof Error ? err.message : String(err),
      occurredAt: Date.now(),
    };
    await db.syncErrors.add(syncErr);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type DownloadProgressCallback = (
  completed: number,
  failed: number,
  currentItem: string,
) => void;

/**
 * Enqueue a batch of asset records for download.
 * Reports granular progress through the callback.
 * The returned Promise resolves when every record in this batch has settled.
 */
export function downloadBatch(
  records: AssetRecord[],
  onProgress: DownloadProgressCallback,
): Promise<void> {
  if (records.length === 0) return Promise.resolve();

  let completed = 0;
  let failed = 0;
  let settled = 0;
  const total = records.length;

  return new Promise((resolve) => {
    for (const record of records) {
      // Mark queued synchronously so UI can show queue depth
      void db.assetMeta.update(record.uniqueName, { status: 'queued' });

      enqueue(async () => {
        await downloadAsset(record);

        const fresh = await db.assetMeta.get(record.uniqueName);
        if (fresh?.status === 'cached') completed++;
        else failed++;

        settled++;
        onProgress(completed, failed, record.displayName);
        if (settled === total) resolve();
      });
    }
  });
}

/**
 * Immediately move a single asset to the front of the download queue.
 * Called by `getAsset()` when a UI component urgently needs an icon.
 */
export function prioritizeAsset(record: AssetRecord, onDone?: () => void): void {
  enqueue(async () => {
    await downloadAsset(record);
    onDone?.();
  }, /* front = */ true);
}

/** Diagnostic snapshot of current queue state. */
export function getQueueStats(): { active: number; queued: number } {
  return { active: _active, queued: _queue.length };
}
