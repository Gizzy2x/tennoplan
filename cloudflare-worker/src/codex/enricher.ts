// ---------------------------------------------------------------------------
// Codex enricher — turn merged items into TennoplanItem-shaped records.
//
// Inputs:
//   • MergedCodex from merger.ts (per-item drops/recipe/relic-contents/ducat)
//   • ParsedCodex from parser.ts (lookup maps for cross-item resolution)
//
// What we add here:
//   • iconUrl + thumbUrl (resolved from calamity texture/image fields)
//   • dropLocations: ParsedDrop[] → DropLocation[] (final shape)
//   • bestFarms: scored efficiency ranking, top 5 (chance ÷ effort minutes)
//   • relicRewards: relicContents → RelicReward (collapsed by item, with
//     intact/exceptional/radiant chances per state)
//   • vaulted: a Prime part is vaulted iff none of its containing relics
//     currently appears as a mission/bounty/sortie/transient drop
//   • tradeable / marketable: category-based heuristic
//   • masteryRank: from raw.masteryRequirement
//   • rarity: from drop entries (highest tier observed)
//   • stats: per-category extraction (warframes: HP/shield/armor/...,
//             weapons: damage/firerate/crit/..., mods: drain/maxRank)
//   • abilities: from raw.abilities (warframes) or sentinelPowers (sentinels)
//   • polarities: from raw.polarities
//   • baseDrain: from raw (mods)
//   • buildRequirements: recipe.ingredients → { item, count } with display
//     names resolved via the global name index
//
// What we DON'T do (stays for normalizer / validator):
//   • Add metadata (dataVersion, lastUpdated, source, quality)
//   • Strip pipeline-internal fields
//   • Filter rows missing required fields
//   • Compute the codex-wide quality score
// ---------------------------------------------------------------------------

import { logger } from '../logger';
import type {
  ItemCategory,
  ItemRarity,
  DropLocation,
  BestFarmRecommendation,
  RelicReward,
  RelicTier,
  Rotation,
  BountyTier,
  ItemStats,
  Ability,
  BuildRequirement,
  TennoplanItem,
} from '../types';
import type { CalamityRow, ParsedCodex, ParsedDrop, DropRarity } from './parser';
import type { MergedCodex, MergedItem, RelicContent } from './merger';

