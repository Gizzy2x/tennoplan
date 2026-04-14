/**
 * Drop Rate Service — pure functions, zero React, zero side-effects.
 *
 * Data source: https://drops.warframestat.us/data/all.json
 * Cached in Dexie cache table under key DROP_CACHE_KEY (24-hour TTL).
 *
 * Structure of the drops payload (simplified — we only model what UI needs):
 *   { missionRewards, relics, transientRewards, modLocations,
 *     enemyModTables, sortieRewards, keyRewards, <bounty tables> }
 *
 * Each location entry has: { drops: DropEntry[] }
 * Each DropEntry has: { item: string; chance: number; rarity: string }
 */

export const DROPS_API_URL = 'https://drops.warframestat.us/data/all.json';
export const DROP_CACHE_KEY = 'drop:all';
export const DROP_CACHE_TTL = 86_400_000; // 24 hours

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DropEntry {
  /** Display name of the item */
  item:   string;
  /** Drop chance as a percentage (0–100) */
  chance: number;
  /** "Common" | "Uncommon" | "Rare" | "Legendary" */
  rarity: string;
}

export interface DropLocation {
  /** Human-readable location name (mission node, relic, enemy, etc.) */
  location: string;
  /** Drop type descriptor provided by the API ("Mission Reward", "Relic", etc.) */
  type:     string;
  drops:    DropEntry[];
}

/** The full parsed payload from drops.warframestat.us */
export interface AllDropData {
  /**
   * Flat array of every location that can drop items, normalised from
   * all API sub-tables (missionRewards, relics, transientRewards, etc.)
   */
  locations: DropLocation[];
  /** Unix timestamp (ms) when this data was fetched */
  fetchedAt: number;
}

// ─── Internal normaliser ─────────────────────────────────────────────────────

interface RawDropEntry  { item?: string; chance?: number; rarity?: string }
interface RawDropGroup  { drops?: RawDropEntry[] }
interface RawMissionNode extends RawDropGroup { gameMode?: string; isEvent?: boolean }
interface RawRelicTier  { tier?: string; relicName?: string; state?: string; drops?: RawDropEntry[] }
interface RawDropPayload {
  missionRewards?:         Record<string, Record<string, RawMissionNode>>;
  relics?:                 RawRelicTier[];
  transientRewards?:       Array<{ objectiveName?: string; drops?: RawDropEntry[] }>;
  modLocations?:           Array<{ enemyName?: string; drops?: RawDropEntry[] }>;
  enemyModTables?:         Array<{ enemyName?: string; drops?: RawDropEntry[] }>;
  sortieRewards?:          Array<{ drops?: RawDropEntry[] }>;
  keyRewards?:             Array<{ name?: string; drops?: RawDropEntry[] }>;
  cetusBountyRewards?:     Array<{ bountyLevel?: string; drops?: RawDropEntry[] }>;
  solarisBountyRewards?:   Array<{ bountyLevel?: string; drops?: RawDropEntry[] }>;
  deimosRewardTable?:      Array<{ bountyLevel?: string; drops?: RawDropEntry[] }>;
  zarimanBountyRewards?:   Array<{ bountyLevel?: string; drops?: RawDropEntry[] }>;
}

function normaliseDrops(raw: RawDropEntry[]): DropEntry[] {
  return raw
    .filter(d => d.item)
    .map(d => ({
      item:   d.item!.trim(),
      chance: d.chance ?? 0,
      rarity: d.rarity ?? 'Unknown',
    }));
}

export function normalisePayload(raw: RawDropPayload, fetchedAt: number): AllDropData {
  const locations: DropLocation[] = [];

  // Mission rewards — nested: { location: { gameMode: { drops } } }
  if (raw.missionRewards) {
    for (const [loc, gameModes] of Object.entries(raw.missionRewards)) {
      for (const [mode, node] of Object.entries(gameModes)) {
        if (node.drops?.length) {
          locations.push({ location: `${loc} (${mode})`, type: 'Mission Reward', drops: normaliseDrops(node.drops) });
        }
      }
    }
  }

  // Relics
  for (const r of raw.relics ?? []) {
    if (r.drops?.length && r.tier && r.relicName) {
      locations.push({
        location: `${r.tier} ${r.relicName} (${r.state ?? 'Intact'})`,
        type: 'Relic',
        drops: normaliseDrops(r.drops),
      });
    }
  }

  // Transient rewards (Nightmare, Sortie variants, etc.)
  for (const t of raw.transientRewards ?? []) {
    if (t.drops?.length && t.objectiveName) {
      locations.push({ location: t.objectiveName, type: 'Transient Reward', drops: normaliseDrops(t.drops) });
    }
  }

  // Mod locations (enemies)
  for (const m of raw.modLocations ?? []) {
    if (m.drops?.length && m.enemyName) {
      locations.push({ location: m.enemyName, type: 'Enemy Drop', drops: normaliseDrops(m.drops) });
    }
  }

  // Enemy mod tables
  for (const m of raw.enemyModTables ?? []) {
    if (m.drops?.length && m.enemyName) {
      locations.push({ location: m.enemyName, type: 'Enemy Mod Table', drops: normaliseDrops(m.drops) });
    }
  }

  // Bounty tables
  const bountyTypes: [keyof RawDropPayload, string][] = [
    ['cetusBountyRewards',   'Cetus Bounty'],
    ['solarisBountyRewards', 'Solaris Bounty'],
    ['deimosRewardTable',    'Deimos Bounty'],
    ['zarimanBountyRewards', 'Zariman Bounty'],
  ];
  for (const [key, label] of bountyTypes) {
    for (const b of (raw[key] as Array<{ bountyLevel?: string; drops?: RawDropEntry[] }> ?? [])) {
      if (b.drops?.length) {
        locations.push({ location: b.bountyLevel ?? label, type: label, drops: normaliseDrops(b.drops) });
      }
    }
  }

  return { locations, fetchedAt };
}

// ─── Pure lookup functions (called by the hook) ───────────────────────────────

/**
 * Returns every location where a given item name appears (case-insensitive substring).
 */
export function findDropsByItem(data: AllDropData, itemName: string): DropLocation[] {
  const lower = itemName.toLowerCase();
  return data.locations
    .filter(loc => loc.drops.some(d => d.item.toLowerCase().includes(lower)))
    .map(loc => ({
      ...loc,
      // Only include the matching drops for this item
      drops: loc.drops.filter(d => d.item.toLowerCase().includes(lower)),
    }));
}

/**
 * Returns all drops available at a given location (exact name match, case-insensitive).
 */
export function findDropsByLocation(data: AllDropData, locationName: string): DropLocation | null {
  const lower = locationName.toLowerCase();
  return data.locations.find(l => l.location.toLowerCase() === lower) ?? null;
}

/**
 * Returns all relic locations that drop a given item, sorted by chance descending.
 */
export function findRelicDropsByItem(data: AllDropData, itemName: string): DropLocation[] {
  return findDropsByItem(data, itemName)
    .filter(l => l.type === 'Relic')
    .sort((a, b) => {
      const aMax = Math.max(...a.drops.map(d => d.chance));
      const bMax = Math.max(...b.drops.map(d => d.chance));
      return bMax - aMax;
    });
}
