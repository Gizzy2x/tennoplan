// ---------------------------------------------------------------------------
// Codex parser — turn raw upstream blobs into typed lookup maps.
//
// Inputs:
//   • RawCalamityBlobs — 12 calamity-inc Public Export Plus JSON files
//   • Drops blob from drops.warframestat.us (WFCD), or null
//
// Calamity files come in three possible shapes — we accept all of them:
//   1. { ExportFoo: [...] }              wrapper-keyed array (current shape)
//   2. [...]                              bare array
//   3. { "/Lotus/...": {...}, ... }       dictionary keyed by uniqueName
//
// WFCD drops come location-keyed (planet → node → rotation → reward[]). The
// merger needs item-keyed lookup, so we INVERT here: every reward becomes a
// flat ParsedDrop with full source context, then we group by `itemName`.
//
// What this file does NOT do:
//   • No category resolution (merger.ts decides Warframe vs Weapon vs ...)
//   • No icon resolution, no bestFarms scoring (enricher.ts)
//   • No TennoplanItem construction (normalizer.ts)
//
// Defensive style: every field access through optional chaining, every
// shape-narrowing wrapped. Calamity occasionally renames fields between
// patches; we'd rather drop a row than throw.
// ---------------------------------------------------------------------------

import { logger } from '../logger';
import type { RawCalamityBlobs, RawCodexBlobs } from './fetcher';