const log = (msg: string, data?: unknown) => logger.info('codex-enricher', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn('codex-enricher', msg, data);

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Pre-final shape: every field of TennoplanItem except the metadata block
 * (dataVersion / lastUpdated / source / quality), plus pipeline-internal
 * hints that the normalizer / validator consume and strip.
 */
export type EnrichedItem =
  Omit<TennoplanItem, 'dataVersion' | 'lastUpdated' | 'source' | 'quality'>
  & {
    /** Reasons the validator should consider when scoring this item.
     *  Stripped by the normalizer. */
    _qualityHints?: string[];
  };

export interface EnrichedCodex {
  items: EnrichedItem[];
  stats: {
    totalItems:           number;
    itemsWithIcons:       number;
    itemsWithDrops:       number;
    itemsWithBestFarms:   number;
    itemsWithRelicReward: number;
    primeItemsTotal:      number;
    primeItemsVaulted:    number;
    qualityHintCounts:    Record<string, number>;
  };
}

// ─── Top-level entry point ────────────────────────────────────────────────────

export function enrichCodex(merged: MergedCodex, parsed: ParsedCodex): EnrichedCodex {
  const t0 = Date.now();

  const ctx = buildContext(merged, parsed);
  const items: EnrichedItem[] = [];
  const hintCounts: Record<string, number> = {};

  for (const m of merged.items) {
    const enriched = enrichItem(m, ctx);
    items.push(enriched);
    if (enriched._qualityHints) {
      for (const hint of enriched._qualityHints) {
        hintCounts[hint] = (hintCounts[hint] ?? 0) + 1;
      }
    }
  }

  const stats = computeStats(items, hintCounts);

  log('enriched codex', {
    ms: Date.now() - t0,
    items: items.length,
    withIcons: stats.itemsWithIcons,
    withDrops: stats.itemsWithDrops,
    withBestFarms: stats.itemsWithBestFarms,
    primeVaulted: `${stats.primeItemsVaulted}/${stats.primeItemsTotal}`,
  });

  if (stats.itemsWithIcons < items.length / 2) {
    warn('over half of items missing icons — calamity texture/image fields may have changed shape');
  }

  return { items, stats };
}

// ─── Enrichment context ───────────────────────────────────────────────────────

interface EnrichmentContext {
  parsed: ParsedCodex;
  /** All item display names → uniqueName, for ingredient resolution. */
  nameToUnique: Map<string, string>;
  /** Set of relic display names that currently appear as a drop in a
   *  non-relic source (mission/bounty/sortie/transient). Used for vaulted
   *  detection: a Prime part is vaulted iff NONE of its containing relics
   *  show up here. */
  activeRelics: Set<string>;
}

function buildContext(merged: MergedCodex, parsed: ParsedCodex): EnrichmentContext {
  // Display name → uniqueName. First entry wins on collisions; we'd rather
  // pick a stable mapping than oscillate between calamity patches.
  const nameToUnique = new Map<string, string>();
  for (const item of merged.items) {
    if (!nameToUnique.has(item.name)) {
      nameToUnique.set(item.name, item.uniqueName);
    }
  }

  // Walk every drop to find which relics are currently dropping. The drop
  // entries live on items already; checking parsed.allDrops is faster than
  // re-walking merged.items.drops.
  const activeRelics = new Set<string>();
  if (parsed.allDrops.length > 0) {
    for (const drop of parsed.allDrops) {
      if (drop.source === 'relic') continue;     // relic-content drops don't count
      if (looksLikeRelicName(drop.itemName)) activeRelics.add(drop.itemName);
    }
  }

  return { parsed, nameToUnique, activeRelics };
}

// ─── Per-item enrichment ──────────────────────────────────────────────────────

function enrichItem(m: MergedItem, ctx: EnrichmentContext): EnrichedItem {
  const hints: string[] = [];

  const { iconUrl, thumbUrl } = resolveIcons(m.raw);
  if (!iconUrl) hints.push('missing-icon');

  const dropLocations = m.drops.map(d => toDropLocation(d, m.uniqueName));
  if (m.drops.length > 0 && dropLocations.length === 0) hints.push('drops-not-mappable');

  const bestFarms = rankBestFarms(dropLocations);

  const relicRewards = m.relicContents ? buildRelicRewards(m.relicContents) : undefined;

  const masteryRank = pickNumber(m.raw, 'masteryRequirement', 'masteryReq', 'masteryRank');
  const rarity      = inferItemRarity(m.drops);
  const polarities  = pickStringArray(m.raw, 'polarities');
  const baseDrain   = pickNumber(m.raw, 'fusionLimit', 'baseDrain');
  const stats       = extractStats(m);
  const abilities   = extractAbilities(m, ctx);
  const buildRequirements = m.recipe?.ingredients
    ? buildIngredientList(m.recipe.ingredients, ctx)
    : undefined;
  const color       = pickString(m.raw, 'primaryColor', 'color');
  const type        = pickString(m.raw, 'productCategory', 'type', 'slot');
  const description = pickString(m.raw, 'description', 'codexSecret');
  void description; // reserved — TennoplanItem doesn't include description today

  const vaulted    = inferVaulted(m, ctx);
  const tradeable  = inferTradeable(m.category);
  const marketable = inferMarketable(m.category);

  // Required field check — flag for validator. We don't drop here; that's
  // validator's job. Just record so the run quality score reflects gaps.
  if (!m.uniqueName) hints.push('missing-uniqueName');
  if (!m.name)       hints.push('missing-name');
  if (!iconUrl)      hints.push('missing-icon');

  const item: EnrichedItem = {
    uniqueName: m.uniqueName,
    name:       m.name,
    category:   m.category,
    iconUrl:    iconUrl || PLACEHOLDER_ICON,
    dropLocations,
  };

  if (thumbUrl)                         item.thumbUrl     = thumbUrl;
  if (color)                            item.color        = color;
  if (type)                             item.type         = type;
  if (masteryRank !== undefined)        item.masteryRank  = masteryRank;
  if (rarity)                           item.rarity       = rarity;
  if (vaulted !== undefined)            item.vaulted      = vaulted;
  if (tradeable !== undefined)          item.tradeable    = tradeable;
  if (marketable !== undefined)         item.marketable   = marketable;
  if (bestFarms && bestFarms.length)    item.bestFarms    = bestFarms;
  if (relicRewards && relicRewards.length) item.relicRewards = relicRewards;
  if (stats)                            item.stats        = stats;
  if (abilities && abilities.length)    item.abilities    = abilities;
  if (polarities && polarities.length)  item.polarities   = polarities;
  if (baseDrain !== undefined)          item.baseDrain    = baseDrain;
  if (buildRequirements && buildRequirements.length) item.buildRequirements = buildRequirements;
  if (m.ducatValue !== undefined)       item.ducatValue   = m.ducatValue;
  if (hints.length)                     item._qualityHints = hints;

  return item;
}

// ─── Icon resolution ──────────────────────────────────────────────────────────
//
// Calamity rows expose icons via a small set of fields, in rough preference
// order:
//   • imageName  — warframestat-style hashed filename ("volt-9d8a7c.png")
//   • icon       — sometimes a path, sometimes a full URL
//   • textureLocation — internal Lotus path ("/Lotus/Interface/Icons/...")
//
// We try each in turn, defaulting to a slug-based CDN guess. Worst case the
// frontend's <ItemIcon> component falls back to /lotus-placeholder.svg.

const CDN_BASE     = 'https://cdn.warframestat.us/img';
const BROWSE_BASE  = 'https://browse.wf';
const PLACEHOLDER_ICON = '';   // empty string → frontend uses lotus placeholder

function resolveIcons(raw: CalamityRow): { iconUrl: string; thumbUrl?: string } {
  // 1. imageName — direct CDN filename
  const imageName = pickString(raw, 'imageName');
  if (imageName) return { iconUrl: `${CDN_BASE}/${imageName}` };

  // 2. icon — could be URL or relative
  const icon = pickString(raw, 'icon', 'iconImage');
  if (icon) {
    if (/^https?:\/\//i.test(icon)) return { iconUrl: icon };
    if (icon.startsWith('/'))       return { iconUrl: `${BROWSE_BASE}${icon}` };
    return { iconUrl: `${CDN_BASE}/${icon}` };
  }

  // 3. textureLocation — internal Lotus path served by browse.wf
  const tex = pickString(raw, 'textureLocation', 'parentName');
  if (tex && tex.startsWith('/')) return { iconUrl: `${BROWSE_BASE}${tex}` };

  // 4. last resort: name-slug. Frontend will degrade to placeholder if 404.
  if (typeof raw.name === 'string' && raw.name.length > 0) {
    return { iconUrl: `${CDN_BASE}/${slugifyName(raw.name)}.png` };
  }

  return { iconUrl: '' };
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Drop location conversion ─────────────────────────────────────────────────

function toDropLocation(drop: ParsedDrop, parentUniqueName: string): DropLocation {
  const sourceName = sourceLabel(drop);
  const location   = locationLabel(drop);

  const out: DropLocation = {
    uniqueName: parentUniqueName,
    location,
    sourceName,
    chance:     drop.chance,
  };

  if (drop.rotation)            out.rotation        = drop.rotation as Rotation;
  if (drop.rarity)              out.rarity          = mapRarity(drop.rarity);
  if (drop.isSteelPath)         out.isSteelPath     = true;
  if (drop.relicTier)           out.voidFissureTier = drop.relicTier as RelicTier;
  if (drop.bountyTier) {
    const mapped = mapBountyTier(drop.bountyTier);
    if (mapped) out.bountyTier = mapped;
  }

  // Mission node, when we parsed it cleanly.
  if (drop.node) {
    const missions: string[] = [];
    if (drop.planet && drop.node) missions.push(`${drop.planet}/${drop.node}`);
    else if (drop.node)           missions.push(drop.node);
    if (missions.length) out.missions = missions;
  }

  return out;
}

function sourceLabel(drop: ParsedDrop): string {
  switch (drop.source) {
    case 'mission':     return drop.isSteelPath ? 'Mission (Steel Path)' : 'Mission';
    case 'relic':       return 'Void Fissure';
    case 'sortie':      return 'Sortie';
    case 'arbitration': return 'Arbitration';
    case 'bounty':      return drop.bountyLocation ? `${drop.bountyLocation} Bounty` : 'Bounty';
    case 'transient':   return 'Event';
    case 'blueprint':   return 'Blueprint Location';
    case 'modByDrop':   return 'Enemy Drop';
    case 'key':         return 'Key Reward';
    case 'unknown':     return 'Unknown';
  }
}

function locationLabel(drop: ParsedDrop): string {
  switch (drop.source) {
    case 'mission': {
      const planet = drop.planet ?? '';
      const node   = drop.node ?? '';
      const mt     = drop.missionType ? ` (${drop.missionType})` : '';
      const rot    = drop.rotation ? ` — Rotation ${drop.rotation}` : '';
      const sp     = drop.isSteelPath ? ' [SP]' : '';
      const head   = node ? `${planet}/${node}${mt}` : planet;
      return `${head || drop.rawLocation || 'Mission'}${rot}${sp}`;
    }
    case 'relic': {
      const state = drop.relicState ? ` (${drop.relicState})` : '';
      return drop.relicTier && drop.relicName
        ? `${drop.relicTier} ${drop.relicName}${state}`
        : drop.rawLocation ?? 'Void Fissure';
    }
    case 'bounty': {
      const loc = drop.bountyLocation ?? 'Bounty';
      const tier = drop.bountyTier ? ` ${drop.bountyTier}` : '';
      const stage = drop.bountyStage ? ` (${drop.bountyStage})` : '';
      return `${loc} bounty${tier}${stage}`;
    }
    default:
      return drop.rawLocation ?? sourceLabel(drop);
  }
}

function mapRarity(r: DropRarity): ItemRarity {
  switch (r) {
    case 'Common':    return 'Common';
    case 'Uncommon':  return 'Uncommon';
    case 'Rare':      return 'Rare';
    case 'Legendary': return 'Legendary';
    case 'Cosmic':    return 'Legendary';   // cosmic is a "rarer than rare" tier; collapse to Legendary
  }
}

function mapBountyTier(raw: string): BountyTier | undefined {
  // WFCD bounty tiers come as "Level 5 - 15", "Level 30 - 40", etc.
  const m = /Level\s*(\d+)\s*-\s*(\d+)/i.exec(raw);
  if (!m || !m[1] || !m[2]) return undefined;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;

  if (lo <= 5  && hi <= 5)  return 'Lv1-5';
  if (lo <= 10 && hi <= 10) return 'Lv6-10';
  if (lo <= 15 && hi <= 15) return 'Lv11-15';
  if (lo <= 20 && hi <= 20) return 'Lv16-20';
  if (lo <= 25 && hi <= 25) return 'Lv21-25';
  if (lo <= 30 && hi <= 30) return 'Lv26-30';
  if (lo <= 40 && hi <= 40) return 'Lv31-40';
  if (lo <= 50 && hi <= 50) return 'Lv41-50';
  return undefined;
}

// ─── Best farms ranking ───────────────────────────────────────────────────────
//
// Composite efficiency: chance ÷ effort minutes, scaled to 0–100. Higher
// chance and lower mission length both push the score up. We cap at 100 so
// "10% chance in 1 minute" doesn't dominate the scale.

const MAX_RECOMMENDATIONS = 5;

function rankBestFarms(locations: readonly DropLocation[]): BestFarmRecommendation[] | undefined {
  if (locations.length === 0) return undefined;

  const scored = locations
    .filter(loc => loc.chance > 0)
    .map(loc => buildRecommendation(loc))
    .filter((rec): rec is BestFarmRecommendation => rec !== null)
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  return scored.slice(0, MAX_RECOMMENDATIONS);
}

function buildRecommendation(loc: DropLocation): BestFarmRecommendation | null {
  if (loc.chance <= 0) return null;
  const minutes = effortMinutesFor(loc);
  const score = Math.min(100, Math.round((loc.chance * 1000) / Math.max(minutes, 1)));
  const estimatedRuns = Math.max(1, Math.ceil(1 / loc.chance));
  const note = formatNote(loc, estimatedRuns, minutes);

  return {
    location: loc,
    efficiencyScore: score,
    estimatedRuns,
    ...(note ? { notes: note } : {}),
  };
}

function effortMinutesFor(loc: DropLocation): number {
  // Conservative estimates per source type. Tuned for "average AABC rotation"
  // semantics: a Survival drop at Rotation A is ~5 min; at C, the player is
  // committing to a 20-min run for the C reward, so we treat C as ~10 min.
  if (loc.sourceName.startsWith('Sortie'))      return 20;
  if (loc.sourceName.startsWith('Arbitration')) return 10;
  if (loc.sourceName.endsWith('Bounty'))         return 8;
  if (loc.sourceName === 'Void Fissure') {
    // Crack-time: Capture/Exterminate fissures land near 4 min; we add a
    // little buffer for relic acquisition on top.
    return 6;
  }

  if (loc.sourceName.startsWith('Mission')) {
    // Rotation matters: A=5, B=7, C=10
    if (loc.rotation === 'C') return 10;
    if (loc.rotation === 'B') return 7;
    return 5;
  }

  return 5;
}

function formatNote(loc: DropLocation, runs: number, minutes: number): string {
  const totalMin = runs * minutes;
  const readable = totalMin < 60
    ? `~${totalMin} min`
    : `~${Math.round(totalMin / 6) / 10} h`;
  const pct = (loc.chance * 100).toFixed(2);
  return `${pct}% — ~${runs} runs (${readable})`;
}

// ─── Relic rewards (final shape) ──────────────────────────────────────────────
//
// MergedItem.relicContents is one row per (item, state). RelicReward collapses
// this to one row per item with chances split by Intact / Exceptional /
// Radiant. Flawless usually shares Exceptional's chance row in WFCD; we map
// it to the Exceptional slot if Exceptional is missing.

function buildRelicRewards(contents: readonly RelicContent[]): RelicReward[] {
  const byItem = new Map<string, RelicReward>();

  for (const c of contents) {
    let entry = byItem.get(c.itemName);
    if (!entry) {
      entry = {
        item:   c.itemName,
        rarity: rarityFor(c.rarity),
        chancesPerRun: { intact: 0, exceptional: 0, radiant: 0 },
      };
      byItem.set(c.itemName, entry);
    }
    if (c.rarity) entry.rarity = rarityFor(c.rarity);
    switch (c.state) {
      case 'Intact':       entry.chancesPerRun.intact      = c.chance; break;
      case 'Exceptional':  entry.chancesPerRun.exceptional = c.chance; break;
      case 'Flawless':
        if (entry.chancesPerRun.exceptional === 0) entry.chancesPerRun.exceptional = c.chance;
        break;
      case 'Radiant':      entry.chancesPerRun.radiant     = c.chance; break;
    }
  }

  return [...byItem.values()];
}

function rarityFor(r: DropRarity | undefined): ItemRarity {
  if (!r) return 'Common';
  return mapRarity(r);
}

// ─── Vaulted detection ────────────────────────────────────────────────────────
//
// Definition: a Prime part is vaulted iff none of its containing relics
// currently appear as a drop in any non-relic source (mission, bounty,
// sortie, transient, blueprint, modByDrop, key).
//
// For non-Prime items we don't set vaulted (it's irrelevant).

function inferVaulted(m: MergedItem, ctx: EnrichmentContext): boolean | undefined {
  if (!isPrimePartByName(m.name, m.category)) return undefined;

  // Find every relic whose contents include this item.
  const containingRelics = new Set<string>();
  for (const drop of m.drops) {
    if (drop.source !== 'relic') continue;
    if (drop.relicTier && drop.relicName) {
      containingRelics.add(`${drop.relicTier} ${drop.relicName} Relic`);
    }
  }

  if (containingRelics.size === 0) return undefined;

  // Vaulted iff NO containing relic shows up in active drop sources.
  for (const relicName of containingRelics) {
    if (ctx.activeRelics.has(relicName)) return false;
  }
  return true;
}

function isPrimePartByName(name: string, category: ItemCategory): boolean {
  if (!/\bPrime\b/.test(name)) return false;
  if (category === 'Sigil' || category === 'Glyph' || category === 'Cosmetic') return false;
  return true;
}

function looksLikeRelicName(name: string): boolean {
  return /^(Lith|Meso|Neo|Axi|Requiem)\s+[A-Z][A-Z0-9]*\s+Relic/i.test(name);
}

// ─── Tradeable / marketable ───────────────────────────────────────────────────

function inferTradeable(category: ItemCategory): boolean | undefined {
  switch (category) {
    case 'Mod':
    case 'Relic':
    case 'Arcane':
    case 'Blueprint':
      return true;
    case 'Sigil':
    case 'Glyph':
    case 'Cosmetic':
    case 'Key':
    case 'Equipment':
      return false;
    default:
      return undefined;     // Warframe / Weapon / Companion / Sentinel etc. are tradeable as parts, not whole — leave undefined
  }
}

function inferMarketable(category: ItemCategory): boolean | undefined {
  switch (category) {
    case 'Mod':
    case 'Relic':
    case 'Arcane':
    case 'Blueprint':
      return true;
    case 'Resource':
    case 'Ingredient':
    case 'Fish':
    case 'Sigil':
    case 'Glyph':
    case 'Cosmetic':
    case 'Key':
    case 'Equipment':
      return false;
    default:
      return undefined;
  }
}

// ─── Rarity inference ─────────────────────────────────────────────────────────

function inferItemRarity(drops: readonly ParsedDrop[]): ItemRarity | undefined {
  // Highest-tier rarity wins. A part listed as Common in some relics and Rare
  // in others is treated as Rare for display purposes.
  let best: number = -1;
  let chosen: ItemRarity | undefined;
  for (const d of drops) {
    if (!d.rarity) continue;
    const tier = rarityTier(d.rarity);
    if (tier > best) { best = tier; chosen = mapRarity(d.rarity); }
  }
  return chosen;
}

function rarityTier(r: DropRarity): number {
  switch (r) {
    case 'Common':    return 1;
    case 'Uncommon':  return 2;
    case 'Rare':      return 3;
    case 'Legendary': return 4;
    case 'Cosmic':    return 5;
  }
}

// ─── Stats extraction ─────────────────────────────────────────────────────────

function extractStats(m: MergedItem): ItemStats | undefined {
  const r = m.raw;
  const stats: ItemStats = {};
  let any = false;

  // Warframe stats
  if (m.category === 'Warframe') {
    assignNum(stats, 'health',      r, 'health');
    assignNum(stats, 'shield',      r, 'shield');
    assignNum(stats, 'armor',       r, 'armor');
    assignNum(stats, 'energy',      r, 'power', 'energy');
    assignNum(stats, 'sprintSpeed', r, 'sprint', 'sprintSpeed');
    any = Object.keys(stats).length > 0;
  }

  // Weapon stats
  if (m.category === 'Weapon') {
    assignNum(stats, 'damage',         r, 'totalDamage', 'damage');
    assignNum(stats, 'fireRate',       r, 'fireRate');
    assignNum(stats, 'critChance',     r, 'criticalChance', 'criticalHitChance');
    assignNum(stats, 'critMultiplier', r, 'criticalMultiplier', 'criticalDamage');
    assignNum(stats, 'statusChance',   r, 'procChance', 'statusChance');
    assignNum(stats, 'magazine',       r, 'magazineSize', 'magazine');
    assignNum(stats, 'reload',         r, 'reloadTime', 'reload');
    any = any || Object.keys(stats).length > 0;
  }

  // Sentinel / Companion stats
  if (m.category === 'Sentinel' || m.category === 'Companion') {
    assignNum(stats, 'health',  r, 'health');
    assignNum(stats, 'shield',  r, 'shield');
    assignNum(stats, 'armor',   r, 'armor');
    any = any || Object.keys(stats).length > 0;
  }

  return any ? stats : undefined;
}

function assignNum(out: ItemStats, key: keyof ItemStats, raw: CalamityRow, ...candidates: string[]): void {
  for (const c of candidates) {
    const v = raw[c];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[key] = v;
      return;
    }
  }
}

// ─── Abilities extraction ─────────────────────────────────────────────────────
//
// Warframes: raw.abilities is usually [{ abilityName, description }, ...].
// Sentinels: raw.abilities is sometimes [{ uniqueName }] referencing rows in
// parsed.sentinelPowers, where the actual name/description live.

function extractAbilities(m: MergedItem, ctx: EnrichmentContext): Ability[] | undefined {
  const raw = m.raw['abilities'];
  if (!Array.isArray(raw)) return undefined;

  const out: Ability[] = [];
  for (const a of raw as unknown[]) {
    if (!a || typeof a !== 'object') continue;
    const ar = a as Record<string, unknown>;

    let name = pickStringOnly(ar, 'abilityName', 'name');
    let desc = pickStringOnly(ar, 'description', 'desc');
    const ref = pickStringOnly(ar, 'uniqueName', 'abilityUniqueName');

    if ((!name || !desc) && ref) {
      const power = ctx.parsed.sentinelPowers.get(ref);
      if (power) {
        if (!name) name = pickString(power, 'name');
        if (!desc) desc = pickString(power, 'description');
      }
    }

    if (!name) continue;
    const ability: Ability = { name, description: desc ?? '' };
    out.push(ability);
  }

  return out.length > 0 ? out : undefined;
}

// ─── Build requirements ───────────────────────────────────────────────────────

function buildIngredientList(
  ingredients: ReadonlyArray<{ itemType: string; itemCount: number }>,
  ctx: EnrichmentContext,
): BuildRequirement[] {
  const out: BuildRequirement[] = [];
  for (const ing of ingredients) {
    if (!ing.itemType || !Number.isFinite(ing.itemCount) || ing.itemCount <= 0) continue;
    const display = displayNameForUniqueName(ing.itemType, ctx) ?? prettifyUniqueName(ing.itemType);
    out.push({ item: display, count: ing.itemCount });
  }
  return out;
}

function displayNameForUniqueName(uniqueName: string, ctx: EnrichmentContext): string | undefined {
  // Inverse lookup: scan all calamity sources for this uniqueName. Cheap
  // because we only build/cache the search lazily here — and the worker
  // runs this 12-ish times per recipe at most.
  const p = ctx.parsed;
  return (
    p.warframes.get(uniqueName)?.name ??
    p.weapons.get(uniqueName)?.name ??
    p.sentinels.get(uniqueName)?.name ??
    p.mods.get(uniqueName)?.name ??
    p.recipes.get(uniqueName)?.name ??
    p.relicArcane.get(uniqueName)?.name ??
    p.resources.get(uniqueName)?.name ??
    p.keys.get(uniqueName)?.name ??
    p.flavour.get(uniqueName)?.name ??
    p.fusionBundles.get(uniqueName)?.name ??
    p.gear.get(uniqueName)?.name
  );
}

function prettifyUniqueName(s: string): string {
  // /Lotus/Types/Items/MiscItems/CommonGenericComponent → "CommonGenericComponent"
  const tail = s.split('/').pop() ?? s;
  return tail
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

// ─── Generic field pickers ────────────────────────────────────────────────────

function pickString(raw: CalamityRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function pickStringOnly(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function pickNumber(raw: CalamityRow, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function pickStringArray(raw: CalamityRow, ...keys: string[]): string[] | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (Array.isArray(v) && v.every(x => typeof x === 'string')) return v as string[];
  }
  return undefined;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function computeStats(items: readonly EnrichedItem[], hintCounts: Record<string, number>): EnrichedCodex['stats'] {
  let withIcons       = 0;
  let withDrops       = 0;
  let withBestFarms   = 0;
  let withRelicReward = 0;
  let primeTotal      = 0;
  let primeVaulted    = 0;

  for (const i of items) {
    if (i.iconUrl)                   withIcons++;
    if (i.dropLocations.length > 0)  withDrops++;
    if (i.bestFarms?.length)         withBestFarms++;
    if (i.relicRewards?.length)      withRelicReward++;
    if (isPrimePartByName(i.name, i.category)) {
      primeTotal++;
      if (i.vaulted === true) primeVaulted++;
    }
  }

  return {
    totalItems:           items.length,
    itemsWithIcons:       withIcons,
    itemsWithDrops:       withDrops,
    itemsWithBestFarms:   withBestFarms,
    itemsWithRelicReward: withRelicReward,
    primeItemsTotal:      primeTotal,
    primeItemsVaulted:    primeVaulted,
    qualityHintCounts:    hintCounts,
  };
}
