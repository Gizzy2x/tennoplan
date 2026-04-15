/**
 * Global Heartbeat Store — tracks API sync status across all modules.
 *
 * Each page's data hook registers its refetch here on mount.
 * The Header reads this store to render the LIVE / CACHED / OFFLINE indicator.
 *
 * Status transitions:
 *   live     — last fetch succeeded and data is < 5 min old
 *   cached   — data exists but is stale (API failed or > 5 min)
 *   offline  — no data and API is unreachable
 *   syncing  — a manual refetch is in flight
 */

import { create } from 'zustand';

export type HeartbeatStatus = 'live' | 'cached' | 'offline' | 'syncing';

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
