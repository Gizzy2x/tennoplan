import { db } from '../storage/db';
import type { WorldCycle, CycleId } from '../../core/domain/cycles';

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

function cacheKey(id: CycleId): string {
  return `worldstate:cycle:${id}`;
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

async function fetchOneCycle(id: CycleId): Promise<WorldCycle> {
  const key = cacheKey(id);
  const now = Date.now();

  // Check Dexie cache — if still fresh, skip the network call entirely.
  const cached = await db.cache.get(key);
  if (cached && cached.expiresAt > now) {
    return rawToWorldCycle(id, cached.data as RawCycle, cached.updatedAt);
  }

  // Attempt live fetch.
  try {
    const res = await fetch(ENDPOINT[id]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: RawCycle = await res.json();

    await db.cache.put({
      key,
      data:      raw,
      expiresAt: now + CACHE_TTL_MS,
      updatedAt: now,
    });

    return rawToWorldCycle(id, raw, now);
  } catch {
    // Offline or API failure — fall back to any cached record (even expired).
    // The cycleService.extrapolateCycle will advance it to the current state.
    if (cached) {
      return rawToWorldCycle(id, cached.data as RawCycle, cached.updatedAt);
    }
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
 */
export async function fetchAllCycles(): Promise<WorldCycle[]> {
  const results = await Promise.allSettled(CYCLE_IDS.map(fetchOneCycle));

  return results
    .filter((r): r is PromiseFulfilledResult<WorldCycle> => r.status === 'fulfilled')
    .map(r => r.value);
}