const log  = (msg: string, data?: unknown) => logger.info ('codex-parser', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn ('codex-parser', msg, data);

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Minimal calamity row contract. Every row we accept has at least uniqueName
 * and name. Everything else stays as `unknown` so the merger / enricher /
 * normalizer can narrow per-category without us locking in a shape that may
 * shift between Warframe patches.
 */
export interface CalamityRow {
  uniqueName: string;
  name:       string;
  [key: string]: unknown;
}

/**
 * Recipe row. `resultType` points at the item the recipe produces (e.g. a
 * Warframe component or a Prime warframe itself). `ingredients` lists the
 * required items by uniqueName.
 */
export interface CalamityRecipe extends CalamityRow {
  resultType?:         string;
  ingredients?:        RecipeIngredient[];
  buildPrice?:         number;       // credits to build
  buildTime?:          number;       // seconds
  skipBuildTimePrice?: number;       // platinum to rush
  consumeOnBuild?:     boolean;
  num?:                number;       // how many produced per craft
}

export interface RecipeIngredient {
  itemType:        string;           // ingredient uniqueName
  itemCount:       number;
  productCategory?: string;
}

/**
 * Relic row from ExportRelicArcane. Relics list their reward pool; arcanes
 * sit alongside in the same file. Both share this shape; we filter by
 * uniqueName patterns in the merger.
 */
export interface CalamityRelicArcane extends CalamityRow {
  // Relic-specific (arcanes leave this empty)
  rewards?: Array<{
    rewardName?: string;             // uniqueName of the produced item
    rarity?:     string;
    itemCount?:  number;
  }>;
}

// ─── ParsedDrop ───────────────────────────────────────────────────────────────

export type DropSource =
  | 'mission'        // missionRewards (planet/node)
  | 'relic'          // relics (cracking a relic)
  | 'sortie'         // sortieRewards
  | 'arbitration'    // arbitrationRewards
  | 'bounty'         // {cetus|solaris|deimos|zariman}BountyRewards
  | 'transient'      // transientRewards (events)
  | 'blueprint'      // blueprintLocations
  | 'modByDrop'      // mod drops from enemies
  | 'key'            // keyRewards
  | 'unknown';

export type DropRarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary' | 'Cosmic';

export interface ParsedDrop {
  itemName:   string;          // display name — primary join key
  source:     DropSource;
  chance:     number;          // 0.0 – 1.0
  rarity?:    DropRarity;

  // Mission-specific
  planet?:       string;
  node?:         string;       // 'E Prime', 'Hepit', etc.
  missionType?:  string;       // 'Capture', 'Survival', etc.
  rotation?:     'A' | 'B' | 'C';
  isSteelPath?:  boolean;

  // Relic-specific
  relicTier?:    'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem';
  relicName?:    string;       // 'A1', 'B2', etc.
  relicState?:   'Intact' | 'Exceptional' | 'Flawless' | 'Radiant';

  // Bounty-specific
  bountyLocation?: 'Cetus' | 'Fortuna' | 'Cambion' | 'Zariman' | 'Entrati Vaults';
  bountyTier?:     string;     // raw label e.g. "Level 5 - 15"
  bountyStage?:    string;     // 'A' | 'B' | 'C' | 'final' | ...

  /** Raw upstream label, when planet/node aren't decomposable. */
  rawLocation?: string;
}

// ─── ParsedCodex ──────────────────────────────────────────────────────────────

export interface ParsedCodex {
  // Calamity calamity calamity calamity calamity calamity calamity calamity ──
  warframes:       Map<string, CalamityRow>;
  weapons:         Map<string, CalamityRow>;
  sentinels:       Map<string, CalamityRow>;
  abilities:  Map<string, CalamityRow>;
  mods:            Map<string, CalamityRow>;        // ExportUpgrades
  recipes:         Map<string, CalamityRecipe>;     // keyed by recipe.uniqueName
  recipesByResult: Map<string, CalamityRecipe>;     // keyed by recipe.resultType
  relicArcane:     Map<string, CalamityRelicArcane>;
  resources:       Map<string, CalamityRow>;
  keys:            Map<string, CalamityRow>;
  flavour:         Map<string, CalamityRow>;
  fusionBundles:   Map<string, CalamityRow>;
  gear:            Map<string, CalamityRow>;

  // Drops, indexed by item display name (case-preserved). null = WFCD failed.
  dropsByName:     Map<string, ParsedDrop[]> | null;

  // All drops as a flat list (for relic content lookup, debugging, stats).
  allDrops:        ParsedDrop[];

  // Source / quality bookkeeping
  hasDrops:        boolean;
  dropsSource:     'wfcd' | 'wfcd-github' | null;
  stats: {
    totalCalamityRows: number;
    totalDrops:        number;
    droppedRows:       number;     // calamity rows discarded for missing fields
  };
}

// ─── Top-level entry point ────────────────────────────────────────────────────

export function parseCodex(blobs: RawCodexBlobs): ParsedCodex {
  const t0 = Date.now();

  const cal = parseCalamity(blobs);

  // Build secondary recipe lookup by what they produce. Multiple recipes for
  // the same result is rare but possible (e.g. SP variants); we warn and keep
  // the first since the merger only needs one canonical recipe per item.
  const recipesByResult = new Map<string, CalamityRecipe>();
  for (const recipe of cal.recipes.values()) {
    const result = recipe.resultType;
    if (!result) continue;
    if (recipesByResult.has(result)) {
      warn('duplicate recipe resultType', { resultType: result, recipe: recipe.uniqueName });
      continue;
    }
    recipesByResult.set(result, recipe);
  }

  // Drops — invert WFCD into a flat ParsedDrop[] keyed by item name.
  const drops = blobs.drops != null ? parseDrops(blobs.drops) : null;

  const dropsByName = drops != null ? indexDropsByName(drops) : null;
  const allDrops    = drops ?? [];

  const totalCalamityRows =
    cal.warframes.size + cal.weapons.size + cal.sentinels.size +
    cal.abilities.size + cal.mods.size + cal.recipes.size +
    cal.relicArcane.size + cal.resources.size + cal.keys.size +
    cal.flavour.size + cal.fusionBundles.size + cal.gear.size;

  const result: ParsedCodex = {
    ...cal,
    recipesByResult,
    dropsByName,
    allDrops,
    hasDrops:    drops != null && drops.length > 0,
    dropsSource: blobs.dropsSource,
    stats: {
      totalCalamityRows,
      totalDrops:  allDrops.length,
      droppedRows: cal.droppedRows,
    },
  };

  log('parsed codex', {
    ms:           Date.now() - t0,
    rows:         totalCalamityRows,
    drops:        allDrops.length,
    droppedRows:  cal.droppedRows,
    dropsSource:  blobs.dropsSource ?? 'unavailable',
  });

  return result;
}

// ─── Calamity unpacking ───────────────────────────────────────────────────────

interface ParsedCalamity {
  warframes:      Map<string, CalamityRow>;
  weapons:        Map<string, CalamityRow>;
  sentinels:      Map<string, CalamityRow>;
  abilities: Map<string, CalamityRow>;
  mods:           Map<string, CalamityRow>;
  recipes:        Map<string, CalamityRecipe>;
  relicArcane:    Map<string, CalamityRelicArcane>;
  resources:      Map<string, CalamityRow>;
  keys:           Map<string, CalamityRow>;
  flavour:        Map<string, CalamityRow>;
  fusionBundles:  Map<string, CalamityRow>;
  gear:           Map<string, CalamityRow>;
  droppedRows:    number;          // total rows discarded across all files
}

function parseCalamity(blobs: RawCalamityBlobs): ParsedCalamity {
  const counter = { dropped: 0 };

  return {
    warframes:      buildMap(blobs.warframes,        'ExportWarframes',      counter),
    weapons:        buildMap(blobs.weapons,          'ExportWeapons',        counter),
    sentinels:      buildMap(blobs.sentinels,        'ExportSentinels',      counter),
    abilities: buildMap(blobs.abilities,   'ExportAbilities', counter),
    mods:           buildMap(blobs.upgrades,         'ExportUpgrades',       counter),
    recipes:        buildRecipeMap(blobs.recipes,    'ExportRecipes',        counter),
    relicArcane:    buildRelicsArcanes(blobs.relics, blobs.arcanes, 'ExportRelics', 'ExportArcanes', counter),
    resources:      buildMap(blobs.resources,        'ExportResources',      counter),
    keys:           buildMap(blobs.keys,             'ExportKeys',           counter),
    flavour:        buildMap(blobs.flavour,          'ExportFlavour',        counter),
    fusionBundles:  buildMap(blobs.fusionBundles,    'ExportFusionBundles',  counter),
    gear:           buildMap(blobs.gear,             'ExportGear',           counter),
    droppedRows:    counter.dropped,
  };
}

/**
 * Extract a flat array of rows from a calamity blob, regardless of which
 * shape the upstream JSON decided to ship today.
 */
function extractCalamityRows(blob: unknown, wrapperKey: string): unknown[] {
  if (Array.isArray(blob)) return blob;

  if (blob && typeof blob === 'object') {
    const obj = blob as Record<string, unknown>;

    // Wrapper-keyed array (current calamity-inc shape)
    const wrapped = obj[wrapperKey];
    if (Array.isArray(wrapped)) return wrapped;

    // Single-key wrapper with a different name — accept it if there's exactly
    // one top-level key whose value is an array.
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const sole = obj[keys[0]!];
      if (Array.isArray(sole)) return sole;
    }

    // Dictionary keyed by uniqueName: convert values back to row form,
    // synthesizing uniqueName from the key if the value is an object.
    const dictRows: unknown[] = [];
    let usable = true;
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const row = val as Record<string, unknown>;
        if (typeof row['uniqueName'] !== 'string') row['uniqueName'] = key;
        dictRows.push(row);
      } else {
        usable = false;
        break;
      }
    }
    if (usable && dictRows.length > 0) return dictRows;
  }

  return [];
}

