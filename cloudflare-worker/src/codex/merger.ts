// ---------------------------------------------------------------------------
// Codex merger — joins parsed lookup maps into per-item enriched records.
//
// Inputs:
//   • ParsedCodex (from parser.ts) — 12 calamity maps + inverted drops.
//
// What we do here:
//   1. Walk every calamity row and emit a MergedItem with:
//      - first-pass category (resolved from source-file + uniqueName patterns)
//      - source row preserved untouched (for the enricher / normalizer)
//      - drops from WFCD (matched by display name)
//      - the recipe that PRODUCES this item (lookup via recipesByResult)
//      - relic contents (if the row IS a relic — filtered from allDrops)
//      - ducat trade-in value (if the row is a Prime part — derived from
//        the rarity tier of the relic that contains it)
//   2. Recipes are emitted as standalone Blueprint items — they're real
//      drops that show up in WFCD by display name, and players collect
//      them as inventory.
//
// What we do NOT do here:
//   • Compute bestFarms — that's enricher.ts (needs cycle/effort scoring)
//   • Resolve icon URLs — that's enricher.ts
//   • Emit the final TennoplanItem shape — that's normalizer.ts
//
// Output is consumed by enricher.ts. Quality flags / overall counts live in
// the `stats` block so updater.ts can score the run before committing to KV.
// ---------------------------------------------------------------------------

import { logger } from '../logger';
import type { ItemCategory } from '../types';
import type { CalamityRecipe, CalamityRow, ParsedCodex, ParsedDrop, DropRarity } from './parser';

