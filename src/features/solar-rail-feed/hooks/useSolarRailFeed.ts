import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { SyncService } from '@/services/SyncService';
import { getCacheAgeMs } from '@/core/services/WorldstateService';
import {
  computeAlertStatus,
  computeInvasionStatus,
  computeDarvoDealStatus,
  computeVoidTraderStatus,
  computeSteelPathStatus,
  computePersistentEnemyStatus,
  filterActiveAlerts,
  filterActiveEnemies,
  sortAlertsByExpiry,
  sortInvasionsByCompletion,
  sortAndTrimNews,
} from '@/core/services/railService';
import {
  computeSortieStatus,
  computeArchonHuntStatus,
} from '@/core/services/ascensionService';
import type {
  Alert,
  AlertStatus,
  DarvoDeal,
  DarvoDealStatus,
  Invasion,
  InvasionStatus,
  NewsItem,
  PersistentEnemy,
  PersistentEnemyStatus,
  SteelPath,
  SteelPathStatus,
  VoidTrader,
  VoidTraderStatus,
  RawAlert,
  RawDarvoDeal,
  RawInvasion,
  RawNewsItem,
  RawPersistentEnemy,
  RawSteelPath,
  RawVoidTrader,
} from '@/core/domain/railFeed';
import type { SortieRaw, ArchonHuntRaw, SortieStatus, ArchonHuntStatus } from '@/core/domain/ascension';

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
// Hook
// ---------------------------------------------------------------------------

/**
 * Composite subscriber for the Solar Rail Feed tab.
 * Reads a single worldstate_master entry and fans out to 9 data streams.
 * No TanStack Query — useLiveQuery re-renders whenever SyncService writes.
 */
export function useSolarRailFeed() {
  const wsEntry = useLiveQuery(
    () => db.cache.get('worldstate_master').then(e => e ?? null),
    []
  );

  const isLoading = wsEntry === undefined;
  const ws        = (wsEntry?.data ?? null) as Record<string, unknown> | null;
  const cachedAt  = wsEntry?.updatedAt ?? 0;
  const isStale   = wsEntry ? wsEntry.expiresAt < Date.now() : false;

  // ── 1-second clock ────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Map + derive ──────────────────────────────────────────────────────
  const {
    alertStatuses,
    invasionStatuses,
    darvoDealStatuses,
    voidTraderStatus,
    steelPathStatus,
    enemyStatuses,
    newsItems,
    sortieStatus,
    archonHuntStatus,
  } = useMemo(() => {
    const empty = {
      alertStatuses:    [] as AlertStatus[],
      invasionStatuses: [] as InvasionStatus[],
      darvoDealStatuses:[] as DarvoDealStatus[],
      voidTraderStatus:  null as VoidTraderStatus | null,
      steelPathStatus:   null as SteelPathStatus | null,
      enemyStatuses:    [] as PersistentEnemyStatus[],
      newsItems:        [] as NewsItem[],
      sortieStatus:      null as SortieStatus | null,
      archonHuntStatus:  null as ArchonHuntStatus | null,
    };

    if (!ws) return empty;

    const rawAlerts   = ((ws['alerts']            ?? []) as RawAlert[]).filter(r => !(r as { expired?: boolean }).expired);
    const rawInvasions= ((ws['invasions']          ?? []) as RawInvasion[]).filter(r => !(r as { completed?: boolean }).completed);
    const rawDarvo    = (ws['dailyDeals']          ?? []) as RawDarvoDeal[];
    const rawTraders  = (ws['voidTraders']         ?? []) as RawVoidTrader[];
    const rawSteelPath= ws['steelPath']            as RawSteelPath | undefined;
    const rawEnemies  = ((ws['persistentEnemies']  ?? []) as RawPersistentEnemy[]).filter(r => !r.isDestroyed);
    const rawNews     = (ws['news']                ?? []) as RawNewsItem[];
    const rawSortie   = ws['sortie']               as SortieRaw | undefined;
    const rawArchon   = ws['archonHunt']           as ArchonHuntRaw | undefined;

    const alerts    = rawAlerts.map(r => rawToAlert(r, cachedAt));
    const invasions = rawInvasions.map(r => rawToInvasion(r, cachedAt));
    const darvo     = rawDarvo.map(r => rawToDarvoDeal(r, cachedAt));
    const trader    = rawTraders[0] ? rawToVoidTrader(rawTraders[0], cachedAt) : null;
    const sp        = rawSteelPath ? rawToSteelPath(rawSteelPath, cachedAt) : null;
    const enemies   = rawEnemies.map(r => rawToPersistentEnemy(r, cachedAt));
    const news      = rawNews.slice(0, 10).map(r => rawToNewsItem(r, cachedAt));

    const activeAlerts  = filterActiveAlerts(alerts, now);
    const activeEnemies = filterActiveEnemies(enemies);

    return {
      alertStatuses:    sortAlertsByExpiry(activeAlerts).map(a => computeAlertStatus(a, now)),
      invasionStatuses: sortInvasionsByCompletion(invasions).map(computeInvasionStatus),
      darvoDealStatuses:darvo.map(d => computeDarvoDealStatus(d, now)),
      voidTraderStatus:  trader ? computeVoidTraderStatus(trader, now) : null,
      steelPathStatus:   sp ? computeSteelPathStatus(sp, now) : null,
      enemyStatuses:    activeEnemies.map(computePersistentEnemyStatus),
      newsItems:        sortAndTrimNews(news),
      sortieStatus:      rawSortie ? computeSortieStatus(rawSortie, now) : null,
      archonHuntStatus:  rawArchon ? computeArchonHuntStatus(rawArchon, now) : null,
    };
  }, [ws, cachedAt, now]);

  // ── Force refresh ─────────────────────────────────────────────────────
  async function forceRefetch() {
    await SyncService.performSync(true);
  }

  return {
    alertStatuses,
    invasionStatuses,
    darvoDealStatuses,
    voidTraderStatus,
    steelPathStatus,
    enemyStatuses,
    newsItems,
    sortieStatus,
    archonHuntStatus,
    totalAlerts:    alertStatuses.length,
    totalInvasions: invasionStatuses.length,
    isLoading,
    isError:        !isLoading && wsEntry === null,
    isStale,
    hasEverLoaded:  !isLoading,
    cacheAgeMs:     getCacheAgeMs(cachedAt || now, now),
    lastSync:       cachedAt,
    now,
    forceRefetch,
  };
}
