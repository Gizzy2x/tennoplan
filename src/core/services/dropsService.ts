/**
 * DropsService — pure business logic for normalizing and querying drop data.
 *
 * Input:  raw payload from drops.warframestat.us/data/all.json
 * Output: DropLocation[] ready for Dexie bulkPut.
 *
 * Lives in src/core/ — no React, no Dexie, no fetch.
 * Deterministic: same input produces the same locationKey output.
 */

import type {
  BountyLocation,
  DropLocation,
  DropReward,
  RotationTier,
} from '@/core/domain/drops';

// ─── Raw payload shapes (narrowly typed, defensive) ──────────────────────────

interface RawDropEntry {
  /** Mission/relic/enemy tables use `item`; bounty tables use `itemName`. */
  item?: string;
  itemName?: string;
  chance?: number;
  rarity?: string;
  /** Bounty stage label (bounty tables only). */
  stage?: string;
}

interface RawMissionNode {
  drops?: RawDropEntry[];
  gameMode?: string;
  isEvent?: boolean;
}

interface RawRelicTier {
  tier?: string;
  relicName?: string;
  state?: string;
  drops?: RawDropEntry[];
}

/**
 * Bounty entries may use EITHER a flat `drops` array (legacy/simple)
 * OR a `rewards` map keyed by "rotation A|B|C" (current/rotated).
 * The normalizer handles both shapes.
 */
interface RawBounty {
  bountyLevel?: string;
  drops?: RawDropEntry[];
  rewards?: Record<string, RawDropEntry[]>;
}

interface RawTransient {
  objectiveName?: string;
  drops?: RawDropEntry[];
}

interface RawNamed {
  name?: string;
  drops?: RawDropEntry[];
}

interface RawEnemy {
  enemyName?: string;
  drops?: RawDropEntry[];
}

interface RawSortie {
  rewardType?: string;
  drops?: RawDropEntry[];
}

