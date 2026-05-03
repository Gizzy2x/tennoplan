/**
 * useStaticDataCheck — reactive stale detection for the item codex.
 *
 * Uses useLiveQuery so the banner auto-dismisses the moment StaticDataService
 * writes items to Dexie — no polling, no DOM events needed.
 *
 * The banner only fires when itemCount === 0 (never synced / cleared). The
 * separate staleness indicator lives in SettingsPage.
 */

import { useLiveQuery }      from 'dexie-react-hooks';
import { StaticDataService } from '@/services/StaticDataService';
import type { StaleInfo }    from '@/adapters/api/DropDataService';

export interface StaticDataCheckResult {
  staleInfo: StaleInfo | null;
  isChecking: boolean;
}

// syncTick kept for API compat with AppShell — no longer needed internally
export function useStaticDataCheck(_syncTick?: number): StaticDataCheckResult {
  const status = useLiveQuery(() => StaticDataService.getCodexStatus());

  if (status === undefined) {
    return { staleInfo: null, isChecking: true };
  }

  const { itemCount, lastSync, ageMinutes } = status;
  const neverSynced = !lastSync || itemCount === 0;
  const daysOld     = neverSynced
    ? Infinity
    : Math.floor(ageMinutes / (60 * 24));

  const staleInfo: StaleInfo = {
    isStale:     itemCount === 0,
    daysOld,
    lastUpdated: lastSync || null,
    message:     neverSynced
      ? 'Drop data missing — sync now to see accurate bounty drops'
      : `Drop data synced ${daysOld === 0 ? 'today' : `${daysOld} day${daysOld !== 1 ? 's' : ''} ago`}.`,
  };

  return { staleInfo, isChecking: false };
}
