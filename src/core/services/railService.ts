// ---------------------------------------------------------------------------
// Solar Rail Feed — pure service functions
// No React, no Dexie, no fetch.
// Sortie / Archon Hunt computation stays in ascensionService.ts.
// ---------------------------------------------------------------------------

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
} from '../domain/railFeed';

// ---------------------------------------------------------------------------
// Faction / presentation colors
// ---------------------------------------------------------------------------

export const FACTION_COLOR: Record<string, string> = {
  Grineer:   '#f87171',
  Corpus:    '#60a5fa',
  Infested:  '#86efac',
  Corrupted: '#DBB058',
  Orokin:    '#DBB058',
};

export const DEFAULT_FACTION_COLOR = '#C6C6C7';

export function getFactionColor(faction: string): string {
  return FACTION_COLOR[faction] ?? DEFAULT_FACTION_COLOR;
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

export function computeAlertStatus(alert: Alert, now: number): AlertStatus {
  const msRemaining = Math.max(0, alert.expiryMs - now);
  return {
    alert,
    msRemaining,
    isExpired: msRemaining === 0,
  };
}

/** Keep alerts that have not yet expired locally (adapter strips expired:true,
 *  but alerts can expire between 30s polls). */
export function filterActiveAlerts(alerts: Alert[], now: number): Alert[] {
  return alerts.filter(a => a.expiryMs > now);
}

/** Soonest expiring first. */
export function sortAlertsByExpiry(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => a.expiryMs - b.expiryMs);
}

// ---------------------------------------------------------------------------
// Invasion
// ---------------------------------------------------------------------------

export function computeInvasionStatus(invasion: Invasion): InvasionStatus {
  return { invasion, completion: invasion.completion };
}

/** Most progressed first — most actionable intel at top. */
export function sortInvasionsByCompletion(invasions: Invasion[]): Invasion[] {
  return [...invasions].sort((a, b) => b.completion - a.completion);
}

// ---------------------------------------------------------------------------
// Darvo Deals
// ---------------------------------------------------------------------------

export function computeDarvoDealStatus(deal: DarvoDeal, now: number): DarvoDealStatus {
  const msRemaining = Math.max(0, deal.expiryMs - now);
  return {
    deal,
    msRemaining,
    isExpired: msRemaining === 0,
    stockPct:  deal.sold / Math.max(1, deal.total),
  };
}

// ---------------------------------------------------------------------------
// Void Trader
// ---------------------------------------------------------------------------

export function computeVoidTraderStatus(trader: VoidTrader, now: number): VoidTraderStatus {
  const isActive         = trader.active;
  const msUntilArrival   = isActive ? 0 : Math.max(0, trader.activationMs - now);
  const msUntilDeparture = isActive ? Math.max(0, trader.expiryMs - now) : 0;
  return { trader, msUntilArrival, msUntilDeparture, isActive };
}

// ---------------------------------------------------------------------------
// Steel Path
// ---------------------------------------------------------------------------

export function computeSteelPathStatus(sp: SteelPath, now: number): SteelPathStatus {
  const msRemaining = Math.max(0, sp.expiryMs - now);
  return { steelPath: sp, msRemaining, isExpired: msRemaining === 0 };
}

// ---------------------------------------------------------------------------
// Persistent Enemies
// ---------------------------------------------------------------------------

export function computePersistentEnemyStatus(enemy: PersistentEnemy): PersistentEnemyStatus {
  return { enemy };
}

/** Filter out destroyed enemies — only show active threats. */
export function filterActiveEnemies(enemies: PersistentEnemy[]): PersistentEnemy[] {
  return enemies.filter(e => !e.isDestroyed && e.active);
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/** Sort newest first and cap at max entries. */
export function sortAndTrimNews(items: NewsItem[], max = 5): NewsItem[] {
  return [...items].sort((a, b) => b.dateMs - a.dateMs).slice(0, max);
}
