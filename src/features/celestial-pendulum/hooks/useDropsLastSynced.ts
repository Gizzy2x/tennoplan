/**
 * useDropsLastSynced — live Dexie subscription for the codex sync timestamp.
 *
 * Reads from db.syncMetadata (V2 pipeline) so the data-freshness footer stays
 * in sync with the actual item codex, not the retired dropLocations pipeline.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db }           from '@/adapters/storage/db';

export interface DropsLastSyncedResult {
  lastSynced: number | null;
  isLoading:  boolean;
  ageLabel:   string;
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
    () => db.syncMetadata.get('codex'),
    [],
  );

  const isLoading  = row === undefined;
  const lastSynced = row?.lastSync && row.lastSync > 0 ? row.lastSync : null;
  const ageLabel   = lastSynced
    ? formatAge(Date.now() - lastSynced)
    : isLoading ? '…' : 'Never synced';

  return { lastSynced, isLoading, ageLabel };
}
