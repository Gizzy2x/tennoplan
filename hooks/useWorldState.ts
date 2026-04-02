// useWorldState.ts
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
export type CycleType = 'cetus' | 'vallis' | 'earth' | 'zariman';
export type DataSource = 'api' | 'predictive';
export interface CycleData {
  type: CycleType;
  phase: string;
  secondsRemaining: number;
  progressPercent: number;
  source: DataSource;
}
// ── Math predictor ────────────────────────────────────────────────────────
const DURATIONS: Record<CycleType, { total: number; phases: [number, number] }> = {
  cetus:   { total: 9000,  phases: [6000,  3000]  },
  vallis:  { total: 1600,  phases: [400,   1200]  },
  earth:   { total: 28800, phases: [14400, 14400] },
  zariman: { total: 7200,  phases: [3600,  3600]  },
};
const EPOCHS: Record<CycleType, number> = {
  cetus: 1577836800, vallis: 1577836800,
  earth: 1577836800, zariman: 1577836800,
};
const PHASE_NAMES: Record<CycleType, [string, string]> = {
  cetus:   ['Day',   'Night'],
  vallis:  ['Warm',  'Cold' ],
  earth:   ['Day',   'Night'],
  zariman: ['Light', 'Dark' ],
};
function predictCycle(type: CycleType) {
  const nowSec = Math.floor(Date.now() / 1000);
  const { total, phases: [p1, p2] } = DURATIONS[type];
  let elapsed = (nowSec - EPOCHS[type]) % total;
  if (elapsed < 0) elapsed += total;
  const inPhase1 = elapsed < p1;
  const phaseDur = inPhase1 ? p1 : p2;
  const into     = inPhase1 ? elapsed : elapsed - p1;
  return {
    phase:           PHASE_NAMES[type][inPhase1 ? 0 : 1],
    secondsRemaining: Math.max(0, phaseDur - into),
    progressPercent: Math.min(100, (into / phaseDur) * 100),
  };
}
// ── API shape (adjust to match your /api/worldstate response) ─────────────
interface WorldstateApiResponse {
  cetus?:   { state: string; expiry: string };
  vallis?:  { state: string; expiry: string };
  earth?:   { state: string; expiry: string };
  zariman?: { state: string; expiry: string };
}
function fromApi(key: CycleType, raw: WorldstateApiResponse): Omit<CycleData, 'source'> | null {
  const entry = raw[key];
  if (!entry) return null;
  const secondsRemaining = Math.max(0, Math.floor((new Date(entry.expiry).getTime() - Date.now()) / 1000));
  const { phases: [p1, p2] } = DURATIONS[key];
  const phaseDur = PHASE_NAMES[key][0].toLowerCase() === entry.state.toLowerCase() ? p1 : p2;
  return {
    type: key,
    phase: entry.state,
    secondsRemaining,
    progressPercent: Math.min(100, ((phaseDur - secondsRemaining) / phaseDur) * 100),
  };
}
// ── Hook ──────────────────────────────────────────────────────────────────
const CYCLE_KEYS: CycleType[] = ['cetus', 'vallis', 'earth', 'zariman'];
export function useWorldState() {
  const { data: apiData, isError, isSuccess } = useQuery<WorldstateApiResponse>({
    queryKey: ['worldstate'],
    queryFn:  () => fetch('/api/worldstate').then(r => r.json()),
    staleTime: 60_000,
    retry: 2,
  });
  const source: DataSource = (isSuccess && apiData) ? 'api' : 'predictive';
  const buildCycles = (): CycleData[] =>
    CYCLE_KEYS.map(key => {
      const api = (isSuccess && apiData) ? fromApi(key, apiData) : null;
      const base = api ?? { type: key, ...predictCycle(key) };
      return { ...base, source };
    });
  const [cycles, setCycles] = useState<CycleData[]>(buildCycles);
  // Resync when API data arrives
  useEffect(() => {
    if (apiData) {
      console.log('WorldState Update:', apiData);
    }
    setCycles(buildCycles());
  }, [apiData, isError]);
  // Tick every second — auto-resync phase at 0
  useEffect(() => {
    const id = setInterval(() => {
      setCycles(prev => prev.map(c => {
        const secs = Math.max(0, c.secondsRemaining - 1);
        if (secs === 0) return { type: c.type, ...predictCycle(c.type), source };
        return { ...c, secondsRemaining: secs };
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [source]);
  return { cycles, source };
}
