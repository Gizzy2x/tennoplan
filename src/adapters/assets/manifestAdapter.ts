/**
 * Manifest Adapter — fetches the WFCD All.json manifest with differential updates.
 *
 * Differential logic:
 *   - On first run: full fetch (~30 MB), parse, store ETag + Last-Modified.
 *   - On subsequent runs: conditional GET with If-None-Match / If-Modified-Since.
 *     If the server returns 304, we skip re-parsing entirely.
 *
 * The ETag / Last-Modified is stored in the Dexie `settings` table
 * under the key `asset:manifest:meta` to survive page reloads.
 */

import { db } from '@/adapters/storage/db';
import type { ManifestMeta } from '@/core/domain/assets';
import type { RawManifestItem } from '@/core/services/manifestService';

// ─── Constants ────────────────────────────────────────────────────────────────

const MANIFEST_URL =
  'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/All.json';

const META_SETTINGS_KEY = 'asset:manifest:meta';

// ─── Metadata persistence ─────────────────────────────────────────────────────

async function loadMeta(): Promise<ManifestMeta | null> {
  const row = await db.settings.get(META_SETTINGS_KEY);
  return row ? (row.value as ManifestMeta) : null;
}

async function saveMeta(meta: ManifestMeta): Promise<void> {
  await db.settings.put({ key: META_SETTINGS_KEY, value: meta, updatedAt: Date.now() });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ManifestResult {
  /**
   * Parsed items array from All.json.
   * null when the server returned 304 (manifest unchanged) — reuse cached records.
   */
  items: RawManifestItem[] | null;
  /** true if server returned 304 Not Modified. */
  unchanged: boolean;
  meta: ManifestMeta;
}

/**
 * Fetch the WFCD manifest with conditional HTTP headers.
 *
 * Throws on network failure (non-404, non-304 errors).
 * Callers should catch and fall back to whatever is in Dexie.
 */
export async function fetchManifest(): Promise<ManifestResult> {
  const storedMeta = await loadMeta();

  const headers: HeadersInit = {};
  if (storedMeta?.etag) {
    headers['If-None-Match'] = storedMeta.etag;
  } else if (storedMeta?.lastModified) {
    headers['If-Modified-Since'] = storedMeta.lastModified;
  }

  let res: Response;
  try {
    res = await fetch(MANIFEST_URL, { headers, cache: 'no-store' });
  } catch (err) {
    throw new Error(
      `Manifest network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 304 Not Modified — nothing changed, bump lastChecked only
  if (res.status === 304 && storedMeta) {
    const updated: ManifestMeta = { ...storedMeta, lastChecked: Date.now() };
    await saveMeta(updated);
    return { items: null, unchanged: true, meta: updated };
  }

  if (!res.ok) {
    throw new Error(`Manifest fetch failed: HTTP ${res.status} ${res.statusText}`);
  }

  // 200 — parse and store new metadata
  const items = (await res.json()) as RawManifestItem[];

  const newMeta: ManifestMeta = {
    etag: res.headers.get('ETag') ?? undefined,
    lastModified: res.headers.get('Last-Modified') ?? undefined,
    lastChecked: Date.now(),
    itemCount: items.length,
  };

  await saveMeta(newMeta);

  return { items, unchanged: false, meta: newMeta };
}

/** Read the currently stored manifest metadata without hitting the network. */
export async function getManifestMeta(): Promise<ManifestMeta | null> {
  return loadMeta();
}
