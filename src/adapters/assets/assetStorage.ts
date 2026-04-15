/**
 * Asset Storage — two-layer persistence.
 *
 *   Layer 1 (binary)   — Browser Cache API
 *     Stores raw Response blobs, keyed by CDN URL.
 *     Survives page reloads, respects browser storage quotas.
 *
 *   Layer 2 (metadata) — Dexie `assetMeta` table
 *     Tracks status, LRU timestamps, byte sizes, priority.
 *     Enables LRU eviction without reading binary data.
 *
 * Placeholder fallback chain:
 *   blob URL (cached) → CDN URL (live, online) → generic SVG
 */

import { db } from '@/adapters/storage/db';
import type { AssetRecord, AssetStatus } from '@/core/domain/assets';

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_NAME = 'tennoplan-icons-v1';

/** 200 MB soft cap — LRU eviction triggers when exceeded. */
const MAX_CACHE_BYTES = 200 * 1024 * 1024;

export const PLACEHOLDER_URL = '/lotus-placeholder.svg';

// ─── Cache API helpers ────────────────────────────────────────────────────────

function openCache(): Promise<Cache> {
  return caches.open(CACHE_NAME);
}

/**
 * Check the Cache API for a stored asset.
 * Returns an object URL (blob:) on hit, null on miss.
 *
 * The returned URL must be revoked via URL.revokeObjectURL() when no longer
 * needed to prevent memory leaks. Components should do this in useEffect cleanup.
 */
export async function readFromCache(cacheKey: string): Promise<string | null> {
  try {
    const cache = await openCache();
    const res = await cache.match(cacheKey);
    if (!res) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    // Cache API unavailable (e.g., private browsing in some browsers)
    return null;
  }
}

/**
 * Write a downloaded Response into the Cache API and update Dexie metadata.
 * Should be called immediately after a successful fetch.
 */
export async function writeToCache(
  cacheKey: string,
  response: Response,
  byteSize: number,
): Promise<void> {
  const cache = await openCache();
  // Clone before consuming — the caller may need the body too
  await cache.put(cacheKey, response.clone());

  await db.assetMeta
    .where('cacheKey')
    .equals(cacheKey)
    .modify({
      status: 'cached' as AssetStatus,
      downloadedAt: Date.now(),
      lastAccessedAt: Date.now(),
      byteSize,
    });
}

/** Remove a single asset from both the Cache API and reset its Dexie status. */
async function evictFromCache(cacheKey: string): Promise<void> {
  const cache = await openCache();
  await cache.delete(cacheKey);
  await db.assetMeta
    .where('cacheKey')
    .equals(cacheKey)
    .modify({ status: 'pending' as AssetStatus, byteSize: undefined });
}

// ─── Dexie metadata helpers ───────────────────────────────────────────────────

/** Insert or replace an AssetRecord. Preserves status of already-cached items. */
export async function upsertAssetRecord(record: AssetRecord): Promise<void> {
  const existing = await db.assetMeta.get(record.uniqueName);
  if (existing && (existing.status === 'cached' || existing.status === 'not-found')) {
    // Don't overwrite terminal states — just update mutable metadata fields
    await db.assetMeta.update(record.uniqueName, {
      imageName: record.imageName,
      category: record.category,
      rarity: record.rarity,
      displayName: record.displayName,
      cacheKey: record.cacheKey,
      priority: record.priority,
    });
    return;
  }
  await db.assetMeta.put(record);
}

/** Update the status of an asset by its CDN cache key. */
export async function markAssetStatus(cacheKey: string, status: AssetStatus): Promise<void> {
  await db.assetMeta.where('cacheKey').equals(cacheKey).modify({ status });
}

/** Bump lastAccessedAt for LRU tracking. */
export async function touchAsset(uniqueName: string): Promise<void> {
  await db.assetMeta.update(uniqueName, { lastAccessedAt: Date.now() });
}

// ─── LRU Eviction ────────────────────────────────────────────────────────────

/**
 * Evict least-recently-used assets until total cached bytes ≤ MAX_CACHE_BYTES.
 *
 * Rules:
 *   - Only 'cached' records are eligible.
 *   - Tier 1 assets are NEVER evicted.
 *   - Eviction order: oldest lastAccessedAt first.
 */
export async function evictLRU(): Promise<{ evicted: number; freedBytes: number }> {
  const allCached = await db.assetMeta.where('status').equals('cached').toArray();

  const totalBytes = allCached.reduce((sum, r) => sum + (r.byteSize ?? 0), 0);
  if (totalBytes <= MAX_CACHE_BYTES) return { evicted: 0, freedBytes: 0 };

  const evictable = allCached
    .filter((r) => r.priority !== 'tier1')
    .sort((a, b) => (a.lastAccessedAt ?? 0) - (b.lastAccessedAt ?? 0));

  const target = totalBytes - MAX_CACHE_BYTES;
  let freed = 0;
  let evicted = 0;

  for (const record of evictable) {
    if (freed >= target) break;
    await evictFromCache(record.cacheKey);
    freed += record.byteSize ?? 0;
    evicted++;
  }

  return { evicted, freedBytes: freed };
}

// ─── URL resolution ───────────────────────────────────────────────────────────

/**
 * Resolve the best available URL for an asset.
 *
 * Priority:
 *   1. Cached blob URL  — instant, works offline
 *   2. CDN URL          — live network fetch by the browser (cacheKey IS the CDN URL)
 *   3. Generic SVG      — always works
 */
export async function resolveAssetUrl(
  uniqueName: string,
  cacheKey: string,
): Promise<string> {
  const blobUrl = await readFromCache(cacheKey);
  if (blobUrl) {
    await touchAsset(uniqueName);
    return blobUrl;
  }
  // cacheKey is the CDN URL — browser will fetch it live
  return cacheKey || PLACEHOLDER_URL;
}