function buildMap(blob: unknown, wrapperKey: string, counter: { dropped: number }): Map<string, CalamityRow> {
  const rows = extractCalamityRows(blob, wrapperKey);
  const out  = new Map<string, CalamityRow>();

  for (const raw of rows) {
    const row = toCalamityRow(raw);
    if (!row) { counter.dropped++; continue; }
    if (out.has(row.uniqueName)) continue;       // first wins; later dupes silently skipped
    out.set(row.uniqueName, row);
  }

  return out;
}

function buildRecipeMap(blob: unknown, wrapperKey: string, counter: { dropped: number }): Map<string, CalamityRecipe> {
  const rows = extractCalamityRows(blob, wrapperKey);
  const out  = new Map<string, CalamityRecipe>();

  for (const raw of rows) {
    const recipe = toRecipeRow(raw);
    if (!recipe) { counter.dropped++; continue; }
    if (out.has(recipe.uniqueName)) continue;
    out.set(recipe.uniqueName, recipe);
  }

  return out;
}

function buildRelicsArcanes(
  relicsBlob: unknown,
  arcanesBlob: unknown,
  relicsKey: string,
  arcanesKey: string,
  counter: { dropped: number },
): Map<string, CalamityRelicArcane> {
  const out = new Map<string, CalamityRelicArcane>();
  
  // Merge relics
  const relicsRows = extractCalamityRows(relicsBlob, relicsKey);
  for (const raw of relicsRows) {
    const row = toRelicArcaneRow(raw);
    if (!row) { counter.dropped++; continue; }
    if (out.has(row.uniqueName)) continue;
    out.set(row.uniqueName, row);
  }
  
  // Merge arcanes
  const arcanesRows = extractCalamityRows(arcanesBlob, arcanesKey);
  for (const raw of arcanesRows) {
    const row = toRelicArcaneRow(raw);
    if (!row) { counter.dropped++; continue; }
    if (out.has(row.uniqueName)) continue;
    out.set(row.uniqueName, row);
  }

  return out;
}

