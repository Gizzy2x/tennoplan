import { db } from '../storage/db';
import type { Fissure, FissureEnemy, FissureTier } from '../../core/domain/relics';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://api.warframestat.us/pc/fissures';
const CACHE_KEY = 'fissures:all';
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
 * Fetch all active void fissures from the API, with Dexie offline fallback.
 * Expired fissures (raw.expired === true) are dropped at the adapter boundary.
 */
export async function fetchFissures(): Promise<Fissure[]> {
  const now = Date.now();

  // Check cache first
  const cached = await db.cache.get(CACHE_KEY);
  if (cached && cached.expiresAt > now) {
    const raws = cached.data as RawFissure[];
    return raws
      .filter(r => !r.expired)
      .map(r => rawToFissure(r, cached.updatedAt));
  }

  // Attempt live fetch
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raws: RawFissure[] = await res.json();

    await db.cache.put({
      key:       CACHE_KEY,
      data:      raws,
      expiresAt: now + CACHE_TTL_MS,
      updatedAt: now,
    });

    return raws
      .filter(r => !r.expired)
      .map(r => rawToFissure(r, now));
  } catch {
    // Offline fallback — return cached even if expired
    if (cached) {
      const raws = cached.data as RawFissure[];
      return raws
        .filter(r => !r.expired)
        .map(r => rawToFissure(r, cached.updatedAt));
    }
    throw new Error(
      'No fissure data available. Connect to a network to initialize Void Reliquaries.'
    );
  }
}
