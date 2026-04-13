import { getWsCache, setWsCache, WS_CACHE_KEYS } from '../storage/worldstateCache';
import type { SimarisData } from '../../core/domain/simaris';
import type { WSFetchResult } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENDPOINT     = 'https://api.warframestat.us/pc/simaris';
const CACHE_TTL_MS = 24 * 60 * 60_000; // 24h — Simaris target resets daily

// ---------------------------------------------------------------------------
// Raw API shape (partial — only what we consume)
// ---------------------------------------------------------------------------

interface RawSimaris {
  activeSynthesisTarget?: {
    name?:       string;
    type?:       string;
    isArchwing?: boolean;
    isBoss?:     boolean;
  } | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the active Simaris synthesis target for today. The API provides no
 * expiry timestamp — the target resets on the daily reset cycle (~UTC midnight).
 * We cache for 24 h and display "Resets Daily" rather than a countdown.
 */
export async function fetchSimaris(): Promise<WSFetchResult<SimarisData>> {
  const cached = await getWsCache<SimarisData>(WS_CACHE_KEYS.simaris);

  // 1. Fresh cache
  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  // 2. Live fetch
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: RawSimaris = await res.json();

    const t = raw.activeSynthesisTarget;
    const data: SimarisData = {
      activeSynthesisTarget: t
        ? {
            name:       t.name       ?? 'Unknown Target',
            type:       t.type       ?? 'synthesis',
            isArchwing: t.isArchwing ?? false,
            isBoss:     t.isBoss     ?? false,
          }
        : null,
    };

    await setWsCache(WS_CACHE_KEYS.simaris, data, CACHE_TTL_MS);
    return { data, cachedAt: Date.now(), fromStaleCache: false };

  } catch {
    // 3. Stale cache
    if (cached) {
      return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    }
    // 4. No data at all
    throw new Error(
      'No Simaris data available. Connect to a network to initialize Simaris Sanctuary.'
    );
  }
}