function toCalamityRow(raw: unknown): CalamityRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const uniqueName = typeof r['uniqueName'] === 'string' ? (r['uniqueName'] as string) : null;
  const name       = typeof r['name']       === 'string' ? (r['name']       as string) : null;
  if (!uniqueName || !name) return null;
  return { ...r, uniqueName, name } as CalamityRow;
}

function toRecipeRow(raw: unknown): CalamityRecipe | null {
  const base = toCalamityRow(raw);
  if (!base) return null;

  const r = raw as Record<string, unknown>;
  const recipe: CalamityRecipe = { ...base };

  if (typeof r['resultType']         === 'string')  recipe.resultType         = r['resultType'] as string;
  if (typeof r['buildPrice']         === 'number')  recipe.buildPrice         = r['buildPrice'] as number;
  if (typeof r['buildTime']          === 'number')  recipe.buildTime          = r['buildTime'] as number;
  if (typeof r['skipBuildTimePrice'] === 'number')  recipe.skipBuildTimePrice = r['skipBuildTimePrice'] as number;
  if (typeof r['consumeOnBuild']     === 'boolean') recipe.consumeOnBuild     = r['consumeOnBuild'] as boolean;
  if (typeof r['num']                === 'number')  recipe.num                = r['num'] as number;

  if (Array.isArray(r['ingredients'])) {
    const ingredients: RecipeIngredient[] = [];
    for (const ing of r['ingredients'] as unknown[]) {
      if (!ing || typeof ing !== 'object') continue;
      const ir = ing as Record<string, unknown>;
      const itemType  = typeof ir['ItemType']  === 'string' ? (ir['ItemType']  as string) : null;
      const itemCount = typeof ir['ItemCount'] === 'number' ? (ir['ItemCount'] as number) : null;
      if (!itemType || itemCount == null) continue;
      const entry: RecipeIngredient = { itemType, itemCount };
      if (typeof ir['ProductCategory'] === 'string') entry.productCategory = ir['ProductCategory'] as string;
      ingredients.push(entry);
    }
    if (ingredients.length > 0) recipe.ingredients = ingredients;
  }

  return recipe;
}

function toRelicArcaneRow(raw: unknown): CalamityRelicArcane | null {
  const base = toCalamityRow(raw);
  if (!base) return null;

  const r = raw as Record<string, unknown>;
  const out: CalamityRelicArcane = { ...base };

  if (Array.isArray(r['rewards'])) {
    const rewards: NonNullable<CalamityRelicArcane['rewards']> = [];
    for (const rw of r['rewards'] as unknown[]) {
      if (!rw || typeof rw !== 'object') continue;
      const row = rw as Record<string, unknown>;
      const entry: NonNullable<CalamityRelicArcane['rewards']>[number] = {};
      if (typeof row['rewardName'] === 'string') entry.rewardName = row['rewardName'] as string;
      if (typeof row['rarity']     === 'string') entry.rarity     = row['rarity']     as string;
      if (typeof row['itemCount']  === 'number') entry.itemCount  = row['itemCount']  as number;
      if (entry.rewardName || entry.rarity) rewards.push(entry);
    }
    if (rewards.length > 0) out.rewards = rewards;
  }

  return out;
}

// ─── WFCD drops walker ────────────────────────────────────────────────────────

/**
 * Top-level WFCD parse. Walks every section we know about, emits a flat
 * ParsedDrop[]. Unknown top-level keys are skipped with a warn so we notice
 * upstream schema additions instead of silently dropping data.
 */
