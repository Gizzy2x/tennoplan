/**
 * useWorldstate — shared subscriber to the V2 worldstate store (Phase D.4).
 *
 * Returns the latest ParsedWorldstate from the `worldstate` Dexie table,
 * plus sync metadata (age, source, quality, error count). One subscription
 * per consumer; useLiveQuery handles re-renders when WorldstateSync writes.
 *
 * Replaces the legacy `db.cache.get('worldstate_master')` pattern that
 * each tab hook re-implemented separately. Feature hooks now use this as
 * their single read surface and only contribute the per-feature derivation
 * (cycles → CycleStatus, fissures → grouped + nextToExpire, etc.).
 *
 * Heartbeat integration:
 *   The first consumer that mounts registers `forceRefetch` on the
 *   HeartbeatStore so the System Pulse button in the header refetches
 *   the visible page's data. Subsequent consumers no-op (the store only
 *   holds one refetch handler at a time). On unmount the registration is
 *   cleared if it still matches our handler.
 *
 * Force refresh:
 *   `forceRefetch()` triggers an immediate WorldstateSync.sync() — used
 *   by manual "Refresh" buttons and the System Pulse.
 *
 * Passive sync nudge:
 *   `requestPassiveSync()` is rate-limited and safe to call from render
 *   loops. Hooks call this when a tracked event expires (fissure hit
 *   00:00, cycle flipped) so the UI doesn't have to wait for the next
 *   60-s poll tick.
 */

import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { WorldstateSync } from '@/services/WorldstateSync';
import { useHeartbeatStore } from '@/store/heartbeat';
import type {
  ParsedWorldstate,
  DataSource,
  DataQuality,
} from '@/core/domain/tennoplanApi';

/** Match the Worker FALLBACK_STALENESS_WARNING (30 min). Beyond this age,
 *  consumers render their stale banners. The HeartbeatStore independently
 *  tracks 'stale' vs 'live' via WorldstateSync side-effects — this constant
 *  is for hook-local UI flags that need to fire without a poll boundary. */
const STALE_THRESHOLD_MS = 30 * 60_000;

/**
 * Optional config:
 *   registerRefetch — when true (default), registers forceRefetch on the
 *                     HeartbeatStore. Pass `false` if a hook is mounted
 *                     deep in a tree but is not the page's "primary" data
 *                     source — avoids stomping on the page-level handler.
 */
export interface UseWorldstateOptions {
  registerRefetch?: boolean;
}

export interface UseWorldstateResult {
  /** The current ParsedWorldstate snapshot, or null when never synced. */
  data:           ParsedWorldstate | null;
  /** Unix ms of the last successful sync (0 = never). */
  lastSync:       number;
  /** Age in ms of the snapshot. Infinity when never synced. */
  ageMs:          number;
  /** True while the live query is still resolving its first read. */
  isLoading:      boolean;
  /** True when no record exists at all (post-load). */
  isError:        boolean;
  /** True when the snapshot is older than the staleness threshold. */
  isStale:        boolean;
  /** Where the data came from (official / warframestat / cached / fallback). */
  source:         DataSource | null;
  /** Coarse quality grade (high / medium / low). */
  quality:        DataQuality | null;
  /** Consecutive sync errors since the last success. 0 when healthy. */
  errorCount:     number;

  /** Force an immediate sync and resolve when complete. */
  forceRefetch:        () => Promise<void>;
  /** Rate-limited nudge — safe to call from render code on every tick. */
  requestPassiveSync:  () => void;
}

/**
 * Subscribe to the V2 worldstate store. Re-renders whenever WorldstateSync
 * commits a new snapshot or bumps the metadata.
 */
export function useWorldstate(opts: UseWorldstateOptions = {}): UseWorldstateResult {
  const shouldRegisterRefetch = opts.registerRefetch ?? true;

  // Subscribe to both tables in one query so we don't get torn renders
  // (snapshot updated but metadata not yet, or vice versa).
  const result = useLiveQuery(
    async () => {
      const [row, meta] = await Promise.all([
        db.worldstate.get('current'),
        db.syncMetadata.get('worldstate'),
      ]);
      return { row: row ?? null, meta: meta ?? null };
    },
    [],
  );

  const isLoading = result === undefined;
  const row       = result?.row ?? null;
  const meta      = result?.meta ?? null;

  const data       = row?.data ?? null;
  const lastSync   = meta?.lastSync ?? 0;
  const ageMs      = lastSync > 0 ? Math.max(0, Date.now() - lastSync) : Number.POSITIVE_INFINITY;
  const isStale    = lastSync > 0 ? ageMs > STALE_THRESHOLD_MS : false;
  const source     = meta?.source ?? null;
  const quality    = meta?.quality ?? null;
  const errorCount = meta?.errorCount ?? 0;
  const isError    = !isLoading && row === null && lastSync === 0;

  // Force refresh is intentionally not memoised — the closure captures no
  // hook-local state and WorldstateSync.sync is module-singleton.
  const forceRefetch = async () => {
    await WorldstateSync.sync();
  };
  const requestPassiveSync = () => {
    WorldstateSync.requestPassiveSync();
  };

  // Keep a stable ref so the heartbeat callback always invokes the latest
  // version (consistent with the legacy useWorldCycles registration pattern).
  const refetchRef = useRef(forceRefetch);
  refetchRef.current = forceRefetch;

  useEffect(() => {
    if (!shouldRegisterRefetch) return;
    const handler = () => refetchRef.current();
    const { registerRefetch } = useHeartbeatStore.getState();
    registerRefetch(handler);
    return () => {
      // Only clear if we're still the registered handler — another tab's
      // hook may have mounted on top of us during transition.
      const current = useHeartbeatStore.getState();
      if (current._refetch === handler) {
        current.registerRefetch(null);
      }
    };
  }, [shouldRegisterRefetch]);

  return {
    data,
    lastSync,
    ageMs,
    isLoading,
    isError,
    isStale,
    source,
    quality,
    errorCount,
    forceRefetch,
    requestPassiveSync,
  };
}
