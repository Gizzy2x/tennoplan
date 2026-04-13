// ---------------------------------------------------------------------------
// Solar Rail Feed adapter — offline-first fetch for worldstate data.
// Sortie / Archon Hunt are re-exported from dailiesAdapter (cache keys reused).
// All functions follow the same 4-step fallback chain as fissureAdapter.ts.
// Domain-mapped data is stored in cache (not raw) so pre-loads are type-safe.
// ---------------------------------------------------------------------------

import { getWsCache, setWsCache, WS_CACHE_KEYS } from '../storage/worldstateCache';
import { fetchWorldstate } from '../api/worldstateFetcher';
import type { WSFetchResult } from './types';
import type {
  Alert,
  DarvoDeal,
  Invasion,
  NewsItem,
  PersistentEnemy,
  RawAlert,
  RawDarvoDeal,
  RawInvasion,
  RawNewsItem,
  RawPersistentEnemy,
  RawSteelPath,
  RawVoidTrader,
  SteelPath,
  VoidTrader,
} from '../../core/domain/railFeed';

// Re-export so the hook has a single import point for all rail feed fetchers.
export { fetchSortieWS, fetchArchonHuntWS } from './dailiesAdapter';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TTL = {
  invasions:         60_000,   // 60 s
  alerts:            30_000,   // 30 s
  darvoDeals:        300_000,  // 5 min
  voidTrader:        60_000,   // 60 s
  steelPath:         300_000,  // 5 min
  persistentEnemies: 60_000,   // 60 s
  news:              300_000,  // 5 min
} as const;

// ---------------------------------------------------------------------------
// Mapping helpers (raw API → domain)
// ---------------------------------------------------------------------------

function rawToInvasion(raw: RawInvasion, fetchedAt: number): Invasion {
  return {
    id:               raw.id,
    node:             raw.node,
    desc:             raw.desc ?? '',
    attackerReward:   raw.attackerReward?.itemString ?? '',
    defenderReward:   raw.defenderReward?.itemString ?? '',
    attackerCredits:  raw.attackerReward?.credits ?? 0,
    defenderCredits:  raw.defenderReward?.credits ?? 0,
    attackingFaction: raw.attackingFaction ?? '',
    defendingFaction: raw.defendingFaction ?? '',
    completion:       raw.completion ?? 0,
    vsInfestation:    raw.vsInfestation ?? false,
    activationMs:     new Date(raw.activation).getTime(),
    fetchedAt,
  };
}

function rawToAlert(raw: RawAlert, fetchedAt: number): Alert {
  return {
    id:               raw.id,
    node:             raw.mission?.node ?? '',
    missionType:      raw.mission?.type ?? '',
    faction:          raw.mission?.faction ?? '',
    reward:           raw.mission?.reward?.itemString ?? '',
    rewardCredits:    raw.mission?.reward?.credits ?? 0,
    minLevel:         raw.mission?.minEnemyLevel ?? 0,
    maxLevel:         raw.mission?.maxEnemyLevel ?? 0,
    nightmare:        raw.mission?.nightmare ?? false,
    archwingRequired: raw.mission?.archwingRequired ?? false,
    activationMs:     new Date(raw.activation).getTime(),
    expiryMs:         new Date(raw.expiry).getTime(),
    fetchedAt,
  };
}

function rawToDarvoDeal(raw: RawDarvoDeal, fetchedAt: number): DarvoDeal {
  return {
    id:            raw.id,
    item:          raw.item ?? '',
    originalPrice: raw.originalPrice ?? 0,
    salePrice:     raw.salePrice ?? 0,
    discount:      raw.discount ?? 0,
    total:         raw.total ?? 1,
    sold:          raw.sold ?? 0,
    expiryMs:      new Date(raw.expiry).getTime(),
    fetchedAt,
  };
}

function rawToVoidTrader(raw: RawVoidTrader, fetchedAt: number): VoidTrader {
  return {
    id:           raw.id,
    character:    raw.character ?? "Baro Ki'Teer",
    location:     raw.location ?? '',
    inventory:    (raw.inventory ?? []).map(i => ({
      item:    i.item,
      ducats:  i.ducats,
      credits: i.credits,
    })),
    activationMs: new Date(raw.activation).getTime(),
    expiryMs:     new Date(raw.expiry).getTime(),
    active:       raw.active ?? false,
    fetchedAt,
  };
}

function rawToSteelPath(raw: RawSteelPath, fetchedAt: number): SteelPath {
  return {
    rewardName:   raw.currentReward?.name ?? '',
    rewardCost:   raw.currentReward?.cost ?? 15,
    activationMs: new Date(raw.activation).getTime(),
    expiryMs:     new Date(raw.expiry).getTime(),
    rotation:     (raw.rotation ?? []).map(r => ({ name: r.name, cost: r.cost })),
    fetchedAt,
  };
}

function rawToPersistentEnemy(raw: RawPersistentEnemy, fetchedAt: number): PersistentEnemy {
  return {
    id:           raw.id,
    agentType:    raw.agentType ?? '',
    typeKey:      raw.typeKey ?? '',
    health:       raw.health ?? 100,
    isDiscovered: raw.isDiscovered ?? false,
    isDestroyed:  raw.isDestroyed ?? false,
    lastNode:     raw.lastNode ?? '',
    location:     raw.location ?? '',
    active:       raw.active ?? true,
    fetchedAt,
  };
}

function rawToNewsItem(raw: RawNewsItem, fetchedAt: number): NewsItem {
  return {
    id:        raw.id,
    headline:  raw.translations?.en ?? raw.message ?? '',
    link:      raw.link ?? '',
    imageLink: raw.imageLink ?? '',
    dateMs:    new Date(raw.date).getTime(),
    isUpdate:  raw.update ?? false,
    isPrime:   raw.prime ?? false,
    isStream:  raw.stream ?? false,
    fetchedAt,
  };
}