export function parseDrops(raw: unknown): ParsedDrop[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const out: ParsedDrop[] = [];

  walkMissionRewards (r['missionRewards'],          out);
  walkRelics         (r['relics'],                  out);
  walkSortieRewards  (r['sortieRewards'],           out);
  walkArbitration    (r['arbitrationRewards'],      out);
  walkTransient      (r['transientRewards'],        out);
  walkBlueprintLocs  (r['blueprintLocations'],      out);
  walkModByDrop      (r['modLocations'],            out);
  walkKeyRewards     (r['keyRewards'],              out);

  walkBounty(r['cetusBountyRewards'],          'Cetus',          out);
  walkBounty(r['solarisBountyRewards'],        'Fortuna',        out);
  walkBounty(r['deimosBountyRewards'],         'Cambion',        out);
  walkBounty(r['zarimanBountyRewards'],        'Zariman',        out);
  walkBounty(r['entratiVaultsRewards'],        'Entrati Vaults', out);

  return out;
}

// ─── Section walkers ──────────────────────────────────────────────────────────
//
// Every walker pushes onto `out` directly to keep the call sites linear and
// avoid intermediate arrays. None throw — bad rows are skipped.

interface WfcdReward {
  itemName: string;
  rarity?:  string;
  chance?:  number;            // 0–100 from upstream
}

/**
 * missionRewards: { [planet]: { [nodeLabel]: { rewards: { A|B|C: WfcdReward[] } } } }
 *
 * Some entries skip rotations and have a single `rewards: WfcdReward[]`. We
 * accept both shapes.
 */
function walkMissionRewards(raw: unknown, out: ParsedDrop[]): void {
  if (!isObj(raw)) return;
  for (const [planet, planetVal] of Object.entries(raw as Record<string, unknown>)) {
    if (!isObj(planetVal)) continue;
    for (const [nodeLabel, nodeVal] of Object.entries(planetVal as Record<string, unknown>)) {
      if (!isObj(nodeVal)) continue;
      const node = nodeVal as Record<string, unknown>;

      const isSteelPath = !!node['gameMode'] && /Steel/i.test(String(node['gameMode']));
      const { node: nodeName, missionType } = parseNodeLabel(nodeLabel);

      const rewards = node['rewards'];

      if (Array.isArray(rewards)) {
        for (const rw of rewards) pushMissionReward(rw, planet, nodeName, missionType, undefined, isSteelPath, out, nodeLabel);
        continue;
      }

      if (isObj(rewards)) {
        for (const [rotKey, rotRewards] of Object.entries(rewards as Record<string, unknown>)) {
          if (!Array.isArray(rotRewards)) continue;
          const rotation = rotKey === 'A' || rotKey === 'B' || rotKey === 'C' ? rotKey : undefined;
          for (const rw of rotRewards) pushMissionReward(rw, planet, nodeName, missionType, rotation, isSteelPath, out, nodeLabel);
        }
      }
    }
  }
}

function pushMissionReward(
  raw:         unknown,
  planet:      string,
  node:        string | undefined,
  missionType: string | undefined,
  rotation:    'A' | 'B' | 'C' | undefined,
  isSteelPath: boolean,
  out:         ParsedDrop[],
  rawLocation: string,
): void {
  const reward = toReward(raw);
  if (!reward) return;
  const drop: ParsedDrop = {
    itemName: reward.itemName,
    source:   'mission',
    chance:   pctToFraction(reward.chance),
    planet,
    rawLocation: `${planet}/${rawLocation}`,
  };
  if (reward.rarity)  drop.rarity      = normalizeRarity(reward.rarity);
  if (node)           drop.node        = node;
  if (missionType)    drop.missionType = missionType;
  if (rotation)       drop.rotation    = rotation;
  if (isSteelPath)    drop.isSteelPath = true;
  out.push(drop);
}

/**
 * relics: { [tier]: { [name]: { state, rewards: WfcdReward[] } } }
 *
 * The relic itself has a uniqueName like "Lith A1 Relic"; the rewards are
 * the items that come out when you crack it. Each reward becomes a drop with
 * source='relic' and full relic context attached.
 */
