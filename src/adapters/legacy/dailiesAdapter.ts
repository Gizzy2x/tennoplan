import { getWsCache, setWsCache, WS_CACHE_KEYS } from '../storage/worldstateCache';
import type { NightwaveChallengeRaw, NightwaveRaw, SortieRaw, ArchonHuntRaw } from '../../core/domain/ascension';
import type { WSFetchResult } from './types';

export type { WSFetchResult } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE            = 'https://api.warframestat.us/pc';
const NW_ENDPOINT     = `${BASE}/nightwave?language=en`;
const SORTIE_ENDPOINT = `${BASE}/sortie?language=en`;
const ARCHON_ENDPOINT = `${BASE}/archonHunt?language=en`;

const NW_TTL_MS     = 300_000;   // 5 min — daily challenge rotation
const ARCHON_TTL_MS = 3_600_000; // 1 h  — weekly event

// ---------------------------------------------------------------------------
// Nightwave
// ---------------------------------------------------------------------------

export type NightwavePayload = {
  challenges: NightwaveChallengeRaw[];
  season:     number;
  tag:        string;
};

/**
 * Fetch active Nightwave challenges.
 * Fallback order:
 *   1. Fresh Dexie cache  → return immediately, fromStaleCache: false
 *   2. Live network fetch → store + return,     fromStaleCache: false
 *   3. Stale Dexie cache  → return,             fromStaleCache: true
 *   4. No cache at all    → throw (first-launch offline)
 */
export async function fetchNightwaveWS(): Promise<WSFetchResult<NightwavePayload>> {
  const cached = await getWsCache<NightwavePayload>(WS_CACHE_KEYS.nightwave);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const res = await fetch(NW_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: NightwaveRaw = await res.json();

    const data: NightwavePayload = {
      challenges: (raw.activeChallenges ?? []).map(c => ({
        ...c,
        reputation: Number(c.reputation) || 0,
      })),
      season: raw.season ?? 0,
      tag:    raw.tag    ?? '',
    };

    await setWsCache(WS_CACHE_KEYS.nightwave, data, NW_TTL_MS);
    return { data, cachedAt: Date.now(), fromStaleCache: false };
  } catch {
    if (cached) {
      return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    }
    throw new Error(
      'No Nightwave data available. Connect to a network to initialize Dailies & Weeklies.'
    );
  }
}

// ---------------------------------------------------------------------------
// Sortie
// ---------------------------------------------------------------------------

export async function fetchSortieWS(): Promise<WSFetchResult<SortieRaw>> {
  const cached = await getWsCache<SortieRaw>(WS_CACHE_KEYS.sortie);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const res = await fetch(SORTIE_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: SortieRaw = await res.json();

    await setWsCache(WS_CACHE_KEYS.sortie, raw, NW_TTL_MS);
    return { data: raw, cachedAt: Date.now(), fromStaleCache: false };
  } catch {
    if (cached) {
      return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    }
    throw new Error('No Sortie data available. Connect to a network to load daily data.');
  }
}

// ---------------------------------------------------------------------------
// Archon Hunt
// ---------------------------------------------------------------------------

export async function fetchArchonHuntWS(): Promise<WSFetchResult<ArchonHuntRaw>> {
  const cached = await getWsCache<ArchonHuntRaw>(WS_CACHE_KEYS.archon);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const res = await fetch(ARCHON_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: ArchonHuntRaw = await res.json();

    await setWsCache(WS_CACHE_KEYS.archon, raw, ARCHON_TTL_MS);
    return { data: raw, cachedAt: Date.now(), fromStaleCache: false };
  } catch {
    if (cached) {
      return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    }
    throw new Error('No Archon Hunt data available. Connect to a network to load weekly data.');
  }
}
