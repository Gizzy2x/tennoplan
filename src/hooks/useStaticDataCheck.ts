/**
 * useStaticDataCheck — on-launch stale detection for static data.
 *
 * Reads the `dataSyncState` table once on mount (no polling — it's a
 * one-time check). Returns the same StaleInfo shape as
 * DropDataService.checkForStaleData() so callers don't need to know Dexie.
 *
 * Only re-fetches when `refreshKey` increments, which SettingsPage triggers
 * after a successful sync to dismiss the banner.
 */

import { useEffect, useState } from 'react';
import { DropDataService, type StaleInfo } from '@/adapters/api/DropDataService';

export interface StaticDataCheckResult {
  staleInfo: StaleInfo | null;
  isChecking: boolean;
}

export function useStaticDataCheck(syncTick?: number): StaticDataCheckResult {
  const [staleInfo, setStaleInfo] = useState<StaleInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsChecking(true);

    DropDataService.checkForStaleData().then((info) => {
      if (!cancelled) {
        setStaleInfo(info);
        setIsChecking(false);
      }
    });

    return () => { cancelled = true; };
  }, [syncTick]);

  return {
    staleInfo,
    isChecking,
  };
}
