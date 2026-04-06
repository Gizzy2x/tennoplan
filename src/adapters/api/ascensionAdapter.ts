import { db } from '../storage/db';
import type { NightwaveChallengeRaw, NightwaveRaw, SortieRaw, ArchonHuntRaw } from '../../core/domain/ascension';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const NW_ENDPOINT           = 'https://api.warframestat.us/pc/nightwave';
const SORTIE_ENDPOINT       = 'https://api.warframestat.us/pc/sortie';
const ARCHON_HUNT_ENDPOINT  = 'https://api.warframestat.us/pc/archonHunt';
const CACHE_TTL_MS          = 300_000;   // 5 min — daily challenges
const ARCHON_HUNT_TTL_MS    = 3_600_000; // 1 h — weekly event

// ---------------------------------------------------------------------------
// Nightwave
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `fetchNightwaveWS` from `dailiesAdapter.ts` instead.
 * This legacy adapter uses direct `db.cache` access. The newer adapter uses
 * `worldstateCache.ts` with `WSFetchResult<T>` and `fromStaleCache` signals.
 */
export async function fetchNightwave(): Promise<{ challenges: NightwaveChallengeRaw[]; season: number; tag: string }> {
  const CACHE_KEY = 'nightwave:all';
  const now = Date.now();

  const cached = await db.cache.get(CACHE_KEY);
  if (cached && cached.expiresAt > now) {
    return cached.data as { challenges: NightwaveChallengeRaw[]; season: number; tag: string };
  }

  try {
    const res = await fetch(NW_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: NightwaveRaw = await res.json();

    // Normalize standing to a safe number on ingestion.
    // Warframe Nightwave API sometimes omits or returns non-numeric standing
    // fields between seasons or on first load — Number(undefined) = NaN, so
    // we coerce with || 0 here so the rest of the pipeline never sees NaN.
    const result = {
      challenges: (raw.activeChallenges ?? []).map(c => ({
        ...c,
        reputation: Number(c.reputation) || 0,
      })),
      season: raw.season ?? 0,
      tag:    raw.tag ?? '',
    };

    await db.cache.put({
      key:       CACHE_KEY,
      data:      result,
      expiresAt: now + CACHE_TTL_MS,
      updatedAt: now,
    });

    return result;
  } catch {
    if (cached) {
      return cached.data as { challenges: NightwaveChallengeRaw[]; season: number; tag: string };
    }
    throw new Error(
      'No Nightwave data available. Connect to a network to initialize Ascension Registry.'
    );
  }
}

// ---------------------------------------------------------------------------
// Sortie
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `fetchSortieWS` from `dailiesAdapter.ts` instead.
 */
export async function fetchSortie(): Promise<SortieRaw> {
  const CACHE_KEY = 'sortie:daily';
  const now = Date.now();

  const cached = await db.cache.get(CACHE_KEY);
  if (cached && cached.expiresAt > now) {
    return cached.data as SortieRaw;
  }

  try {
    const res = await fetch(SORTIE_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: SortieRaw = await res.json();

    await db.cache.put({
      key:       CACHE_KEY,
      data:      raw,
      expiresAt: now + CACHE_TTL_MS,
      updatedAt: now,
    });

    return raw;
  } catch {
    if (cached) return cached.data as SortieRaw;
    throw new Error(
      'No Sortie data available. Connect to a network to initialize Ascension Registry.'
    );
  }
}

// ---------------------------------------------------------------------------
// Archon Hunt
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `fetchArchonHuntWS` from `dailiesAdapter.ts` instead.
 */
export async function fetchArchonHunt(): Promise<ArchonHuntRaw> {
  const CACHE_KEY = 'archonHunt:weekly';
  const now = Date.now();

  const cached = await db.cache.get(CACHE_KEY);
  if (cached && cached.expiresAt > now) {
    return cached.data as ArchonHuntRaw;
  }

  try {
    const res = await fetch(ARCHON_HUNT_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: ArchonHuntRaw = await res.json();

    await db.cache.put({
      key:       CACHE_KEY,
      data:      raw,
      expiresAt: now + ARCHON_HUNT_TTL_MS,
      updatedAt: now,
    });

    return raw;
  } catch {
    if (cached) return cached.data as ArchonHuntRaw;
    throw new Error(
      'No Archon Hunt data available. Connect to a network to load weekly data.'
    );
  }
}
