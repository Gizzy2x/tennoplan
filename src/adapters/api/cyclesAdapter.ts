import { getWsCache, setWsCache, WS_CACHE_KEYS } from '../storage/worldstateCache';
import type { WorldCycle, CycleId } from '../../core/domain/cycles';
import type { WSFetchResult } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = 'https://api.warframestat.us/pc';

/** How long to trust a fresh API response before re-fetching. */
const CACHE_TTL_MS = 90_000; // 90 s

const ENDPOINT: Record<CycleId, string> = {
  cetus:   `${BASE}/cetusCycle`,
  vallis:  `${BASE}/vallisCycle`,
  cambion: `${BASE}/cambionCycle`,
  zariman: `${BASE}/zarimanCycle`,
  earth:   `${BASE}/earthCycle`,
};

const META: Record<CycleId, { name: string; location: string }> = {
  cetus:   { name: 'Plains of Eidolon', location: 'Cetus' },
  vallis:  { name: 'Orb Vallis',        location: 'Fortuna' },
  cambion: { name: 'Cambion Drift',     location: 'Necralisk' },
  zariman: { name: 'Zariman Ten Zero',  location: 'Chrysalith' },
  earth:   { name: 'Earth',            location: 'Earth Proxima' },
};

const CYCLE_CACHE_KEY: Record<CycleId, string> = {
  cetus:   WS_CACHE_KEYS.cycleCetus,
  vallis:  WS_CACHE_KEYS.cycleVallis,
  cambion: WS_CACHE_KEYS.cycleCambion,
  zariman: WS_CACHE_KEYS.cycleZariman,
  earth:   WS_CACHE_KEYS.cycleEarth,
};

// ---------------------------------------------------------------------------
// Raw API shapes (partial — only what we consume)
// ---------------------------------------------------------------------------

interface RawCycle {
  expiry:     string;
  activation: string;
  /** cetusCycle / vallisCycle / zarimanCycle / earthCycle */
  state?:  string;
  /** cambionCycle uses "active" instead of "state" */
  active?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CycleFetchMeta {
  cycle:          WorldCycle;
  cachedAt:       number;
  fromStaleCache: boolean;
}

function normalizeState(id: CycleId, raw: RawCycle): string {
  if (id === 'cambion') return (raw.active ?? 'fass').toLowerCase();
  return (raw.state ?? 'day').toLowerCase();
}

function rawToWorldCycle(id: CycleId, raw: RawCycle, fetchedAt: number): WorldCycle {
  return {
    id,
    ...META[id],
    state:        normalizeState(id, raw) as WorldCycle['state'],
    expiryMs:     new Date(raw.expiry).getTime(),
    activationMs: new Date(raw.activation).getTime(),
    fetchedAt,
  };
}

// ---------------------------------------------------------------------------
// Per-cycle fetch (with Dexie offline fallback)
// ---------------------------------------------------------------------------

async function fetchOneCycle(id: CycleId): Promise<CycleFetchMeta> {
  const key    = CYCLE_CACHE_KEY[id];
  const cached = await getWsCache<RawCycle>(key);

  // 1. Fresh cache
  if (cached && !cached.isExpired) {
    return {
      cycle:          rawToWorldCycle(id, cached.data, cached.cachedAt),
      cachedAt:       cached.cachedAt,
      fromStaleCache: false,
    };
  }

  // 2. Live fetch
  try {
    const res = await fetch(ENDPOINT[id]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: RawCycle = await res.json();
    const now = Date.now();

    await setWsCache(key, raw, CACHE_TTL_MS);

    return {
      cycle:          rawToWorldCycle(id, raw, now),
      cachedAt:       now,
      fromStaleCache: false,
    };
  } catch {
    // 3. Stale cache
    if (cached) {
      return {
        cycle:          rawToWorldCycle(id, cached.data, cached.cachedAt),
        cachedAt:       cached.cachedAt,
        fromStaleCache: true,
      };
    }
    // 4. No cache at all
    throw new Error(
      `No data for "${id}". Connect to a network to initialize world cycle data.`
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const CYCLE_IDS: CycleId[] = ['cetus', 'vallis', 'cambion', 'zariman', 'earth'];

/**
 * Fetch all five world cycles, returning whichever succeed.
 * Individual failures are silently dropped so a single unavailable endpoint
 * does not break the dashboard.
 *
 * Returns aggregate staleness: `cachedAt` is the oldest successful entry,
 * `fromStaleCache` is true if any cycle was served from expired cache.
 */
export async function fetchAllCycles(): Promise<WSFetchResult<WorldCycle[]>> {
  const results = await Promise.allSettled(CYCLE_IDS.map(fetchOneCycle));

  const metas = results
    .filter((r): r is PromiseFulfilledResult<CycleFetchMeta> => r.status === 'fulfilled')
    .map(r => r.value);

  if (metas.length === 0) {
    throw new Error(
      'No world cycle data available. Connect to a network to initialize the Celestial Pendulum.'
    );
  }

  const cachedAt       = Math.min(...metas.map(m => m.cachedAt));
  const fromStaleCache = metas.some(m => m.fromStaleCache);

  return {
    data: metas.map(m => m.cycle),
    cachedAt,
    fromStaleCache,
  };
}
