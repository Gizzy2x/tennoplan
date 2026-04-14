import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { SyncService } from '@/services/SyncService';
import type { SimarisData } from '@/core/domain/simaris';

// ---------------------------------------------------------------------------
// Raw API shape (kept local)
// ---------------------------------------------------------------------------

interface RawSimaris {
  activeSynthesisTarget?: {
    name?:       string;
    type?:       string;
    isArchwing?: boolean;
    isBoss?:     boolean;
  } | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides the active Simaris synthesis target from worldstate_master.
 * No fetch, no TanStack Query — useLiveQuery re-renders on SyncService write.
 */
export function useSimaris() {
  const wsEntry = useLiveQuery(
    () => db.cache.get('worldstate_master').then(e => e ?? null),
    []
  );

  const isLoading = wsEntry === undefined;
  const ws        = (wsEntry?.data ?? null) as Record<string, unknown> | null;
  const cachedAt  = wsEntry?.updatedAt ?? 0;
  const isStale   = wsEntry ? wsEntry.expiresAt < Date.now() : false;

  const data = useMemo((): SimarisData | null => {
    if (!ws) return null;
    const raw = (ws['simaris'] ?? {}) as RawSimaris;
    const t   = raw.activeSynthesisTarget;
    return {
      activeSynthesisTarget: t
        ? {
            name:       t.name       ?? 'Unknown Target',
            type:       t.type       ?? 'synthesis',
            isArchwing: t.isArchwing ?? false,
            isBoss:     t.isBoss     ?? false,
          }
        : null,
    };
  }, [ws]);

  async function forceRefetch() {
    await SyncService.performSync(true);
  }

  return {
    data,
    isLoading,
    isError:  !isLoading && wsEntry === null,
    isStale,
    lastSync: cachedAt,
    forceRefetch,
  };
}