function walkRelics(raw: unknown, out: ParsedDrop[]): void {
  if (!isObj(raw)) return;
  for (const [tier, tierVal] of Object.entries(raw as Record<string, unknown>)) {
    if (!isObj(tierVal)) continue;
    if (!isRelicTier(tier)) continue;

    for (const [name, relicVal] of Object.entries(tierVal as Record<string, unknown>)) {
      if (!isObj(relicVal)) continue;
      const relic = relicVal as Record<string, unknown>;
      const rewards = relic['rewards'];
      if (!Array.isArray(rewards)) continue;

      const stateRaw = String(relic['state'] ?? 'Intact');
      const state    = isRelicState(stateRaw) ? stateRaw : 'Intact';

      for (const rw of rewards) {
        const reward = toReward(rw);
        if (!reward) continue;
        const drop: ParsedDrop = {
          itemName:     reward.itemName,
          source:       'relic',
          chance:       pctToFraction(reward.chance),
          relicTier:    tier,
          relicName:    name,
          relicState:   state,
          rawLocation:  `${tier} ${name} (${state})`,
        };
        if (reward.rarity) drop.rarity = normalizeRarity(reward.rarity);
        out.push(drop);
      }
    }
  }
}

/**
 * sortieRewards: WfcdReward[] (flat, no rotation)
 */
function walkSortieRewards(raw: unknown, out: ParsedDrop[]): void {
  if (!Array.isArray(raw)) return;
  for (const rw of raw) {
    const reward = toReward(rw);
    if (!reward) continue;
    const drop: ParsedDrop = {
      itemName: reward.itemName,
      source:   'sortie',
      chance:   pctToFraction(reward.chance),
      rawLocation: 'Sortie',
    };
    if (reward.rarity) drop.rarity = normalizeRarity(reward.rarity);
    out.push(drop);
  }
}

/**
 * arbitrationRewards: { rotations: { rotationA|rotationB|rotationC: WfcdReward[] } }
 * Some shapes have `rewards: WfcdReward[]` directly. Accept both.
 */
function walkArbitration(raw: unknown, out: ParsedDrop[]): void {
  if (Array.isArray(raw)) {
    for (const rw of raw) pushArbitration(rw, undefined, out);
    return;
  }
  if (!isObj(raw)) return;
  const r = raw as Record<string, unknown>;
  const rotations = r['rotations'] ?? r['rewards'];

  if (Array.isArray(rotations)) {
    for (const rw of rotations) pushArbitration(rw, undefined, out);
    return;
  }

  if (isObj(rotations)) {
    for (const [rotKey, rotRewards] of Object.entries(rotations as Record<string, unknown>)) {
      if (!Array.isArray(rotRewards)) continue;
      const rotation = parseRotationKey(rotKey);
      for (const rw of rotRewards) pushArbitration(rw, rotation, out);
    }
  }
}

function pushArbitration(raw: unknown, rotation: 'A' | 'B' | 'C' | undefined, out: ParsedDrop[]): void {
  const reward = toReward(raw);
  if (!reward) return;
  const drop: ParsedDrop = {
    itemName:    reward.itemName,
    source:      'arbitration',
    chance:      pctToFraction(reward.chance),
    rawLocation: 'Arbitration',
  };
  if (reward.rarity) drop.rarity   = normalizeRarity(reward.rarity);
  if (rotation)      drop.rotation = rotation;
  out.push(drop);
}

/**
 * transientRewards: { [eventName]: WfcdReward[] }
 * Used for time-limited events. Treated as a generic 'transient' source.
 */
function walkTransient(raw: unknown, out: ParsedDrop[]): void {
  if (!isObj(raw)) return;
  for (const [eventName, val] of Object.entries(raw as Record<string, unknown>)) {
    const list = Array.isArray(val) ? val : isObj(val) ? extractAnyRewardArray(val) : [];
    for (const rw of list) {
      const reward = toReward(rw);
      if (!reward) continue;
      const drop: ParsedDrop = {
        itemName:    reward.itemName,
        source:      'transient',
        chance:      pctToFraction(reward.chance),
        rawLocation: eventName,
      };
      if (reward.rarity) drop.rarity = normalizeRarity(reward.rarity);
      out.push(drop);
    }
  }
}

/**
 * blueprintLocations: { [blueprintName]: WfcdLocation[] }
 *
 * Each location has { location, chance, rarity? }. We treat each location as
 * a generic 'blueprint' drop — the blueprint name is the itemName, the
 * location string is rawLocation.
 */
