/**
 * useSolarRailFeed — composite Solar Rail Feed subscriber (Phase D.4).
 *
 * Reads ParsedWorldstate from the V2 worldstate store via useWorldstate(),
 * fans out into the eleven domain streams the page renders. Where the V2
 * ParsedWorldstate doesn't expose a stream (Darvo daily deals, Steel Path
 * endless rotation), we return empty / null and the page's conditional
 * sections hide gracefully — no shape changes propagate to the UI.
 *
 * Migration notes:
 *   • Legacy hook subscribed to `db.cache.get('worldstate_master')` and
 *     parsed raw warframestat.us records into the legacy domain shapes.
 *   • V2 ParsedWorldstate gives us alerts, invasions, sortie, archonHunt,
 *     baro, news, persistentEnemies — all typed and Unix-ms.
 *   • Sortie / ArchonHunt: V2 Sortie has missionTypes/modifiers as parallel
 *     arrays; we zip them into the legacy `variants[{missionType, modifier…}]`
 *     shape that ascensionService and SortieCard expect. ISO `expiry` is
 *     synthesised from the Unix-ms field via toISO().
 *   • Persistent enemies: V2 carries name/location/level only. We synthesise
 *     a stable id from the name and default the health/state flags so the
 *     existing PersistentEnemyCard renders the boss banner without crashing.
 *   • Darvo / Steel Path / void traders array: V2 doesn't surface these.
 *     The page treats them as "if present, render"; empty values hide the
 *     respective sections cleanly. A future Worker enhancement can carry
 *     these through if/when needed.
 *
 * The return signature matches the legacy useSolarRailFeed exactly so the
 * Solar Rail Feed page does not need any changes.
 */

