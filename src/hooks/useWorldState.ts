/**
 * useWorldState.ts — Triple-Layer Redundancy World State Hook
 *
 * Layer 1  »  warframestat.us (direct, primary source)
 * Layer 2  »  /api/worldstate (local Vercel serverless proxy → DE raw data)
 * Layer 3  »  Mathematical Dead Reckoning seeded from localStorage cache
 *              + known cycle epochs/durations as last resort
 *
 * Server-time sync: derives a `serverTimeOffset` (ms) from HTTP Date headers
 * so timers stay accurate even when the user's system clock is wrong.
 *
 * Exports: { data, status, source, serverTimeOffset }
 *   data   — live cycle states (ticking per second in React state)
 *   status — 'loading' | 'live' | 'fallback' | 'predicted'
 *   source — same three values (alias kept for convenience)
 *   serverTimeOffset — add to Date.now() to get corrected time
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Public types ────────────────────────────────────────────────────────────

export type CycleKey    = 'cetus' | 'vallis' | 'cambion' | 'zariman';
export type DataSource  = 'live' | 'fallback' | 'predicted';
export type DataStatus  = 'loading' | 'live' | 'fallback' | 'predicted';

export interface CycleState {
  /** Human label for the active phase: 'Day', 'Night', 'Warm', 'Cold', 'Fass', 'Vome', 'Corpus', 'Grineer' */
  current: string;
  /** Label for the next phase */
  next: string;
  /** Milliseconds remaining in this phase */
  msRemaining: number;
  /** 0–100: fraction of current phase already elapsed (drives progress bar) */
  percent: number;
  /** Where this data came from */
  source: DataSource;
}

export interface WorldStateData {
  cycles: Record<CycleKey, CycleState>;
  /** ms to add to Date.now() to get server-corrected time */
  serverTimeOffset: number;
  /** Date.now() value when this snapshot was received from an API */
  fetchedAt: number;
}

export interface UseWorldStateResult {
  data: WorldStateData | null;
  status: DataStatus;
  source: DataSource;
  serverTimeOffset: number;
}

// ── Dead-Reckoning constants ────────────────────────────────────────────────
// Epochs (Unix seconds) are calibrated against DE's live worldstate.
// Phase durations (seconds): [phase0Duration, phase1Duration]
// Phase names: [phase0Name, phase1Name]

interface CycleConfig {
  epoch: number;
  phases: [number, number];      // duration of each phase in seconds
  names: [string, string];       // [phase0, phase1]
}

const CYCLE_CONFIG: Record<CycleKey, CycleConfig> = {
  // Plains of Eidolon — 150 min total: 100 min Day, 50 min Night
  cetus: {
    epoch:  1509776400,
    phases: [6000, 3000],
    names:  ['Day', 'Night'],
  },
  // Orb Vallis — ~27 min total: ~6.7 min Warm, ~20 min Cold
  vallis: {
    epoch:  1542959100,
    phases: [400, 1200],
    names:  ['Warm', 'Cold'],
  },
  // Cambion Drift (Deimos) — ~149 min total: Fass ~98 min, Vome ~51 min
  cambion: {
    epoch:  1596461955,
    phases: [5900, 3060],
    names:  ['Fass', 'Vome'],
  },
  // Zariman Ten Zero — 120 min total: 60 min Corpus, 60 min Grineer
  zariman: {
    epoch:  1652464800,
    phases: [3600, 3600],
    names:  ['Corpus', 'Grineer'],
  },
};

const CACHE_KEY = 'tennoplan:worldstate:v2';
const LAYER1_URL = 'https://api.warframestat.us/pc?language=en';
const LAYER2_URL = '/api/worldstate';
const FETCH_TIMEOUT_MS = 6000;
const POLL_INTERVAL_MS = 60_000;

// ── Raw API shape (warframestat.us /pc) ─────────────────────────────────────

interface RawCycleEntry {
  expiry:     string;          // ISO date string
  activation?: string;         // ISO date string (start of current phase)
  isDay?:     boolean;
  isWarm?:    boolean;
  state?:     string;          // 'fass' | 'vome' | 'corpus' | 'grineer'
  active?:    string;          // alias used by some versions
}

interface RawWorldState {
  cetusCycle?:   RawCycleEntry;
  vallisCycle?:  RawCycleEntry;
  cambionCycle?: RawCycleEntry;
  zarimanCycle?: RawCycleEntry;
}