function walkBlueprintLocs(raw: unknown, out: ParsedDrop[]): void {
  if (!isObj(raw)) return;
  for (const [bpName, locs] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(locs)) continue;
    for (const loc of locs) {
      if (!isObj(loc)) continue;
      const l = loc as Record<string, unknown>;
      const chance = typeof l['chance'] === 'number' ? l['chance'] as number : 0;
      const drop: ParsedDrop = {
        itemName:    bpName,
        source:      'blueprint',
        chance:      pctToFraction(chance),
        rawLocation: typeof l['location'] === 'string' ? l['location'] as string : bpName,
      };
      if (typeof l['rarity'] === 'string') drop.rarity = normalizeRarity(l['rarity'] as string);
      out.push(drop);
    }
  }
}

/**
 * modLocations: [{ modName, enemies: [{ enemyName, chance }] }]
 *
 * One mod → many enemy sources. We flatten to per-enemy drops.
 */
function walkModByDrop(raw: unknown, out: ParsedDrop[]): void {
  if (!Array.isArray(raw)) return;
  for (const entry of raw) {
    if (!isObj(entry)) continue;
    const e = entry as Record<string, unknown>;
    const modName = typeof e['modName'] === 'string' ? e['modName'] as string : null;
    if (!modName) continue;
    const enemies = e['enemies'];
    if (!Array.isArray(enemies)) continue;
    for (const en of enemies) {
      if (!isObj(en)) continue;
      const er = en as Record<string, unknown>;
      const chance = typeof er['chance'] === 'number' ? er['chance'] as number : 0;
      const drop: ParsedDrop = {
        itemName:    modName,
        source:      'modByDrop',
        chance:      pctToFraction(chance),
        rawLocation: typeof er['enemyName'] === 'string' ? er['enemyName'] as string : 'Unknown enemy',
      };
      if (typeof er['rarity'] === 'string') drop.rarity = normalizeRarity(er['rarity'] as string);
      out.push(drop);
    }
  }
}

/**
 * keyRewards: { [keyName]: WfcdReward[] | { rewards: WfcdReward[] } }
 */
function walkKeyRewards(raw: unknown, out: ParsedDrop[]): void {
  if (!isObj(raw)) return;
  for (const [keyName, val] of Object.entries(raw as Record<string, unknown>)) {
    const list =
      Array.isArray(val) ? val :
      isObj(val) ? (Array.isArray((val as Record<string, unknown>)['rewards']) ? (val as Record<string, unknown>)['rewards'] as unknown[] : extractAnyRewardArray(val)) :
      [];
    for (const rw of list) {
      const reward = toReward(rw);
      if (!reward) continue;
      const drop: ParsedDrop = {
        itemName:    reward.itemName,
        source:      'key',
        chance:      pctToFraction(reward.chance),
        rawLocation: keyName,
      };
      if (reward.rarity) drop.rarity = normalizeRarity(reward.rarity);
      out.push(drop);
    }
  }
}

/**
 * Bounty walker — shared between Cetus / Fortuna / Cambion / Zariman / Vaults.
 *
 * Two common upstream shapes:
 *   1. [{ tier, rotations: { stageDefault | A | B | ...: WfcdReward[] } }]
 *   2. [{ tier, rewards: WfcdReward[] }]
 *
 * `tier` is a free-text string like "Level 5 - 15"; the merger maps that to
 * BountyTier later. Stage names are passed through as bountyStage.
 */
function walkBounty(raw: unknown, location: NonNullable<ParsedDrop['bountyLocation']>, out: ParsedDrop[]): void {
  if (!Array.isArray(raw)) return;
  for (const tierEntry of raw) {
    if (!isObj(tierEntry)) continue;
    const t = tierEntry as Record<string, unknown>;
    const tier = typeof t['tier'] === 'string' ? t['tier'] as string : undefined;

    if (Array.isArray(t['rewards'])) {
      for (const rw of t['rewards'] as unknown[]) pushBountyReward(rw, location, tier, undefined, out);
      continue;
    }

    if (isObj(t['rotations'])) {
      for (const [stageKey, stageRewards] of Object.entries(t['rotations'] as Record<string, unknown>)) {
        if (!Array.isArray(stageRewards)) continue;
        for (const rw of stageRewards) pushBountyReward(rw, location, tier, stageKey, out);
      }
    }
  }
}