// ---------------------------------------------------------------------------
// Public fetch functions
// All use fetchWorldstate() as the live-data source.
// All store domain-mapped data in Dexie so pre-loads are type-safe.
// ---------------------------------------------------------------------------

/**
 * Fetch active invasions (excludes completed ones).
 * Fallback: fresh cache → live worldstate → stale cache → throw
 */
export async function fetchInvasions(): Promise<WSFetchResult<Invasion[]>> {
  const cached = await getWsCache<Invasion[]>(WS_CACHE_KEYS.invasions);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws   = await fetchWorldstate();
    const raws = (ws['invasions'] ?? []) as RawInvasion[];
    const now  = Date.now();
    const data = raws.filter(r => !r.completed).map(r => rawToInvasion(r, now));
    await setWsCache(WS_CACHE_KEYS.invasions, data, TTL.invasions);
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    throw new Error('No invasion data available. Connect to a network to initialize Solar Rail Feed.');
  }
}

/** Fetch active time-limited alerts (excludes expired ones). */
export async function fetchAlerts(): Promise<WSFetchResult<Alert[]>> {
  const cached = await getWsCache<Alert[]>(WS_CACHE_KEYS.alerts);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws   = await fetchWorldstate();
    const raws = (ws['alerts'] ?? []) as RawAlert[];
    const now  = Date.now();
    const data = raws.filter(r => !r.expired).map(r => rawToAlert(r, now));
    await setWsCache(WS_CACHE_KEYS.alerts, data, TTL.alerts);
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    throw new Error('No alert data available. Connect to a network to initialize Solar Rail Feed.');
  }
}

/** Fetch Darvo's daily deals. */
export async function fetchDarvoDeals(): Promise<WSFetchResult<DarvoDeal[]>> {
  const cached = await getWsCache<DarvoDeal[]>(WS_CACHE_KEYS.darvoDeals);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws   = await fetchWorldstate();
    // worldstate handler exports the field as "dailyDeals"
    const raws = (ws['dailyDeals'] ?? []) as RawDarvoDeal[];
    const now  = Date.now();
    const data = raws.map(r => rawToDarvoDeal(r, now));
    await setWsCache(WS_CACHE_KEYS.darvoDeals, data, TTL.darvoDeals);
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    throw new Error('No Darvo deal data available. Connect to a network to initialize Solar Rail Feed.');
  }
}

/** Fetch Void Trader (Baro Ki'Teer) status and inventory. */
export async function fetchVoidTrader(): Promise<WSFetchResult<VoidTrader>> {
  const cached = await getWsCache<VoidTrader>(WS_CACHE_KEYS.voidTrader);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws = await fetchWorldstate();
    // worldstate handler exports as "voidTraders" (array) — take the first (Baro)
    const traders = (ws['voidTraders'] ?? []) as RawVoidTrader[];
    const raw = traders[0];
    if (!raw) throw new Error('No void trader in worldstate');
    const now  = Date.now();
    const data = rawToVoidTrader(raw, now);
    await setWsCache(WS_CACHE_KEYS.voidTrader, data, TTL.voidTrader);
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    throw new Error('No Void Trader data available. Connect to a network to initialize Solar Rail Feed.');
  }
}

/** Fetch current Steel Path incursion reward. */
export async function fetchSteelPath(): Promise<WSFetchResult<SteelPath>> {
  const cached = await getWsCache<SteelPath>(WS_CACHE_KEYS.steelPath);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws  = await fetchWorldstate();
    const raw = ws['steelPath'] as RawSteelPath | undefined;
    if (!raw) throw new Error('No steel path in worldstate');
    const now  = Date.now();
    const data = rawToSteelPath(raw, now);
    await setWsCache(WS_CACHE_KEYS.steelPath, data, TTL.steelPath);
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    throw new Error('No Steel Path data available. Connect to a network to initialize Solar Rail Feed.');
  }
}

/** Fetch active persistent enemies (Acolytes, Stalker, etc.). Excludes destroyed. */
export async function fetchPersistentEnemies(): Promise<WSFetchResult<PersistentEnemy[]>> {
  const cached = await getWsCache<PersistentEnemy[]>(WS_CACHE_KEYS.persistentEnemies);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws   = await fetchWorldstate();
    const raws = (ws['persistentEnemies'] ?? []) as RawPersistentEnemy[];
    const now  = Date.now();
    const data = raws.filter(r => !r.isDestroyed).map(r => rawToPersistentEnemy(r, now));
    await setWsCache(WS_CACHE_KEYS.persistentEnemies, data, TTL.persistentEnemies);
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    throw new Error('No persistent enemy data available. Connect to a network to initialize Solar Rail Feed.');
  }
}

/** Fetch in-game news feed (top 10 — service layer trims to 5). */
export async function fetchNews(): Promise<WSFetchResult<NewsItem[]>> {
  const cached = await getWsCache<NewsItem[]>(WS_CACHE_KEYS.news);

  if (cached && !cached.isExpired) {
    return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: false };
  }

  try {
    const ws   = await fetchWorldstate();
    const raws = (ws['news'] ?? []) as RawNewsItem[];
    const now  = Date.now();
    const data = raws.slice(0, 10).map(r => rawToNewsItem(r, now));
    await setWsCache(WS_CACHE_KEYS.news, data, TTL.news);
    return { data, cachedAt: now, fromStaleCache: false };
  } catch {
    if (cached) return { data: cached.data, cachedAt: cached.cachedAt, fromStaleCache: true };
    throw new Error('No news data available. Connect to a network to initialize Solar Rail Feed.');
  }
}
