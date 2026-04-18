/**
 * useDropsLastSynced — live Dexie subscription for the drops sync timestamp.
 *
 * Reads the `dropLocations` row from the `dataSyncState` table, which
 * DropDataService.fetchAndSync() writes after every successful sync.
 * useLiveQuery re-renders automatically when the value changes, so the
 * data-freshness footer stays in sync without polling.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';

export interface DropsLastSyncedResult {
  /** Unix ms of the last successful sync, or null if never synced. */
  lastSynced: number | null;
  /** True while Dexie hasn't responded yet (first render). */
  isLoading: boolean;
  /** Human-readable age string, e.g. "3h ago", "just now", "Never synced". */
  ageLabel: string;
}

function formatAge(ms: number): string {
  const secs  = Math.floor(ms / 1000);
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);

  if (secs  < 60)  return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

export function useDropsLastSynced(): DropsLastSyncedResult {
  const row = useLiveQuery(
    () => db.dataSyncState.get('dropLocations'),
    [],
  );

  // undefined = loading; null/missing row = not found; row = has value
  const isLoading  = row === undefined;
  const lastSynced = row?.lastUpdated && row.lastUpdated > 0 ? row.lastUpdated : null;
  const ageLabel   = lastSynced
    ? formatAge(Date.now() - lastSynced)
    : isLoading ? '…' : 'Never synced';

  return { lastSynced, isLoading, ageLabel };
}
