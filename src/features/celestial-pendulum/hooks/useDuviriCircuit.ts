/**
 * useDuviriCircuit — the weekly Circuit rotation for Duviri.
 *
 * Reads `duviriCycle.circuit` from the live worldstate. `normal` is the
 * Warframe rotation; `hard` is the Steel Path Incarnon weapon rotation.
 * Returns null until the Worker is deployed with the `circuit` field (the
 * parse exists; older deploys simply omit it).
 */

import { useWorldstate } from '@/hooks/useWorldstate';

export interface DuviriCircuit {
  normal: string[];
  hard:   string[];
}

export function useDuviriCircuit(): DuviriCircuit | null {
  const { data: ws } = useWorldstate();
  return ws?.duviriCycle?.circuit ?? null;
}
