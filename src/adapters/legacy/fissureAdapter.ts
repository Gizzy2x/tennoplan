import { getWsCache, setWsCache, WS_CACHE_KEYS } from '../storage/worldstateCache';
import { fetchWorldstate } from '../api/worldstateFetcher';
import type { Fissure, FissureEnemy, FissureTier } from '../../core/domain/relics';
import type { WSFetchResult } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000; // 60 s — fissures rotate frequently

// ---------------------------------------------------------------------------
// Raw API shape (partial — only what we consume)
// ---------------------------------------------------------------------------

interface RawFissure {
  id:           string;
  node:         string;
  missionType:  string;
  enemy:        string;
  tier:         string;
  tierNum:      number;
  expiry:       string;
  activation:   string;
  expired:      boolean;
  isStorm:      boolean;
  isHard:       boolean;
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function rawToFissure(raw: RawFissure, fetchedAt: number): Fissure {
  return {
    id:           raw.id,
    node:         raw.node,
    missionType:  raw.missionType,
    enemy:        raw.enemy as FissureEnemy,
    tier:         raw.tier as FissureTier,
    tierNum:      raw.tierNum,
    expiryMs:     new Date(raw.expiry).getTime(),
    activationMs: new Date(raw.activation).getTime(),
    fetchedAt,
    isStorm:      raw.isStorm ?? false,
    isHard:       raw.isHard ?? false,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all active void fissures from the worldstate.
 * Fallback order:
 *   1. Fresh Dexie cache  → return immediately, fromStaleCache: false
 *   2. Live worldstate fetch → store + return, fromStaleCache: false
 *   3. Stale Dexie cache  → return,            fromStaleCache: true
 *   4. No cache at all    → throw (first-launch offline)
 */
export async function fetchFissures(): Promise<WSFetchResult<Fissure[]>> {
  const cached = await getWsCache<RawFissure[]>(WS_CACHE_KEYS.fissures);

  if (cached && !cached.isExpired) {
    const data = cached.data.filter(r => !r.expired).map(r => rawToFissure(r, cached.cachedAt));
    return { data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws   = await fetchWorldstate();
    const raws = (ws['fissures'] ?? []) as RawFissure[];

    await setWsCache(WS_CACHE_KEYS.fissures, raws, CACHE_TTL_MS);

    const now  = Date.now();
    const data = raws.filter(r => !r.expired).map(r => rawToFissure(r, now));
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) {
      const data = cached.data.filter(r => !r.expired).map(r => rawToFissure(r, cached.cachedAt));
      return { data, cachedAt: cached.cachedAt, fromStaleCache: true };
    }
    throw new Error(
      'No fissure data available. Connect to a network to initialize Void Reliquaries.'
    );
  }
}