// ── Server-time offset calculation ─────────────────────────────────────────

/**
 * Compute serverTimeOffset from an HTTP response's Date header.
 * Uses the RTT midpoint approximation: assume the response was generated
 * halfway through the round trip, so server time at receipt ≈ serverMs + rtt/2.
 */
function calcServerTimeOffset(response: Response, t0: number, t1: number): number {
  const dateHeader = response.headers.get('Date');
  if (!dateHeader) return 0;
  const serverMs = new Date(dateHeader).getTime();
  if (isNaN(serverMs)) return 0;
  const rtt = t1 - t0;
  // serverMs is when the server sent the response; add rtt/2 to estimate server
  // time at the moment we received it, then compare to our local clock.
  return serverMs + rtt / 2 - t1;
}

// ── Fetch helpers ───────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  signal: AbortSignal,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const localCtrl = new AbortController();
  const timer = setTimeout(() => localCtrl.abort(), timeoutMs);

  // Combine the external signal and our timeout signal
  const combinedSignal = AbortSignal.any
    ? AbortSignal.any([signal, localCtrl.signal])
    : localCtrl.signal;

  try {
    const res = await fetch(url, { signal: combinedSignal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Raw-to-CycleState normalizers ───────────────────────────────────────────

function normalizeEntry(
  key: CycleKey,
  raw: RawCycleEntry,
  serverTimeOffset: number,
): CycleState | null {
  if (!raw.expiry) return null;

  const now = Date.now() + serverTimeOffset;
  const expiryMs = new Date(raw.expiry).getTime();
  const msRemaining = Math.max(0, expiryMs - now);

  // Determine current phase name from the raw payload
  let current: string;
  let next: string;
  const [name0, name1] = CYCLE_CONFIG[key].names;

  if (key === 'cetus') {
    current = raw.isDay ? name0 : name1;
    next    = raw.isDay ? name1 : name0;
  } else if (key === 'vallis') {
    current = raw.isWarm ? name0 : name1;
    next    = raw.isWarm ? name1 : name0;
  } else {
    // cambion / zariman: use state/active string
    const stateStr = String(raw.state ?? raw.active ?? '').toLowerCase();
    const inPhase0 = stateStr === name0.toLowerCase() ||
                     stateStr.startsWith(name0.toLowerCase().slice(0, 3));
    current = inPhase0 ? name0 : name1;
    next    = inPhase0 ? name1 : name0;
  }

  // Compute percent elapsed using activation if available, else approximate
  // from total phase duration
  let percent = 0;
  const cfg = CYCLE_CONFIG[key];
  const phaseDurMs = (current === cfg.names[0] ? cfg.phases[0] : cfg.phases[1]) * 1000;

  if (raw.activation) {
    const activationMs = new Date(raw.activation).getTime();
    const elapsed = now - activationMs;
    percent = phaseDurMs > 0 ? Math.min(100, Math.max(0, (elapsed / phaseDurMs) * 100)) : 0;
  } else if (phaseDurMs > 0) {
    percent = Math.min(100, Math.max(0, ((phaseDurMs - msRemaining) / phaseDurMs) * 100));
  }

  return { current, next, msRemaining, percent, source: 'live' };
}

// ── Layer 3: Dead Reckoning ─────────────────────────────────────────────────

function deadReckon(key: CycleKey, serverTimeOffset: number): CycleState {
  const now = Math.floor((Date.now() + serverTimeOffset) / 1000); // corrected Unix seconds
  const cfg = CYCLE_CONFIG[key];
  const total = cfg.phases[0] + cfg.phases[1];

  let elapsed = (now - cfg.epoch) % total;
  if (elapsed < 0) elapsed += total;

  const inPhase0 = elapsed < cfg.phases[0];
  const phaseDur = inPhase0 ? cfg.phases[0] : cfg.phases[1];
  const intoPhase = inPhase0 ? elapsed : elapsed - cfg.phases[0];
  const secsRemaining = Math.max(0, phaseDur - intoPhase);
  const percent = Math.min(100, Math.max(0, (intoPhase / phaseDur) * 100));

  return {
    current:     inPhase0 ? cfg.names[0] : cfg.names[1],
    next:        inPhase0 ? cfg.names[1] : cfg.names[0],
    msRemaining: secsRemaining * 1000,
    percent,
    source:      'predicted',
  };
}

function buildPredictedCycles(serverTimeOffset: number): Record<CycleKey, CycleState> {
  return {
    cetus:   deadReckon('cetus',   serverTimeOffset),
    vallis:  deadReckon('vallis',  serverTimeOffset),
    cambion: deadReckon('cambion', serverTimeOffset),
    zariman: deadReckon('zariman', serverTimeOffset),
  };
}

// ── localStorage cache ──────────────────────────────────────────────────────

interface CacheEntry {
  cycles:           Record<CycleKey, CycleState>;
  serverTimeOffset: number;
  fetchedAt:        number;
}

function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheEntry = JSON.parse(raw);
    // Discard stale cache older than 2 hours — dead reckoning will seed itself
    if (Date.now() - parsed.fetchedAt > 2 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(entry: CacheEntry): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // storage full or unavailable — non-fatal
  }
}

// ── Core fetch logic (called on mount + poll interval) ──────────────────────

interface FetchResult {
  cycles: Record<CycleKey, CycleState>;
  serverTimeOffset: number;
  status: DataStatus;
  source: DataSource;
  fetchedAt: number;
}

async function fetchWorldState(
  signal: AbortSignal,
  lastOffset: number,
): Promise<FetchResult> {
  const CYCLE_KEYS: CycleKey[] = ['cetus', 'vallis', 'cambion', 'zariman'];

  function buildFromRaw(
    raw: RawWorldState,
    offset: number,
    src: DataSource,
    statusVal: DataStatus,
  ): FetchResult {
    const cycles = {} as Record<CycleKey, CycleState>;
    const apiMap: Record<CycleKey, RawCycleEntry | undefined> = {
      cetus:   raw.cetusCycle,
      vallis:  raw.vallisCycle,
      cambion: raw.cambionCycle,
      zariman: raw.zarimanCycle,
    };
    for (const key of CYCLE_KEYS) {
      const entry = apiMap[key];
      const normalized = entry ? normalizeEntry(key, entry, offset) : null;
      cycles[key] = normalized
        ? { ...normalized, source: src }
        : deadReckon(key, offset);
    }
    return { cycles, serverTimeOffset: offset, status: statusVal, source: src, fetchedAt: Date.now() };
  }

  // ── Layer 1: warframestat.us ─────────────────────────────────────────────
  try {
    const t0 = Date.now();
    const res = await fetchWithTimeout(LAYER1_URL, signal);
    const t1 = Date.now();
    if (!res.ok) throw new Error(`L1 HTTP ${res.status}`);
    const json: RawWorldState = await res.json();
    const offset = calcServerTimeOffset(res, t0, t1);
    const result = buildFromRaw(json, offset, 'live', 'live');
    saveCache({ cycles: result.cycles, serverTimeOffset: offset, fetchedAt: result.fetchedAt });
    return result;
  } catch (l1Err) {
    if (signal.aborted) throw l1Err;
    console.warn('[useWorldState] Layer 1 failed:', (l1Err as Error).message);
  }

  // ── Layer 2: /api/worldstate ─────────────────────────────────────────────
  try {
    const t0 = Date.now();
    const res = await fetchWithTimeout(LAYER2_URL, signal);
    const t1 = Date.now();
    if (!res.ok) throw new Error(`L2 HTTP ${res.status}`);
    const json: RawWorldState = await res.json();
    const offset = calcServerTimeOffset(res, t0, t1);
    const result = buildFromRaw(json, offset, 'fallback', 'fallback');
    saveCache({ cycles: result.cycles, serverTimeOffset: offset, fetchedAt: result.fetchedAt });
    return result;
  } catch (l2Err) {
    if (signal.aborted) throw l2Err;
    console.warn('[useWorldState] Layer 2 failed:', (l2Err as Error).message);
  }

  // ── Layer 3: Dead Reckoning ──────────────────────────────────────────────
  // Seed from localStorage cache first, then fall back to raw epoch math.
  console.warn('[useWorldState] Both API layers failed — using dead reckoning');
  const cached = loadCache();
  const offset = cached?.serverTimeOffset ?? lastOffset;

  if (cached) {
    // Re-derive msRemaining from cache's fetchedAt using the cached phase info
    const ageMs = Date.now() - cached.fetchedAt;
    const cycles = {} as Record<CycleKey, CycleState>;
    for (const key of CYCLE_KEYS) {
      const c = cached.cycles[key];
      if (c) {
        const msRemaining = Math.max(0, c.msRemaining - ageMs);
        if (msRemaining > 0) {
          const cfg = CYCLE_CONFIG[key];
          const phaseDurMs = (c.current === cfg.names[0] ? cfg.phases[0] : cfg.phases[1]) * 1000;
          const percent = phaseDurMs > 0
            ? Math.min(100, ((phaseDurMs - msRemaining) / phaseDurMs) * 100)
            : c.percent;
          cycles[key] = { ...c, msRemaining, percent, source: 'predicted' };
          continue;
        }
      }
      // Phase has expired in the cache — fall back to pure epoch math
      cycles[key] = deadReckon(key, offset);
    }
    return { cycles, serverTimeOffset: offset, status: 'predicted', source: 'predicted', fetchedAt: Date.now() };
  }

  // No cache available — pure epoch math
  return {
    cycles:           buildPredictedCycles(offset),
    serverTimeOffset: offset,
    status:           'predicted',
    source:           'predicted',
    fetchedAt:        Date.now(),
  };
}

// ── The Hook ────────────────────────────────────────────────────────────────

export function useWorldState(): UseWorldStateResult {
  const [status, setStatus] = useState<DataStatus>('loading');
  const [source, setSource] = useState<DataSource>('predicted');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [data, setData] = useState<WorldStateData | null>(() => {
    // Seed from cache immediately so the UI has something to show
    const cached = loadCache();
    if (!cached) return null;
    return { cycles: cached.cycles, serverTimeOffset: cached.serverTimeOffset, fetchedAt: cached.fetchedAt };
  });

  // Keep a ref to the latest offset for the tick function
  const offsetRef = useRef(serverTimeOffset);
  offsetRef.current = serverTimeOffset;

  // Fetch & update function
  const doFetch = useCallback((signal: AbortSignal) => {
    fetchWorldState(signal, offsetRef.current)
      .then(result => {
        if (signal.aborted) return;
        setData({ cycles: result.cycles, serverTimeOffset: result.serverTimeOffset, fetchedAt: result.fetchedAt });
        setServerTimeOffset(result.serverTimeOffset);
        setStatus(result.status);
        setSource(result.source);
      })
      .catch(err => {
        if (!signal.aborted) {
          console.error('[useWorldState] Fetch error:', err);
        }
      });
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    const ctrl = new AbortController();
    doFetch(ctrl.signal);
    const poll = setInterval(() => doFetch(ctrl.signal), POLL_INTERVAL_MS);
    return () => { ctrl.abort(); clearInterval(poll); };
  }, [doFetch]);

  // Per-second tick: decrement msRemaining, auto-refetch when a phase expires
  const refetchRef = useRef(doFetch);
  refetchRef.current = doFetch;

  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        if (!prev) return prev;
        let needsRefetch = false;
        const updated = { ...prev };
        const cycles = { ...prev.cycles } as Record<CycleKey, CycleState>;

        for (const key of Object.keys(cycles) as CycleKey[]) {
          const c = cycles[key];
          const ms = Math.max(0, c.msRemaining - 1000);
          if (ms === 0 && c.msRemaining > 0) {
            // Phase just ended — switch to dead reckoning for this cycle and
            // trigger a background refetch to get authoritative data
            cycles[key] = deadReckon(key, offsetRef.current);
            needsRefetch = true;
          } else {
            const cfg = CYCLE_CONFIG[key];
            const phaseDurMs = (c.current === cfg.names[0] ? cfg.phases[0] : cfg.phases[1]) * 1000;
            const percent = phaseDurMs > 0
              ? Math.min(100, ((phaseDurMs - ms) / phaseDurMs) * 100)
              : c.percent;
            cycles[key] = { ...c, msRemaining: ms, percent };
          }
        }

        if (needsRefetch) {
          const ctrl = new AbortController();
          refetchRef.current(ctrl.signal);
          // Caller doesn't need to abort — the next poll will supersede
        }

        updated.cycles = cycles;
        return updated;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // runs once; uses refs for fresh values

  return { data, status, source, serverTimeOffset };
}
