import { db } from '../storage/db';
import { fetchWorldstate } from '../api/worldstateFetcher';
import type { NightwaveChallengeRaw, NightwaveRaw, SortieRaw, ArchonHuntRaw } from '../../core/domain/ascension';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CACHE_TTL_MS       = 300_000;   // 5 min — daily challenges
const ARCHON_HUNT_TTL_MS = 3_600_000; // 1 h — weekly event

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
    const ws  = await fetchWorldstate();
    const raw = (ws['nightwave'] ?? {}) as NightwaveRaw;

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
    const ws  = await fetchWorldstate();
    const raw = (ws['sortie'] ?? {}) as SortieRaw;

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
    const ws  = await fetchWorldstate();
    const raw = (ws['archonHunt'] ?? {}) as ArchonHuntRaw;

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
