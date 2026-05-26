// ---------------------------------------------------------------------------
// Codex builder — joins parsed WFCD records into per-item BuiltItem records.
//
// Replaces the old merger.ts. WFCD-only inputs mean no cross-source join is
// needed; we just walk each per-category Map and emit one BuiltItem per row.
//
// What the builder adds:
//   • category (ItemCategory) — derived from source map + uniqueName patterns
//   • drops — ParsedDrop[] joined from parsed.dropsByName by display name
//   • relicContents — for Relic rows, the items that drop when cracking it
//   • ducatValue — for Prime parts, derived from the rarity tier of any
//                  relic that contains them (Common=15, Uncommon=45, Rare=100)
//
// What the builder does NOT do:
//   • Icon resolution, bestFarms scoring, stat extraction — enricher.ts
//   • Final TennoplanItem shape — normalizer.ts
//
// The enricher looks records back up via ctx.parsed maps (keyed by
// uniqueName), so BuiltItem stays lean — no raw passthrough.
// ---------------------------------------------------------------------------

import { logger } from '../logger';
import type { ItemCategory } from '../types';
import type { ParsedCodex, ParsedDrop, DropRarity, WfcdComponent, WfcdComponentDrop } from './parser';

const log  = (msg: string, data?: unknown) => logger.info ('codex-builder', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn ('codex-builder', msg, data);

// ─── Public types ─────────────────────────────────────────────────────────────

/** Which parsed map a BuiltItem came from. Lets enricher pull the right record type. */
export type BuiltSource =
  | 'mod'
  | 'warframe'
  | 'weapon'
  | 'sentinel'
  | 'pet'
  | 'arcane'
  | 'relic'
  | 'resource'
  | 'gear'
  | 'misc'
  | 'component';   // synthesized from a parent's components[] array

/**
 * Per-component data we carry on synthesized BuiltItems so the enricher can
 * resolve icon / description / tradable without going through parsed maps
 * (components don't live in any per-category WFCD endpoint).
 */
export interface ComponentRecord {
  imageName?:   string;
  description?: string;
  tradable?:    boolean;
}

export interface RelicContent {
  itemName: string;
  chance:   number;          // 0–1
  state:    'Intact' | 'Exceptional' | 'Flawless' | 'Radiant';
  rarity?:  DropRarity;
}

export interface BuiltItem {
  uniqueName:    string;
  name:          string;
  category:      ItemCategory;
  source:        BuiltSource;

  /** Drops where THIS item is the reward. Joined from parsed.dropsByName. */
  drops:         ParsedDrop[];

  /** Items that drop when this relic is cracked. Only set for relics. */
  relicContents?: RelicContent[];

  /** Ducat trade-in value (15 / 45 / 100) for Prime parts. */
  ducatValue?:   number;

  /** Embedded component data — set only when source === 'component'. */
  componentRecord?: ComponentRecord;
}

export interface BuiltCodex {
  items: BuiltItem[];
  stats: {
    totalItems:           number;
    itemsWithDrops:       number;
    relicItems:           number;
    primeItemsWithDucats: number;
    perCategory:          Record<string, number>;
  };
}

// ─── Top-level entry point ────────────────────────────────────────────────────

export function buildCodex(parsed: ParsedCodex): BuiltCodex {
  const t0 = Date.now();

  const items: BuiltItem[] = [];
  const perCategory: Record<string, number> = {};

  // Walk each parsed category map. Map may be null if upstream fetch failed —
  // we just skip that category.
  walkMap(parsed.mods,      'mod',      (row) => emit(items, row.uniqueName, row.name, 'Mod',      'mod',      parsed));
  walkMap(parsed.warframes, 'warframe', (row) => emit(items, row.uniqueName, row.name, 'Warframe', 'warframe', parsed));
  walkMap(parsed.weapons,   'weapon',   (row) => emit(items, row.uniqueName, row.name, 'Weapon',   'weapon',   parsed));
  walkMap(parsed.sentinels, 'sentinel', (row) => emit(items, row.uniqueName, row.name, 'Sentinel', 'sentinel', parsed));
  walkMap(parsed.pets,      'pet',      (row) => emit(items, row.uniqueName, row.name, 'Companion','pet',      parsed));
  walkMap(parsed.arcanes,   'arcane',   (row) => emit(items, row.uniqueName, row.name, 'Arcane',   'arcane',   parsed));
  walkMap(parsed.relics,    'relic',    (row) => emit(items, row.uniqueName, row.name, 'Relic',    'relic',    parsed));
  walkMap(parsed.resources, 'resource', (row) => emit(items, row.uniqueName, row.name, resolveResourceCategory(row.uniqueName, row.name), 'resource', parsed));
  walkMap(parsed.gear,      'gear',     (row) => emit(items, row.uniqueName, row.name, 'Equipment','gear',     parsed));
  walkMap(parsed.misc,      'misc',     (row) => emit(items, row.uniqueName, row.name, resolveResourceCategory(row.uniqueName, row.name), 'misc',     parsed));

  // ── Synthesize component items ──
  //
  // WFCD ships components inline on parent records (warframes.components,
  // weapons.components, etc.) and never as standalone /resources rows.
  // The frontend's ComponentsBlock needs them as Dexie rows to render
  // sub-cards with drops/vaulted state, so we emit synthetic Blueprint
  // items for every component a parent declares.
  //
  // Display-name prefixing matches buildRequirements: components named
  // generically ("Blueprint", "Chassis") get prefixed with the parent's
  // name → "Ash Blueprint" / "Volt Prime Chassis" — which is also the
  // string WFCD's drops endpoint uses as the dropping item.
  const existingNames = new Set(items.map((i) => i.name));
  synthesizeComponents(parsed.warframes, items, existingNames, parsed);
  synthesizeComponents(parsed.weapons,   items, existingNames, parsed);
  synthesizeComponents(parsed.sentinels, items, existingNames, parsed);
  synthesizeComponents(parsed.pets,      items, existingNames, parsed);

  for (const item of items) {
    perCategory[item.category] = (perCategory[item.category] ?? 0) + 1;
  }

  const stats = computeStats(items, perCategory);

  log('built codex', { ms: Date.now() - t0, ...stats });

  return { items, stats };
}

// ─── Per-row emit ─────────────────────────────────────────────────────────────

function walkMap<V extends { uniqueName: string; name: string }>(
  map: Map<string, V> | null,
  label: string,
  visit: (row: V) => void,
): void {
  if (map == null) return;
  if (map.size === 0) {
    warn(`empty ${label} map — upstream returned no rows`);
    return;
  }
  for (const row of map.values()) {
    visit(row);
  }
}

function emit(
  items:      BuiltItem[],
  uniqueName: string,
  name:       string,
  category:   ItemCategory,
  source:     BuiltSource,
  parsed:     ParsedCodex,
): void {
  if (!uniqueName || !name) return;

  const drops = parsed.dropsByName?.get(name) ?? [];

  const item: BuiltItem = {
    uniqueName,
    name,
    category,
    source,
    drops,
  };

  if (category === 'Relic') {
    const contents = computeRelicContents(name, parsed.allDrops);
    if (contents.length > 0) item.relicContents = contents;
  }

  if (isPrimePart(name, category)) {
    const ducat = ducatFromDrops(drops);
    if (ducat !== undefined) item.ducatValue = ducat;
  }

  items.push(item);
}

// ─── Component synthesis ──────────────────────────────────────────────────────

/** Standard part nouns — matches the enricher's PART_SHORT_NAMES set. */
const PART_SHORT_NAMES = new Set([
  'Blueprint', 'Chassis', 'Neuroptics', 'Systems',
  'Harness', 'Wings', 'Carapace', 'Cerebrum',
  'Stock', 'Barrel', 'Receiver', 'Link', 'Grip', 'Blade',
  'Lower Limb', 'Upper Limb', 'String',
]);

function synthesizeComponents<P extends { uniqueName: string; name: string; components?: WfcdComponent[] }>(
  parents: Map<string, P> | null,
  items:        BuiltItem[],
  existing:     Set<string>,
  parsed:       ParsedCodex,
): void {
  if (parents == null) return;

  for (const parent of parents.values()) {
    if (!parent.components?.length) continue;
    for (const c of parent.components) {
      if (!c.name || !Number.isFinite(c.itemCount) || c.itemCount <= 0) continue;
      const displayName = PART_SHORT_NAMES.has(c.name) ? `${parent.name} ${c.name}` : c.name;
      if (existing.has(displayName)) continue;
      existing.add(displayName);

      // Synthetic uniqueName: prefer the component's own, fall back to a
      // derived one based on parent path. The frontend looks up by display
      // name, not uniqueName, so this only needs to be stable + unique.
      const uniqueName = c.uniqueName ?? `${parent.uniqueName}/Component/${slugify(c.name)}`;

      // Drops: prefer the per-component drops WFCD attaches to each component
      // record (no name-join needed, no ambiguity). Fall back to dropsByName
      // for components WFCD didn't enrich. Component drops carry their type
      // as the inventory name (e.g. "Volt Prime Chassis Blueprint"), which we
      // preserve as itemName so it shows correctly in drop tables.
      const drops: ParsedDrop[] = c.drops?.length
        ? c.drops.map((d) => componentDropToParsed(d, displayName))
        : (parsed.dropsByName?.get(displayName) ?? []);

      const componentRecord: ComponentRecord = {};
      if (c.imageName)   componentRecord.imageName   = c.imageName;
      if (c.description) componentRecord.description = c.description;
      if (typeof c.tradable === 'boolean') componentRecord.tradable = c.tradable;

      const item: BuiltItem = {
        uniqueName,
        name:      displayName,
        category:  'Blueprint',
        source:    'component',
        drops,
        componentRecord,
      };

      if (isPrimePart(displayName, 'Blueprint')) {
        const ducat = ducatFromDrops(drops);
        if (ducat !== undefined) item.ducatValue = ducat;
      }

      items.push(item);
    }
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Convert a WFCD per-component drop record into a ParsedDrop.
 *
 * WFCD's `location` is a free-text label like:
 *   "Axi V8 Relic"               — relic drops
 *   "Axi V8 Relic (Radiant)"     — relic-with-state
 *   "Earth/E Prime (Capture)"    — mission drops (rare for components)
 *
 * We classify by pattern. The `fallbackItemName` is the synthesized component
 * name (e.g. "Volt Prime Chassis"); we prefer WFCD's `type` field when present
 * because it matches what shows in player inventory.
 */
function componentDropToParsed(d: WfcdComponentDrop, fallbackItemName: string): ParsedDrop {
  const loc        = d.location ?? '';
  const itemName   = d.type ?? fallbackItemName;
  const chance     = typeof d.chance === 'number' && d.chance > 1.0001
    ? Math.min(d.chance / 100, 1)
    : (d.chance ?? 0);
  const rarity     = d.rarity ? normalizeDropRarity(d.rarity) : undefined;

  // Match "<Tier> <Name> Relic" or "<Tier> <Name> Relic (<State>)"
  const relicMatch = /^(Lith|Meso|Neo|Axi|Requiem)\s+([A-Z][A-Z0-9]*)\s+Relic(?:\s*\(([A-Za-z]+)\))?/i.exec(loc);
  if (relicMatch && relicMatch[1] && relicMatch[2]) {
    const tier  = relicMatch[1].charAt(0).toUpperCase() + relicMatch[1].slice(1).toLowerCase();
    const rname = relicMatch[2].toUpperCase();
    const state = (relicMatch[3] ?? 'Intact') as 'Intact' | 'Exceptional' | 'Flawless' | 'Radiant';
    const drop: ParsedDrop = {
      itemName,
      source:      'relic',
      chance,
      relicTier:   tier as 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem',
      relicName:   rname,
      relicState:  state,
      rawLocation: loc,
    };
    if (rarity) drop.rarity = rarity;
    return drop;
  }

  // Fall through: generic mission/bounty/unknown drop.
  const drop: ParsedDrop = {
    itemName,
    source:      'unknown',
    chance,
    rawLocation: loc || itemName,
  };
  if (rarity) drop.rarity = rarity;
  return drop;
}

function normalizeDropRarity(s: string): DropRarity | undefined {
  switch (s.toLowerCase().trim()) {
    case 'common':    return 'Common';
    case 'uncommon':  return 'Uncommon';
    case 'rare':      return 'Rare';
    case 'legendary': return 'Legendary';
    case 'cosmic':    return 'Cosmic';
    default:          return undefined;
  }
}

// ─── Category resolution ──────────────────────────────────────────────────────

/**
 * WFCD's /resources endpoint mixes raw materials, crafting ingredients, fish,
 * and warframe-part Resource rows. Sub-classify by uniqueName patterns so the
 * frontend can filter appropriately.
 */
function resolveResourceCategory(uniqueName: string, _name: string): ItemCategory {
  if (/Fish|\/Fishing\//i.test(uniqueName))     return 'Fish';
  if (/\/Ingredients?\//i.test(uniqueName))     return 'Ingredient';
  return 'Resource';
}

// ─── Relic content extraction ────────────────────────────────────────────────

/**
 * Parse a relic display name into (tier, name).
 *   "Lith A1 Relic"     → { tier: 'Lith', name: 'A1' }
 *   "Meso C7 Relic"     → { tier: 'Meso', name: 'C7' }
 *   "Requiem I Relic"   → { tier: 'Requiem', name: 'I' }
 */
function parseRelicLabel(name: string): { tier: string; name: string } | null {
  const m = /^(Lith|Meso|Neo|Axi|Requiem)\s+([A-Z][A-Z0-9]*)\b/i.exec(name);
  if (!m || !m[1] || !m[2]) return null;
  const tier = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return { tier, name: m[2].toUpperCase() };
}

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

// ─── Ducat values ─────────────────────────────────────────────────────────────

function isPrimePart(name: string, category: ItemCategory): boolean {
  if (!/\bPrime\b/.test(name)) return false;
  if (category === 'Sigil' || category === 'Glyph' || category === 'Cosmetic') return false;
  return true;
}

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

function computeStats(items: readonly BuiltItem[], perCategory: Record<string, number>): BuiltCodex['stats'] {
  let withDrops      = 0;
  let relicItems     = 0;
  let primeWithDucat = 0;

  for (const item of items) {
    if (item.drops.length > 0)         withDrops++;
    if (item.category === 'Relic')     relicItems++;
    if (item.ducatValue !== undefined) primeWithDucat++;
  }

  if (items.length > 0 && withDrops === 0) {
    warn('build produced zero items with drops — drops pipeline likely degraded');
  }

  return {
    totalItems:           items.length,
    itemsWithDrops:       withDrops,
    relicItems,
    primeItemsWithDucats: primeWithDucat,
    perCategory,
  };
}