const log  = (msg: string, data?: unknown) => logger.info ('codex-merger', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn ('codex-merger', msg, data);

// ─── Public types ─────────────────────────────────────────────────────────────

/** Which calamity export a row originated in. Used for category resolution. */
export type CalamitySource =
  | 'warframes'
  | 'weapons'
  | 'sentinels'
  | 'mods'
  | 'recipes'
  | 'relicArcane'
  | 'resources'
  | 'keys'
  | 'flavour'
  | 'fusionBundles'
  | 'gear';

export interface RelicContent {
  itemName: string;
  chance:   number;          // 0–1
  state:    'Intact' | 'Exceptional' | 'Flawless' | 'Radiant';
  rarity?:  DropRarity;
}

export interface MergedItem {
  // ── Identity ──
  uniqueName: string;
  name:       string;
  category:   ItemCategory;

  // ── Provenance / shape passthrough ──
  raw:    CalamityRow;
  source: CalamitySource;

  // ── Joined data ──
  /** Drop entries where THIS item is the reward. */
  drops: ParsedDrop[];

  /** The recipe that produces this item, if any (recipesByResult lookup). */
  recipe?: CalamityRecipe;

  /**
   * If THIS item is a Relic, the items that come out when you crack it,
   * grouped by refinement state. Empty for non-relic items.
   */
  relicContents?: RelicContent[];

  /** Ducat trade-in value (15 / 45 / 100) for Prime parts. Otherwise undefined. */
  ducatValue?: number;
}

export interface MergedCodex {
  items: MergedItem[];
  stats: {
    totalItems:           number;
    itemsWithDrops:       number;
    itemsWithRecipes:     number;
    relicItems:           number;
    primeItemsWithDucats: number;
    droppedDuringMerge:   number;
  };
}

// ─── Top-level entry point ────────────────────────────────────────────────────

export function mergeCodex(parsed: ParsedCodex): MergedCodex {
  const t0 = Date.now();

  const items: MergedItem[] = [];
  let droppedDuringMerge = 0;

  const sources: ReadonlyArray<readonly [Map<string, CalamityRow>, CalamitySource]> = [
    [parsed.warframes,     'warframes'],
    [parsed.weapons,       'weapons'],
    [parsed.sentinels,     'sentinels'],
    [parsed.mods,          'mods'],
    [parsed.recipes as Map<string, CalamityRow>, 'recipes'],
    [parsed.relicArcane as Map<string, CalamityRow>, 'relicArcane'],
    [parsed.resources,     'resources'],
    [parsed.keys,          'keys'],
    [parsed.flavour,       'flavour'],
    [parsed.fusionBundles, 'fusionBundles'],
    [parsed.gear,          'gear'],
  ];

  // Note: abilities is intentionally skipped — those are abilities, not
  // standalone items. Enricher uses parsed.abilities to attach abilities
  // to sentinel items.

  for (const [map, source] of sources) {
    for (const row of map.values()) {
      const merged = buildMergedItem(row, source, parsed);
      if (!merged) { droppedDuringMerge++; continue; }
      items.push(merged);
    }
  }

  const stats = computeStats(items, droppedDuringMerge);

  log('merged codex', {
    ms:    Date.now() - t0,
    ...stats,
  });

  return { items, stats };
}

// ─── Per-row construction ─────────────────────────────────────────────────────

function buildMergedItem(row: CalamityRow, source: CalamitySource, parsed: ParsedCodex): MergedItem | null {
  if (!row.uniqueName || !row.name) return null;

  const category = resolveCategory(row, source);

  const drops = parsed.dropsByName?.get(row.name) ?? [];

  const merged: MergedItem = {
    uniqueName: row.uniqueName,
    name:       row.name,
    category,
    raw:        row,
    source,
    drops,
  };

  // Recipe attachment: the recipe whose `resultType` is this item's
  // uniqueName. Skip when the row IS itself a recipe.
  if (source !== 'recipes') {
    const recipe = parsed.recipesByResult.get(row.uniqueName);
    if (recipe) merged.recipe = recipe;
  }

  // Relic contents: if this row is a relic, find every drop in allDrops
  // that names this relic as its source.
  if (category === 'Relic') {
    const contents = computeRelicContents(row.name, parsed.allDrops);
    if (contents.length > 0) merged.relicContents = contents;
  }

  // Ducat value: only Prime parts. Inferred from the rarity tier of any
  // relic that contains this item.
  if (isPrimePart(row.name, category)) {
    const ducat = ducatFromDrops(drops);
    if (ducat !== undefined) merged.ducatValue = ducat;
  }

  return merged;
}

// ─── Category resolution ──────────────────────────────────────────────────────

/**
 * First-pass category. Source file is the strongest signal; we use uniqueName
 * patterns only when the source mixes categories (relicArcane, flavour,
 * resources, fusionBundles).
 */
function resolveCategory(row: CalamityRow, source: CalamitySource): ItemCategory {
  switch (source) {
    case 'warframes':     return 'Warframe';
    case 'weapons':       return 'Weapon';
    case 'sentinels':     return resolveSentinelCategory(row.uniqueName);
    case 'mods':          return 'Mod';
    case 'recipes':       return 'Blueprint';
    case 'relicArcane':   return resolveRelicArcaneCategory(row.uniqueName);
    case 'resources':     return resolveResourceCategory(row.uniqueName);
    case 'keys':          return 'Key';
    case 'flavour':       return resolveFlavourCategory(row.uniqueName);
    case 'fusionBundles': return 'Mod';
    case 'gear':          return 'Equipment';
  }
}

function resolveSentinelCategory(uniqueName: string): ItemCategory {
  // Pets (kubrow / kavat / vasca / predasite / vulpaphyla / hounds) live
  // alongside sentinels in DE's data. Treat organic ones as 'Companion'.
  if (/Kubrow|Kavat|Predasite|Vulpaphyla|Vasca|InfestedCatbrow|InfestedHound|Hound/i.test(uniqueName)) {
    return 'Companion';
  }
  return 'Sentinel';
}

function resolveRelicArcaneCategory(uniqueName: string): ItemCategory {
  // Relic uniqueNames typically include "Projections" or "VoidProjection".
  // Arcanes use names like "/Lotus/Upgrades/CosmeticEnhancers/...".
  if (/Projection|VoidTear|VoidProjection|\/Relics?\//i.test(uniqueName)) return 'Relic';
  return 'Arcane';
}

function resolveResourceCategory(uniqueName: string): ItemCategory {
  if (/Fish|\/Fishing\//i.test(uniqueName)) return 'Fish';
  // Ingredients are crafting components — heuristic on common ingredient
  // path patterns. Plain resources fall through to 'Resource'.
  if (/\/Ingredients?\//i.test(uniqueName))  return 'Ingredient';
  return 'Resource';
}

function resolveFlavourCategory(uniqueName: string): ItemCategory {
  if (/Sigil/i.test(uniqueName)) return 'Sigil';
  if (/Glyph/i.test(uniqueName)) return 'Glyph';
  return 'Cosmetic';
}

// ─── Relic content extraction ────────────────────────────────────────────────

/**
 * Parse a relic display name into (tier, name).
 *   "Lith A1 Relic"     → { tier: 'Lith', name: 'A1' }
 *   "Meso C7 Relic"     → { tier: 'Meso', name: 'C7' }
 *   "Requiem I Relic"   → { tier: 'Requiem', name: 'I' }
 * Returns null if the name doesn't look like a relic label.
 */
function parseRelicLabel(name: string): { tier: string; name: string } | null {
  const m = /^(Lith|Meso|Neo|Axi|Requiem)\s+([A-Z][A-Z0-9]*)\b/i.exec(name);
  if (!m || !m[1] || !m[2]) return null;
  const tier = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return { tier, name: m[2].toUpperCase() };
}

/**
 * Walk allDrops and pull out everything matching this relic's tier+name. Each
 * matching drop becomes a RelicContent; one item appears multiple times if
 * the upstream lists it at multiple refinement states (Intact / Radiant / etc.)
 */
function computeRelicContents(relicName: string, allDrops: readonly ParsedDrop[]): RelicContent[] {
  const parts = parseRelicLabel(relicName);
  if (!parts) return [];

  const out: RelicContent[] = [];
  for (const drop of allDrops) {
    if (drop.source !== 'relic') continue;
    if (drop.relicTier !== parts.tier) continue;
    if (drop.relicName !== parts.name) continue;
    const state = drop.relicState ?? 'Intact';
    const entry: RelicContent = {
      itemName: drop.itemName,
      chance:   drop.chance,
      state,
    };
    if (drop.rarity) entry.rarity = drop.rarity;
    out.push(entry);
  }
  return out;
}

// ─── Ducat values ────────────────────────────────────────────────────────────

/**
 * Heuristic: a name is a Prime part if it contains "Prime" as a word and
 * isn't an obvious cosmetic / accessory. Used to gate ducat inference.
 *
 * Note we only apply this to potentially-tradable categories. Cosmetic
 * Primed items (Prime Sigils, Skins, Syandanas) don't get ducats.
 */
function isPrimePart(name: string, category: ItemCategory): boolean {
  if (!/\bPrime\b/.test(name)) return false;
  if (category === 'Sigil' || category === 'Glyph' || category === 'Cosmetic') return false;
  return true;
}

/**
 * Pull the rarity tier from any relic drop entry on this item, then map to
 * standard ducat values per Warframe wiki:
 *   Common   → 15
 *   Uncommon → 45
 *   Rare     → 100
 * Returns undefined if the item never appears in a relic (e.g. trader-only).
 */
function ducatFromDrops(drops: readonly ParsedDrop[]): number | undefined {
  for (const drop of drops) {
    if (drop.source !== 'relic') continue;
    switch (drop.rarity) {
      case 'Common':   return 15;
      case 'Uncommon': return 45;
      case 'Rare':     return 100;
    }
  }
  return undefined;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function computeStats(items: readonly MergedItem[], droppedDuringMerge: number): MergedCodex['stats'] {
  let withDrops      = 0;
  let withRecipes    = 0;
  let relicItems     = 0;
  let primeWithDucat = 0;

  for (const item of items) {
    if (item.drops.length > 0)        withDrops++;
    if (item.recipe)                  withRecipes++;
    if (item.category === 'Relic')    relicItems++;
    if (item.ducatValue !== undefined) primeWithDucat++;
  }

  // Sanity warn: if we ended up with zero drops anywhere, the WFCD pipeline
  // probably failed silently and only the merger noticed. Emit a single
  // line so updater.ts can detect the degraded state from logs alone.
  if (items.length > 0 && withDrops === 0) {
    warn('merge produced zero items with drops — WFCD pipeline likely degraded');
  }

  return {
    totalItems:           items.length,
    itemsWithDrops:       withDrops,
    itemsWithRecipes:     withRecipes,
    relicItems,
    primeItemsWithDucats: primeWithDucat,
    droppedDuringMerge,
  };
}
