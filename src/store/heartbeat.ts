/**
 * Global Heartbeat Store — tracks API sync status across all modules.
 *
 * Each page's data hook registers its refetch here on mount.
 * The Header reads this store to render the LIVE / CACHED / STALE / OFFLINE indicator.
 *
 * Status transitions:
 *   live     — last fetch succeeded and data is fresh (< staleness threshold)
 *   cached   — fetch failed but local Dexie cache exists (recent)
 *   stale    — local cache is older than the staleness threshold (default 30 min);
 *              data may have been served via the Worker's cycle-math fallback
 *   offline  — no cached data AND fetch is failing
 *   syncing  — a manual refetch is in flight
 *
 * Phase D.2 added 'stale' to mirror the Worker's three-tier response model
 * (official / cached / fallback). The Header gracefully degrades: any
 * non-syncing status renders as "Last sync Xm ago" with the distinction
 * surfaced via dedicated badge components when wired in D.4.
 */

import { create } from 'zustand';

export type HeartbeatStatus = 'live' | 'cached' | 'stale' | 'offline' | 'syncing';

interface HeartbeatState {
  status:     HeartbeatStatus;
  /** Timestamp (ms) of the last successful API sync. 0 = never. */
  lastSyncMs: number;
  /** Registered refetch from the active page's data hook. */
  _refetch:   (() => Promise<void>) | null;

  /** Called by data hooks after each query result to update global status. */
  setSync: (status: HeartbeatStatus, lastSyncMs?: number) => void;
  /** Called by the active page's hook on mount to register its refetch. */
  registerRefetch: (fn: (() => Promise<void>) | null) => void;
  /** Called by the HeartbeatIndicator button — triggers the page's refetch. */
  triggerRefetch: () => Promise<void>;
}

export const useHeartbeatStore = create<HeartbeatState>((set, get) => ({
  status:     'live',
  lastSyncMs: Date.now(),
  _refetch:   null,

  setSync(status, lastSyncMs = Date.now()) {
    set({ status, lastSyncMs });
  },

  registerRefetch(fn) {
    set({ _refetch: fn });
  },

  async triggerRefetch() {
    const { _refetch, status } = get();
    if (!_refetch || status === 'syncing') return;
    set({ status: 'syncing' });
    try {
      await _refetch();
    } catch {
      set({ status: 'offline' });
    }
  },
}));