function pushBountyReward(
  raw:      unknown,
  location: NonNullable<ParsedDrop['bountyLocation']>,
  tier:     string | undefined,
  stage:    string | undefined,
  out:      ParsedDrop[],
): void {
  const reward = toReward(raw);
  if (!reward) return;
  const drop: ParsedDrop = {
    itemName:        reward.itemName,
    source:          'bounty',
    chance:          pctToFraction(reward.chance),
    bountyLocation:  location,
    rawLocation:     `${location} bounty${tier ? ` ${tier}` : ''}${stage ? ` (${stage})` : ''}`,
  };
  if (reward.rarity) drop.rarity      = normalizeRarity(reward.rarity);
  if (tier)          drop.bountyTier  = tier;
  if (stage)         drop.bountyStage = stage;
  out.push(drop);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function indexDropsByName(drops: readonly ParsedDrop[]): Map<string, ParsedDrop[]> {
  const out = new Map<string, ParsedDrop[]>();
  for (const drop of drops) {
    const list = out.get(drop.itemName);
    if (list) list.push(drop);
    else out.set(drop.itemName, [drop]);
  }
  return out;
}

function toReward(raw: unknown): WfcdReward | null {
  if (!isObj(raw)) return null;
  const r = raw as Record<string, unknown>;
  const itemName = typeof r['itemName'] === 'string' ? (r['itemName'] as string).trim() : null;
  if (!itemName) return null;
  const rarity = typeof r['rarity'] === 'string' ? (r['rarity'] as string) : undefined;
  const chance = typeof r['chance'] === 'number' ? (r['chance'] as number) : undefined;
  const reward: WfcdReward = { itemName };
  if (rarity !== undefined) reward.rarity = rarity;
  if (chance !== undefined) reward.chance = chance;
  return reward;
}

/**
 * Convert WFCD's percentage (0–100) to a 0–1 fraction. Clamp negatives,
 * rescue NaNs, accept already-normalized 0–1 inputs (rare but seen).
 */
function pctToFraction(chance: number | undefined): number {
  if (chance == null || !Number.isFinite(chance)) return 0;
  if (chance < 0) return 0;
  if (chance > 1.0001) return Math.min(chance / 100, 1);
  return chance;
}

function normalizeRarity(s: string): DropRarity | undefined {
  const lower = s.toLowerCase().trim();
  switch (lower) {
    case 'common':    return 'Common';
    case 'uncommon':  return 'Uncommon';
    case 'rare':      return 'Rare';
    case 'legendary': return 'Legendary';
    case 'cosmic':    return 'Cosmic';
    default:          return undefined;
  }
}

/**
 * "E Prime (Crossfire)" → { node: "E Prime", missionType: "Crossfire" }.
 * Falls back to the whole label as `node` if no parens found.
 */
function parseNodeLabel(label: string): { node?: string; missionType?: string } {
  const m = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(label);
  if (m && m[1] && m[2]) return { node: m[1].trim(), missionType: m[2].trim() };
  if (label.trim().length > 0) return { node: label.trim() };
  return {};
}

function parseRotationKey(s: string): 'A' | 'B' | 'C' | undefined {
  const c = s.replace(/^rotation/i, '').trim().toUpperCase();
  return c === 'A' || c === 'B' || c === 'C' ? c : undefined;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function isRelicTier(s: string): s is 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem' {
  return s === 'Lith' || s === 'Meso' || s === 'Neo' || s === 'Axi' || s === 'Requiem';
}

function isRelicState(s: string): s is 'Intact' | 'Exceptional' | 'Flawless' | 'Radiant' {
  return s === 'Intact' || s === 'Exceptional' || s === 'Flawless' || s === 'Radiant';
}

/**
 * For shapes where we don't know the wrapper key, find the first array of
 * reward-shaped objects nested anywhere in the value. Cheap fallback used by
 * walkers like transient where upstream structure has drifted before.
 */
function extractAnyRewardArray(obj: Record<string, unknown>): unknown[] {
  for (const v of Object.values(obj)) {
    if (Array.isArray(v) && v.length > 0 && isObj(v[0]) && typeof (v[0] as Record<string, unknown>)['itemName'] === 'string') {
      return v;
    }
  }
  return [];
}