import { useMemo } from 'react';
import {
  computeAlertStatus,
  computeInvasionStatus,
  computeVoidTraderStatus,
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
import {
  apiToSortieRaw,
  apiToArchonHuntRaw,
} from '@/core/services/worldstateAdapters';
import type {
  Alert,
  AlertStatus,
  DarvoDealStatus,
  Invasion,
  InvasionStatus,
  NewsItem,
  PersistentEnemy,
  PersistentEnemyStatus,
  SteelPathStatus,
  VoidTrader,
  VoidTraderStatus,
} from '@/core/domain/railFeed';
import type {
  SortieStatus,
  ArchonHuntStatus,
} from '@/core/domain/ascension';
import type {
  Alert as ApiAlert,
  Invasion as ApiInvasion,
  BaroInfo,
  PersistentEnemy as ApiPersistentEnemy,
  NewsItem as ApiNewsItem,
} from '@/core/domain/tennoplanApi';
import { useGameClock } from '@/hooks/useGameClock';
import { useWorldstate } from '@/hooks/useWorldstate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a "10–25" range string into [min, max]. Falls back to [0, 0] when
 *  the format is unexpected — alert level is decorative metadata. */
function parseLevelRange(range: string): { min: number; max: number } {
  const m = range.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return { min: 0, max: 0 };
  return { min: Number(m[1]) || 0, max: Number(m[2]) || 0 };
}

/** Stable id derived from a string source — used when V2 omits an explicit
 *  id field (persistent enemies are identified by name in the V2 contract). */
function stableId(input: string): string {
  // Lowercase + strip non-word chars; collisions across distinct names are
  // extremely unlikely for Warframe enemy / boss labels.
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// V2 → legacy domain adapters (railFeed-specific shapes only;
// shared sortie/archon adapters live in worldstateAdapters)
// ---------------------------------------------------------------------------

function apiToAlert(raw: ApiAlert, fetchedAt: number): Alert {
  const { min, max } = parseLevelRange(raw.level);
  return {
    id:               raw.id,
    node:             raw.node,
    missionType:      raw.missionType,
    faction:          '', // V2 contract drops faction — pageant blank rather than guess
    reward:           raw.reward ?? '',
    rewardCredits:    0,
    minLevel:         min,
    maxLevel:         max,
    nightmare:        false,
    archwingRequired: false,
    activationMs:     raw.expiry - 60 * 60_000, // synthesised: 60-min default alert window
    expiryMs:         raw.expiry,
    fetchedAt,
  };
}

function apiToInvasion(raw: ApiInvasion, fetchedAt: number): Invasion {
  return {
    id:               raw.id,
    node:             raw.node,
    desc:             '',
    attackerReward:   raw.attackerReward ?? '',
    defenderReward:   raw.defenderReward ?? '',
    attackerCredits:  0,
    defenderCredits:  0,
    attackingFaction: raw.attacking,
    defendingFaction: raw.defending,
    completion:       raw.progress,
    vsInfestation:    raw.vsInfestation ?? false,
    activationMs:     raw.expiry ? raw.expiry - 24 * 60 * 60_000 : fetchedAt, // synth
    fetchedAt,
  };
}

function apiToVoidTrader(raw: BaroInfo, fetchedAt: number): VoidTrader {
  return {
    id:           raw.id,
    character:    raw.name,
    location:     raw.location ?? '',
    inventory:    (raw.inventory ?? []).map(i => ({
      item:    i.name,
      ducats:  i.ducats,
      credits: i.credits,
    })),
    activationMs: raw.arrivalTime ?? 0,
    expiryMs:     raw.departureTime ?? 0,
    active:       raw.presence === 'at_location',
    fetchedAt,
  };
}

function apiToPersistentEnemy(raw: ApiPersistentEnemy, fetchedAt: number): PersistentEnemy {
  return {
    id:           stableId(raw.name),
    agentType:    raw.name,
    typeKey:      raw.name,
    health:       100,         // V2 doesn't surface health; PersistentEnemyCard tolerates this
    isDiscovered: true,
    isDestroyed:  false,
    lastNode:     raw.location,
    location:     raw.location,
    active:       true,
    fetchedAt,
  };
}

function apiToNewsItem(raw: ApiNewsItem, fetchedAt: number): NewsItem {
  return {
    id:        raw.id,
    headline:  raw.title,
    link:      raw.url ?? '',
    imageLink: '',
    dateMs:    raw.date,
    isUpdate:  false,
    isPrime:   false,
    isStream:  false,
    fetchedAt,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Composite subscriber for the Solar Rail Feed tab. Reads a single ParsedWorldstate
 * and fans out into the domain shapes the page UI expects. Empty arrays / null
 * for streams the V2 contract doesn't surface (Darvo deals, Steel Path).
 */
export function useSolarRailFeed() {
  const { data: ws, lastSync, isLoading, isError, isStale, ageMs, forceRefetch } =
    useWorldstate();

  // ── Shared global clock (no per-hook setInterval) ─────────────────────
  const now = useGameClock();

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

    const fetchedAt = lastSync || now;

    const alerts    = (ws.alerts             ?? []).map(a => apiToAlert(a, fetchedAt));
    const invasions = (ws.invasions          ?? []).filter(i => !i.completed).map(i => apiToInvasion(i, fetchedAt));
    const enemies   = (ws.persistentEnemies  ?? []).map(e => apiToPersistentEnemy(e, fetchedAt));
    const news      = (ws.news               ?? []).slice(0, 10).map(n => apiToNewsItem(n, fetchedAt));
    const trader    = ws.baro ? apiToVoidTrader(ws.baro, fetchedAt) : null;
    const sortieRaw = ws.sortie     ? apiToSortieRaw(ws.sortie)         : null;
    const archonRaw = ws.archonHunt ? apiToArchonHuntRaw(ws.archonHunt) : null;

    const activeAlerts  = filterActiveAlerts(alerts, now);
    const activeEnemies = filterActiveEnemies(enemies);

    return {
      alertStatuses:    sortAlertsByExpiry(activeAlerts).map(a => computeAlertStatus(a, now)),
      invasionStatuses: sortInvasionsByCompletion(invasions).map(computeInvasionStatus),
      darvoDealStatuses:[] as DarvoDealStatus[], // V2 doesn't expose Darvo deals
      voidTraderStatus:  trader ? computeVoidTraderStatus(trader, now) : null,
      steelPathStatus:   null as SteelPathStatus | null, // V2 doesn't expose Steel Path rotation
      enemyStatuses:    activeEnemies.map(computePersistentEnemyStatus),
      newsItems:        sortAndTrimNews(news),
      sortieStatus:      sortieRaw ? computeSortieStatus(sortieRaw, now) : null,
      archonHuntStatus:  archonRaw ? computeArchonHuntStatus(archonRaw, now) : null,
    };
  }, [ws, lastSync, now]);

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
    isError,
    isStale,
    hasEverLoaded: !isLoading,
    cacheAgeMs:    Number.isFinite(ageMs) ? ageMs : 0,
    lastSync,
    now,
    forceRefetch,
  };
}
