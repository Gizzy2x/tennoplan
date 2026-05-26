/**
 * Typed accessors for the v7 `tennoplanItems` table and the codex slot
 * of the `syncMetadata` table.
 *
 * Centralises the atomic write protocol for codex syncs:
 *   1. Open a single transaction across tennoplanItems + syncMetadata.
 *   2. Clear the items table.
 *   3. bulkAdd the new TennoplanItem rows.
 *   4. Upsert metadata.
 *
 * If any step throws, Dexie rolls the entire transaction back — the
 * previous codex stays intact. "Never overwrite good data with bad" is
 * the same rule the Worker follows server-side, just enforced one layer
 * up.
 *
 * Used by:
 *   • StaticDataService (D.3) — refreshCodex, getCodexStatus, findItems
 *   • Feature hooks (D.4)     — useLiveQuery subscribers + getItem lookups
 */

import { db, type StoredSyncMetadata } from './db';
import type {
  TennoplanItem,
  ItemCategory,
  SyncMetadata,
} from '@/core/domain/tennoplanApi';

// ─── Query helpers ────────────────────────────────────────────────────────────

export interface ItemQuery {
  /** Filter by category (uses the indexed `category` field). */
  category?: ItemCategory;
  /** Lowercase substring match against item.name (case-insensitive). */
  search?:   string;
  /** Filter by exact mastery rank requirement (uses the indexed field). */
  masteryRank?: number;
  /** Filter by vaulted state (uses the indexed field). undefined = any. */
  vaulted?:  boolean;
  /** Pagination — clamp to a sensible default to avoid a 8k-row dump. */
  limit?:    number;
  offset?:   number;
}

const DEFAULT_LIMIT = 200;
const MAX_LIMIT     = 5_000;

// ─── Reads ────────────────────────────────────────────────────────────────────

/** Returns one TennoplanItem by its uniqueName, or null if not present. */
export async function getCodexItem(uniqueName: string): Promise<TennoplanItem | null> {
  const row = await db.tennoplanItems.get(uniqueName);
  return row ?? null;
}

/**
 * Filtered query against the codex.
 *
 * Strategy — pick the cheapest indexed path first, narrow in memory:
 *   • category   → primary index when set (~hundreds of rows max)
 *   • masteryRank → secondary index, filters category result
 *   • vaulted    → secondary index, filters category result
 *   • search     → in-memory substring match (no IndexedDB index for this)
 *
 * Pagination via .offset() + .limit() runs against the filtered result.
 */
export async function findCodexItems(query: ItemQuery = {}): Promise<TennoplanItem[]> {
  const limit  = clamp(query.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = Math.max(0, query.offset ?? 0);

  let collection = query.category != null
    ? db.tennoplanItems.where('category').equals(query.category)
    : db.tennoplanItems.toCollection();

  if (query.masteryRank != null) {
    const mr = query.masteryRank;
    collection = collection.filter(item => item.masteryRank === mr);
  }
  if (query.vaulted != null) {
    const v = query.vaulted;
    collection = collection.filter(item => item.vaulted === v);
  }
  if (query.search) {
    const needle = query.search.toLowerCase();
    collection = collection.filter(item => item.name.toLowerCase().includes(needle));
  }

  return collection.offset(offset).limit(limit).toArray();
}

/** Total row count — useful for empty-state detection and progress bars. */
export async function getCodexItemCount(): Promise<number> {
  return db.tennoplanItems.count();
}

/** Returns sync metadata for the codex dataset, or null when never synced. */
export async function getCodexMetadata(): Promise<StoredSyncMetadata | null> {
  const row = await db.syncMetadata.get('codex');
  return row ?? null;
}

export interface CodexStatus {
  /** Number of rows currently stored locally. */
  itemCount:  number;
  /** Unix ms of the last successful sync, or 0 when never synced. */
  lastSync:   number;
  /** Whole minutes since lastSync (Infinity when never synced). */
  ageMinutes: number;
  /** True when ageMinutes exceeds the staleness threshold (default 12h). */
  isStale:    boolean;
  /** Source attribution from the most recent successful sync. */
  source?:    string;
  /** Quality grade from the most recent successful sync. */
  quality?:   string;
  /** Consecutive failures since the last success (0 when healthy). */
  errorCount: number;
}

/** Stale threshold in minutes — tuneable per environment if needed. */
export const CODEX_STALE_AFTER_MINUTES = 12 * 60;

/**
 * One-stop status read for staleness banners and the manual refresh
 * button. Reads both itemCount and metadata in a single transaction so
 * the snapshot is consistent.
 */
export async function getCodexStatus(): Promise<CodexStatus> {
  const [count, meta] = await Promise.all([
    db.tennoplanItems.count(),
    getCodexMetadata(),
  ]);

  const lastSync   = meta?.lastSync ?? 0;
  const ageMinutes = lastSync ? Math.floor((Date.now() - lastSync) / 60_000) : Number.POSITIVE_INFINITY;

  const status: CodexStatus = {
    itemCount:  count,
    lastSync,
    ageMinutes,
    isStale:    ageMinutes >= CODEX_STALE_AFTER_MINUTES,
    errorCount: meta?.errorCount ?? 0,
  };
  if (meta?.source)  status.source  = meta.source;
  if (meta?.quality) status.quality = meta.quality;
  return status;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Atomic full-replace of the codex.
 *
 * Single transaction — if the bulkAdd fails partway (e.g. quota), Dexie
 * rolls back and the previous codex stays intact. Same rule as the
 * Worker: never overwrite good data with bad.
 */
export async function writeCodex(items: readonly TennoplanItem[], meta: SyncMetadata): Promise<void> {
  await db.transaction('rw', [db.tennoplanItems, db.syncMetadata], async () => {
    await db.tennoplanItems.clear();
    if (items.length > 0) {
      // bulkAdd is faster than bulkPut when we know the table is empty.
      await db.tennoplanItems.bulkAdd(items as TennoplanItem[]);
    }
    await db.syncMetadata.put({ id: 'codex', ...meta });
  });
}

/**
 * Touch the codex metadata's lastSync without changing the item rows.
 * Used after a 304 Not Modified response — the cached blob is still
 * authoritative, we just confirmed it's current.
 */
export async function touchCodexMetadata(): Promise<void> {
  const existing = await db.syncMetadata.get('codex');
  if (!existing) return;
  await db.syncMetadata.put({
    ...existing,
    lastSync:   Date.now(),
    errorCount: 0,
  });
}

/**
 * Increment errorCount and record the last error message. Never touches
 * tennoplanItems — the previous codex is still authoritative.
 *
 * If no metadata exists yet (cold client, no successful sync), synthesizes
 * a minimal record so /v1/health-style badges and refresh-button tooltips
 * can show a useful errorCount > 0.
 */
export async function bumpCodexError(message: string): Promise<void> {
  const existing = await db.syncMetadata.get('codex');
  const truncated = message.slice(0, 200);

  const updated: StoredSyncMetadata = existing
    ? {
        ...existing,
        errorCount: existing.errorCount + 1,
        lastError:  truncated,
      }
    : {
        id:         'codex',
        lastSync:   0,
        etag:       '',
        version:    'never-synced',
        source:     'fallback',
        quality:    'low',
        errorCount: 1,
        lastError:  truncated,
        itemCount:  0,
      };

  await db.syncMetadata.put(updated);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