export interface RawDropPayload {
  missionRewards?: Record<string, Record<string, RawMissionNode>>;
  relics?: RawRelicTier[];
  transientRewards?: RawTransient[];
  modLocations?: RawEnemy[];
  enemyModTables?: RawEnemy[];
  sortieRewards?: RawSortie[];
  keyRewards?: RawNamed[];
  cetusBountyRewards?: RawBounty[];
  solarisBountyRewards?: RawBounty[];
  // Upstream key names — Deimos/Zariman/Sanctum/1999 differ from the
  // Cetus/Solaris pattern. Sanctum + 1999 are static (single pool, no rotation).
  deimosRewards?: RawBounty[];
  zarimanRewards?: RawBounty[];
  entratiLabRewards?: RawBounty[];   // Sanctum Anatomica (Albrecht's Laboratories)
  hexRewards?: RawBounty[];          // Höllvania / 1999
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function normaliseRewards(raw: RawDropEntry[] | undefined): DropReward[] {
  if (!raw) return [];
  const out: DropReward[] = [];
  for (const d of raw) {
    const name = d.itemName ?? d.item;
    if (!name) continue;
    out.push({
      itemName: name.trim(),
      chance: typeof d.chance === 'number' ? d.chance : 0,
      rarity: d.rarity ?? 'Unknown',
      ...(d.stage ? { stage: d.stage } : {}),
    });
  }
  return out;
}

function parseRotationTier(key: string): RotationTier | undefined {
  // Accepts both legacy "Rotation A" and the current bare "A" rotation keys.
  const m = /^(?:rotation\s+)?([ABC])$/i.exec(key.trim());
  if (!m || !m[1]) return undefined;
  return m[1].toUpperCase() as RotationTier;
}

function parseMissionLocation(raw: string): { planet?: string; node?: string } {
  // Format: "Apollo (Mars)" → { node: "Apollo", planet: "Mars" }
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
  if (!m || !m[1] || !m[2]) return { node: raw };
  return { node: m[1].trim(), planet: m[2].trim() };
}

/** Stable key builder — pipe-joined fields with pipes escaped in values. */
function keyFrom(parts: Array<string | undefined>): string {
  return parts.map((p) => (p ?? '').replace(/\|/g, '/')).join('|');
}

// ─── Public: normaliseDropPayload ────────────────────────────────────────────

/**
 * Convert the raw drops.warframestat.us payload into Dexie-ready rows.
 * Pure function — safe to call synchronously in tests.
 */
export function normaliseDropPayload(
  raw: RawDropPayload,
  fetchedAt: number,
): DropLocation[] {
  const out: DropLocation[] = [];

  // 1. Mission rewards  ----------------------------------------------------
  if (raw.missionRewards) {
    for (const [locStr, gameModes] of Object.entries(raw.missionRewards)) {
      for (const [mode, node] of Object.entries(gameModes)) {
        const rewards = normaliseRewards(node.drops);
        if (rewards.length === 0) continue;
        const { planet, node: nodeName } = parseMissionLocation(locStr);
        out.push({
          locationKey: keyFrom(['mission', planet, nodeName, mode]),
          type: 'Mission Reward',
          displayName: `${locStr} — ${mode}`,
          rewards,
          planet,
          node: nodeName,
          missionType: mode,
          fetchedAt,
        });
      }
    }
  }

  // 2. Relics  -------------------------------------------------------------
  for (const r of raw.relics ?? []) {
    const rewards = normaliseRewards(r.drops);
    if (rewards.length === 0 || !r.tier || !r.relicName) continue;
    const state = r.state ?? 'Intact';
    out.push({
      locationKey: keyFrom(['relic', r.tier, r.relicName, state]),
      type: 'Relic',
      displayName: `${r.tier} ${r.relicName} (${state})`,
      rewards,
      relicTier: r.tier,
      relicName: r.relicName,
      relicState: state,
      fetchedAt,
    });
  }

  // 3. Transient rewards (Nightmare, Sortie variants)  ---------------------
  for (const t of raw.transientRewards ?? []) {
    const rewards = normaliseRewards(t.drops);
    if (rewards.length === 0 || !t.objectiveName) continue;
    out.push({
      locationKey: keyFrom(['transient', t.objectiveName]),
      type: 'Transient Reward',
      displayName: t.objectiveName,
      rewards,
      fetchedAt,
    });
  }

  // 4. Mod locations (enemies that drop mods)  -----------------------------
  for (const m of raw.modLocations ?? []) {
    const rewards = normaliseRewards(m.drops);
    if (rewards.length === 0 || !m.enemyName) continue;
    out.push({
      locationKey: keyFrom(['enemy', m.enemyName]),
      type: 'Enemy Drop',
      displayName: m.enemyName,
      rewards,
      fetchedAt,
    });
  }

  // 5. Enemy mod tables  ---------------------------------------------------
  for (const m of raw.enemyModTables ?? []) {
    const rewards = normaliseRewards(m.drops);
    if (rewards.length === 0 || !m.enemyName) continue;
    out.push({
      locationKey: keyFrom(['enemyMod', m.enemyName]),
      type: 'Enemy Mod Table',
      displayName: m.enemyName,
      rewards,
      fetchedAt,
    });
  }

  // 6. Sortie rewards  -----------------------------------------------------
  for (const s of raw.sortieRewards ?? []) {
    const rewards = normaliseRewards(s.drops);
    if (rewards.length === 0) continue;
    const bucket = s.rewardType ?? 'Sortie';
    out.push({
      locationKey: keyFrom(['sortie', bucket]),
      type: 'Sortie Reward',
      displayName: bucket,
      rewards,
      fetchedAt,
    });
  }

  // 7. Key rewards  --------------------------------------------------------
  for (const k of raw.keyRewards ?? []) {
    const rewards = normaliseRewards(k.drops);
    if (rewards.length === 0 || !k.name) continue;
    out.push({
      locationKey: keyFrom(['key', k.name]),
      type: 'Key Reward',
      displayName: k.name,
      rewards,
      fetchedAt,
    });
  }

  // 8. Bounties (4 locations × N levels × up to 3 rotations)  --------------
  const bountyBuckets: Array<[BountyLocation, RawBounty[] | undefined]> = [
    ['Cetus',     raw.cetusBountyRewards],
    ['Solaris',   raw.solarisBountyRewards],
    ['Deimos',    raw.deimosRewards],
    ['Zariman',   raw.zarimanRewards],
    ['Sanctum',   raw.entratiLabRewards],
    ['Hollvania', raw.hexRewards],
  ];

  for (const [bountyLocation, entries] of bountyBuckets) {
    for (const b of entries ?? []) {
      if (!b.bountyLevel) continue;

      // Shape A: flat drops array (older/simpler rows)
      if (b.drops?.length) {
        const rewards = normaliseRewards(b.drops);
        if (rewards.length > 0) {
          out.push({
            locationKey: keyFrom(['bounty', bountyLocation, b.bountyLevel]),
            type: 'Bounty',
            displayName: `${bountyLocation} — ${b.bountyLevel}`,
            rewards,
            bountyLocation,
            bountyLevel: b.bountyLevel,
            fetchedAt,
          });
        }
      }

      // Shape B: rotations map (Rotation A/B/C)
      if (b.rewards) {
        for (const [rotKey, drops] of Object.entries(b.rewards)) {
          const rewards = normaliseRewards(drops);
          if (rewards.length === 0) continue;
          const tier = parseRotationTier(rotKey);
          out.push({
            locationKey: keyFrom(['bounty', bountyLocation, b.bountyLevel, tier ?? rotKey]),
            type: 'Bounty',
            displayName: tier
              ? `${bountyLocation} — ${b.bountyLevel} (Rotation ${tier})`
              : `${bountyLocation} — ${b.bountyLevel} (${rotKey})`,
            rewards,
            bountyLocation,
            bountyLevel: b.bountyLevel,
            rotationTier: tier,
            fetchedAt,
          });
        }
      }
    }
  }

  return out;
}

// ─── Pure query helpers (no Dexie) ──────────────────────────────────────────

/**
 * Filter a list of locations to only those whose rewards include `itemName`
 * (case-insensitive substring). Also trims the returned rewards to just the
 * matching entries, so the caller can render a focused view.
 */
export function filterLocationsByItem(
  locations: DropLocation[],
  itemName: string,
): DropLocation[] {
  const q = itemName.toLowerCase();
  const out: DropLocation[] = [];
  for (const loc of locations) {
    const matched = loc.rewards.filter((r) => r.itemName.toLowerCase().includes(q));
    if (matched.length > 0) out.push({ ...loc, rewards: matched });
  }
  return out;
}

/** Sort locations by their best (maximum) drop chance, descending. */
export function sortByBestChance(locations: DropLocation[]): DropLocation[] {
  return [...locations].sort((a, b) => {
    const aMax = a.rewards.reduce((m, r) => Math.max(m, r.chance), 0);
    const bMax = b.rewards.reduce((m, r) => Math.max(m, r.chance), 0);
    return bMax - aMax;
  });
}
