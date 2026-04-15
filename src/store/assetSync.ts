/**
 * Asset Sync Store — Zustand bridge between the AssetSyncService event bus
 * and any React component that needs to display sync progress.
 *
 * Usage:
 *   const { progress, isReady } = useAssetSyncStore();
 *
 * Wire-up is side-effect free from the component's perspective:
 * the subscription is established when this module is first imported.
 */

import { create } from 'zustand';
import type { SyncProgress } from '@/core/domain/assets';
import { onProgress } from '@/adapters/assets/assetSyncService';
import { getQueueStats } from '@/adapters/assets/assetDownloader';

// ─── State shape ──────────────────────────────────────────────────────────────

interface AssetSyncState {
  /** Latest progress snapshot from the sync engine. */
  progress: SyncProgress;
  /** true once Tier 1 downloads are complete and the app is "ready". */
  isReady: boolean;
  /** Live queue depth snapshot — useful for debug overlays. */
  queueStats: { active: number; queued: number };
}

// ─── Store ────────────────────────────────────────────────────────────────────

const INITIAL: AssetSyncState = {
  progress: {
    phase: 'idle',
    total: 0,
    completed: 0,
    failed: 0,
    message: 'Waiting…',
    percentComplete: 0,
  },
  isReady: false,
  queueStats: { active: 0, queued: 0 },
};

export const useAssetSyncStore = create<AssetSyncState>(() => INITIAL);

// ─── Bridge: service event bus → Zustand ─────────────────────────────────────

// Establish subscription once at module load — no cleanup needed (app lifetime).
onProgress((progress: SyncProgress) => {
  useAssetSyncStore.setState({
    progress,
    isReady: progress.phase === 'complete',
    queueStats: getQueueStats(),
  });
});

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Derived selector: true while Tier 1 assets are still downloading. */
export function selectIsLoadingCoreAssets(state: AssetSyncState): boolean {
  return state.progress.phase === 'tier1' || state.progress.phase === 'manifest';
}

/** Derived selector: progress bar value 0–100. */
export function selectPercentComplete(state: AssetSyncState): number {
  return state.progress.percentComplete;
}
