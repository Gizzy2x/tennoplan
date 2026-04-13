import { getWsCache, setWsCache, WS_CACHE_KEYS } from '../storage/worldstateCache';
import { fetchWorldstate } from '../api/worldstateFetcher';
import type { SyndicateMission, SyndicateJob } from '../../core/domain/syndicates';
import type { WSFetchResult } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30 * 60_000; // 30 min

/**
 * Canonical display names as returned by the API.
 */
const WANTED_SYNDICATES = new Set([
  'Ostron',
  'Solaris United',
  'Entrati',
  'The Holdfasts',
]);

/**
 * API string → canonical name. Handles known typos / capitalisation variants.
 */
const SYNDICATE_ALIASES: Record<string, string> = {
  'ostron':          'Ostron',
  'solaris united':  'Solaris United',
  'entrati':         'Entrati',
  'the holdfasts':   'The Holdfasts',
  'holdfasts':       'The Holdfasts',
};

function canonicalizeName(raw: string): string {
  return SYNDICATE_ALIASES[raw.toLowerCase()] ?? raw;
}

// ---------------------------------------------------------------------------
// Raw API shapes (partial — only what we consume)
// ---------------------------------------------------------------------------

interface RawSyndicateJob {
  type?:           string;
  enemyLevels?:    [number, number];
  standingStages?: number[];
  rewardPool?:     string[];
}

interface RawSyndicateMission {
  id?:        string;
  syndicate?: string;
  expiry?:    string;
  jobs?:      RawSyndicateJob[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rawToJob(raw: RawSyndicateJob): SyndicateJob {
  return {
    type:           raw.type           ?? 'Unknown',
    enemyLevels:    raw.enemyLevels    ?? [0, 0],
    standingStages: raw.standingStages ?? [],
    rewardPool:     raw.rewardPool,
  };
}

function rawToMission(raw: RawSyndicateMission): SyndicateMission {
  const rawName  = raw.syndicate ?? '';
  const syndicate = canonicalizeName(rawName) || rawName || 'Unknown';
  const expiry    = raw.expiry ?? '';
  return {
    id:       raw.id        ?? syndicate,
    syndicate,
    expiry,
    expiryMs: expiry ? new Date(expiry).getTime() : 0,
    jobs:     (raw.jobs ?? []).map(rawToJob),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the four open-world syndicate mission rotations (Ostron, Solaris
 * United, Entrati, The Holdfasts). Uses the same 4-step offline-first pattern
 * as cyclesAdapter.
 */
export async function fetchSyndicateMissions():
    Promise<WSFetchResult<SyndicateMission[]>> {

  const cached = await getWsCache<SyndicateMission[]>(WS_CACHE_KEYS.syndicateMissions);

  // 1. Fresh cache
  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  // 2. Live fetch via shared worldstate endpoint
  try {
    const ws     = await fetchWorldstate();
    const rawAll = (ws['syndicateMissions'] ?? []) as RawSyndicateMission[];

    // Filter to open-world syndicates, normalize, deduplicate by syndicate name
    const seen = new Map<string, SyndicateMission>();
    for (const raw of rawAll) {
      const canonical = canonicalizeName(raw.syndicate ?? '');
      if (!WANTED_SYNDICATES.has(canonical)) continue;
      const mission  = rawToMission(raw);
      const existing = seen.get(canonical);
      if (!existing || mission.expiryMs > existing.expiryMs) {
        seen.set(canonical, mission);
      }
    }
    const data = Array.from(seen.values());

    await setWsCache(WS_CACHE_KEYS.syndicateMissions, data, CACHE_TTL_MS);
    return { data, cachedAt: Date.now(), fromStaleCache: false };

  } catch {
    // 3. Stale cache
    if (cached) {
      return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    }
    // 4. No data at all
    throw new Error(
      'No syndicate mission data available. Connect to a network to initialize Syndicate Dispatches.'
    );
  }
}
