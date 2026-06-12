/**
 * Typed accessors for the v6 `worldstate` and `syncMetadata` tables.
 *
 * Replaces the untyped `db.cache.get('worldstate_master')` pattern with
 * strict ParsedWorldstate reads. Centralises the atomic write protocol —
 * every commit moves current → previous and bumps syncMetadata in a
 * single Dexie transaction so subscribers never see inconsistent state.
 *
 * Used by:
 *   • WorldstateSync (D.2) — fetch + write on poll
 *   • Feature hooks (D.4)  — useLiveQuery subscribers
 */

import { db, type WorldstateRow, type StoredSyncMetadata } from './db';
import type {
  ParsedWorldstate,
  SyncMetadata,
} from '@/core/domain/tennoplanApi';

export type WorldstateKey = WorldstateRow['key'];

// ─── Reads ────────────────────────────────────────────────────────────────────

/** Returns the ParsedWorldstate for the given key, or null if not synced yet. */
export async function getWorldstate(key: WorldstateKey = 'current'): Promise<ParsedWorldstate | null> {
  const row = await db.worldstate.get(key);
  return row?.data ?? null;
}

/** Returns the full row including the per-write timestamp. */
export async function getWorldstateRow(key: WorldstateKey = 'current'): Promise<WorldstateRow | undefined> {
  return db.worldstate.get(key);
}

/** Returns sync metadata for the worldstate dataset, or null when never synced. */
export async function getWorldstateMetadata(): Promise<StoredSyncMetadata | null> {
  const row = await db.syncMetadata.get('worldstate');
  return row ?? null;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Atomic commit: rotate current → previous, write the new snapshot,
 * upsert sync metadata. All three operations land in one transaction so
 * useLiveQuery subscribers never observe a half-written state.
 */
export async function writeWorldstate(data: ParsedWorldstate, meta: SyncMetadata): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.worldstate, db.syncMetadata], async () => {
    const previous = await db.worldstate.get('current');
    if (previous) {
      await db.worldstate.put({
        key:       'previous',
        data:      previous.data,
        timestamp: previous.timestamp,
      });
    }
    await db.worldstate.put({
      key:       'current',
      data,
      timestamp: now,
    });
    await db.syncMetadata.put({ id: 'worldstate', ...meta });
  });
}

/**
 * Touch the worldstate metadata's lastSync without changing the snapshot.
 * Used after a 304 Not Modified response or a pulse-head match — the data
 * is still authoritative, we just confirmed it's current. `patch` lets the
 * pulse path record the worker's upstream sync time alongside the touch.
 */
export async function touchWorldstateMetadata(patch?: Partial<SyncMetadata>): Promise<void> {
  const existing = await db.syncMetadata.get('worldstate');
  if (!existing) return;
  await db.syncMetadata.put({
    ...existing,
    ...patch,
    id:         'worldstate',
    lastSync:   Date.now(),
    errorCount: 0,
  });
}

/**
 * Increment errorCount and record the last error. Never touches the snapshot —
 * "never overwrite good data with bad" is the same rule the Worker follows
 * server-side.
 *
 * If no metadata exists yet (cold client, no successful sync), synthesizes a
 * minimal record so the heartbeat indicator can show a useful errorCount > 0.
 */
export async function bumpWorldstateError(message: string): Promise<void> {
  const existing = await db.syncMetadata.get('worldstate');
  const truncated = message.slice(0, 200);

  const updated: StoredSyncMetadata = existing
    ? {
        ...existing,
        errorCount: existing.errorCount + 1,
        lastError:  truncated,
      }
    : {
        id:         'worldstate',
        lastSync:   0,
        etag:       '',
        version:    'never-synced',
        source:     'fallback',
        quality:    'low',
        errorCount: 1,
        lastError:  truncated,
      };

  await db.syncMetadata.put(updated);
}
