/**
 * useDropsLastSynced — live Dexie subscription for the drops sync timestamp.
 *
 * Reads the `drops:lastSynced` key from the `settings` table, which
 * ItemsService.sync() writes after every successful drop-data fetch.
 * useLiveQuery re-renders automatically when the value changes, so the
 * data-freshness footer stays in sync without polling.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';

const DROPS_LAST_SYNC_KEY = 'drops:lastSynced';

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
    () => db.settings.get(DROPS_LAST_SYNC_KEY),
    [],
  );

  // undefined = loading; null/missing = not found; Setting = has value
  const isLoading  = row === undefined;
  const lastSynced = row ? (row.value as number) : null;
  const ageLabel   = lastSynced
    ? formatAge(Date.now() - lastSynced)
    : isLoading ? '…' : 'Never synced';

  return { lastSynced, isLoading, ageLabel };
}
