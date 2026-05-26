/**
 * useSimaris — Cephalon Simaris synthesis target (Phase D.6).
 *
 * Reads ParsedWorldstate.simaris from the V2 worldstate store via
 * useWorldstate(). The shape is already normalised by the Worker, so
 * the mapping is a straight rename.
 *
 * Migration notes:
 *   • Legacy hook subscribed to `db.cache.get('worldstate_master')` and
 *     parsed `ws['simaris'].activeSynthesisTarget` directly. V2 emits
 *     the same shape with explicit defaults already applied.
 *
 * The return signature matches the legacy useSimaris exactly.
 */

import { useMemo } from 'react';
import type { SimarisData } from '@/core/domain/simaris';
import { useWorldstate } from '@/hooks/useWorldstate';

export function useSimaris() {
  const { data: ws, lastSync, isLoading, isError, isStale, forceRefetch } =
    useWorldstate();

  const data = useMemo((): SimarisData | null => {
    if (!ws) return null;
    const t = ws.simaris?.activeSynthesisTarget;
    return {
      activeSynthesisTarget: t
        ? {
            name:       t.name,
            type:       t.type,
            isArchwing: t.isArchwing,
            isBoss:     t.isBoss,
          }
        : null,
    };
  }, [ws]);

  return {
    data,
    isLoading,
    isError,
    isStale,
    lastSync,
    forceRefetch,
  };
}
