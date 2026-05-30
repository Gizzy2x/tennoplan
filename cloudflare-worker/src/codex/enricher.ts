// ---------------------------------------------------------------------------
// Codex enricher — turn BuiltItem records into TennoplanItem-shaped output.
//
// Inputs:
//   • BuiltCodex from builder.ts (per-item drops/relic/ducat)
//   • ParsedCodex from parser.ts (per-category WFCD records keyed by uniqueName)
//
// What we do:
//   • Resolve iconUrl from the WFCD record's `imageName`
//   • Convert ParsedDrop[] → DropLocation[] (final shape)
//   • Rank bestFarms: top 5 efficient drop sources per item
//   • Build relicRewards (collapsed Intact/Exceptional/Radiant chances)
//   • Detect vaulted state for Prime parts
//   • Set tradeable/marketable based on category + per-row tradable
//   • Extract per-category fields:
//       - Warframe: stats (health/shield/armor/...), abilities, polarities,
//                   auraPolarity, components → buildRequirements
//       - Weapon:   stats (damage/firerate/crit/...), components, masteryRank
//       - Mod:      levelStats, polarity, compatName, isAugment, isExilus,
//                   modSet, baseDrain, imageName
//       - Arcane:   levelStats, rarity
//       - Relic:    rewards collapsed into relicRewards
//       - Sentinel/Pet: stats, abilities, polarities, components
//   • Wiki-equivalent metadata: wikiUrl, introduced, releaseDate, patchHistory
//
// What we DON'T do (stays for normalizer / validator):
//   • Add metadata (dataVersion, lastUpdated, source, quality)
//   • Strip pipeline-internal hints
//   • Filter incomplete rows (validator's job)
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
  PatchLogEntry,
  IntroducedInfo,
} from '../types';
import type {
  ParsedCodex,
  ParsedDrop,
  DropRarity,
  WfcdMod,
  WfcdWarframe,
  WfcdWeapon,
  WfcdSentinel,
  WfcdPet,
  WfcdArcane,
  WfcdRelic,
  WfcdResource,
  WfcdGear,
  WfcdMisc,
  WfcdComponent,
  WfcdAbility,
  WfcdIntroduced,
  WfcdPatchLog,
} from './parser';
import type { BuiltCodex, BuiltItem, RelicContent } from './builder';

const log  = (msg: string, data?: unknown) => logger.info('codex-enricher', msg, data);
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

export function enrichCodex(built: BuiltCodex, parsed: ParsedCodex): EnrichedCodex {
  const t0 = Date.now();

  const ctx = buildContext(parsed);
  const items: EnrichedItem[] = [];
  const hintCounts: Record<string, number> = {};

  for (const m of built.items) {
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
    warn('over half of items missing icons — WFCD imageName field may have shifted');
  }

  return { items, stats };
}

// ─── Enrichment context ───────────────────────────────────────────────────────

interface EnrichmentContext {
  parsed: ParsedCodex;
  /** Set of relic display names that currently appear as a drop in a
   *  non-relic source. Used for vaulted detection. */
  activeRelics: Set<string>;
  /** Wiki-sourced per-warframe records (passive prose + Sex/Subsumed/etc).
   *  Wiki values take precedence over WFCD field-by-field when both are
   *  populated. Empty when the wiki fetch failed. */
  wikiWarframes: ReadonlyMap<string, import('./wikiWarframes').WikiWarframeRecord>;
}

function buildContext(parsed: ParsedCodex): EnrichmentContext {
  const activeRelics = new Set<string>();
  if (parsed.allDrops.length > 0) {
    for (const drop of parsed.allDrops) {
      if (drop.source === 'relic') continue;
      if (looksLikeRelicName(drop.itemName)) activeRelics.add(drop.itemName);
    }
  }
  return { parsed, activeRelics, wikiWarframes: parsed.wikiWarframes };
}

// ─── Per-item enrichment ──────────────────────────────────────────────────────

type WfcdAny =
  | WfcdMod | WfcdWarframe | WfcdWeapon | WfcdSentinel | WfcdPet
  | WfcdArcane | WfcdRelic | WfcdResource | WfcdGear | WfcdMisc;

function enrichItem(m: BuiltItem, ctx: EnrichmentContext): EnrichedItem {
  const hints: string[] = [];

  const wfcd = lookupWfcdRecord(m, ctx.parsed);

  // Synthetic component items don't have a per-category WFCD record —
  // their data comes from the embedded componentRecord on BuiltItem.
  const imageName = m.componentRecord?.imageName
    ?? (wfcd && 'imageName' in wfcd ? wfcd.imageName : undefined);
  const iconUrl   = resolveIconUrl(imageName, m.name);
  if (!iconUrl) hints.push('missing-icon');

  // Cap drop entries per item — frontend only renders a top-N list and the
  // long tail is the CPU/stringify hot spot for items like Hornet Strike (91
  // enemy drops). Sort by chance and keep the top 15.
  const sortedDrops = m.drops.length > MAX_DROP_LOCATIONS_PER_ITEM
    ? [...m.drops].sort((a, b) => b.chance - a.chance).slice(0, MAX_DROP_LOCATIONS_PER_ITEM)
    : m.drops;
  const dropLocations = sortedDrops.map(d => toDropLocation(d, m.uniqueName));
  if (m.drops.length > 0 && dropLocations.length === 0) hints.push('drops-not-mappable');

  const bestFarms = rankBestFarms(dropLocations);
  const relicRewards = m.relicContents ? buildRelicRewards(m.relicContents) : undefined;

  const description = m.componentRecord?.description
    ?? (wfcd && 'description' in wfcd ? wfcd.description : undefined);
  const introduced  = wfcd && 'introduced'  in wfcd && wfcd.introduced  ? toIntroduced(wfcd.introduced)   : undefined;
  const patchHistory = wfcd && 'patchlogs'   in wfcd && wfcd.patchlogs   ? toPatchHistory(wfcd.patchlogs) : undefined;
  const wikiUrl      = wfcd && 'wikiaUrl'    in wfcd ? wfcd.wikiaUrl    : undefined;
  const releaseDate  = wfcd && 'releaseDate' in wfcd ? wfcd.releaseDate : undefined;

  if (!m.uniqueName) hints.push('missing-uniqueName');
  if (!m.name)       hints.push('missing-name');

  const item: EnrichedItem = {
    uniqueName: m.uniqueName,
    name:       m.name,
    category:   m.category,
    iconUrl:    iconUrl || PLACEHOLDER_ICON,
    dropLocations,
  };

  if (description)                         item.description  = description;
  if (introduced)                          item.introduced   = introduced;
  if (patchHistory && patchHistory.length) item.patchHistory = patchHistory;
  if (wikiUrl)                             item.wikiUrl      = wikiUrl;
  if (releaseDate)                         item.releaseDate  = releaseDate;

  if (bestFarms && bestFarms.length)       item.bestFarms    = bestFarms;
  if (relicRewards && relicRewards.length) item.relicRewards = relicRewards;
  if (m.ducatValue !== undefined)          item.ducatValue   = m.ducatValue;

  // Default rarity inferred from drops; per-category overrides below.
  const rarity = inferItemRarity(m.drops);
  if (rarity) item.rarity = rarity;

  // Per-category field extraction.
  switch (m.source) {
    case 'mod':       applyModFields      (item, wfcd as WfcdMod | undefined);      break;
    case 'warframe':  applyWarframeFields (item, wfcd as WfcdWarframe | undefined, ctx); break;
    case 'weapon':    applyWeaponFields   (item, wfcd as WfcdWeapon | undefined);   break;
    case 'sentinel':  applySentinelFields (item, wfcd as WfcdSentinel | undefined); break;
    case 'pet':       applyPetFields      (item, wfcd as WfcdPet | undefined);      break;
    case 'arcane':    applyArcaneFields   (item, wfcd as WfcdArcane | undefined);   break;
    case 'relic':     applyRelicFields    (item, wfcd as WfcdRelic | undefined);    break;
    case 'resource':  applyResourceFields (item, wfcd as WfcdResource | undefined); break;
    case 'gear':      applyGearFields     (item, wfcd as WfcdGear | undefined);     break;
    case 'misc':      applyResourceFields (item, wfcd as WfcdMisc | undefined);     break;
    case 'component': /* fields already applied above via componentRecord */ break;
  }

  // Tradeable: per-row tradable wins (component's own tradable → WFCD's tradable → category default).
  const componentTradable = m.componentRecord?.tradable;
  const wfcdTradable      = wfcd && 'tradable' in wfcd && typeof wfcd.tradable === 'boolean' ? wfcd.tradable : undefined;
  const rowTradable       = componentTradable !== undefined ? componentTradable : wfcdTradable;
  const tradeable         = rowTradable !== undefined ? rowTradable : inferTradeable(m.category);
  if (tradeable !== undefined) item.tradeable = tradeable;

  const marketable = inferMarketable(m.category);
  if (marketable !== undefined) item.marketable = marketable;

  // Vaulted: relics carry it from WFCD directly; Prime parts infer from active relics.
  if (m.source === 'relic') {
    // applyRelicFields already set item.vaulted from WFCD's vaulted flag.
  } else {
    const vaulted = inferVaulted(m, ctx);
    if (vaulted !== undefined) item.vaulted = vaulted;
  }

  if (hints.length) item._qualityHints = hints;

  return item;
}

// ─── WFCD record lookup ───────────────────────────────────────────────────────

function lookupWfcdRecord(item: BuiltItem, parsed: ParsedCodex): WfcdAny | undefined {
  switch (item.source) {
    case 'mod':       return parsed.mods?.get      (item.uniqueName);
    case 'warframe':  return parsed.warframes?.get (item.uniqueName);
    case 'weapon':    return parsed.weapons?.get   (item.uniqueName);
    case 'sentinel':  return parsed.sentinels?.get (item.uniqueName);
    case 'pet':       return parsed.pets?.get      (item.uniqueName);
    case 'arcane':    return parsed.arcanes?.get   (item.uniqueName);
    case 'relic':     return parsed.relics?.get    (item.uniqueName);
    case 'resource':  return parsed.resources?.get (item.uniqueName);
    case 'gear':      return parsed.gear?.get      (item.uniqueName);
    case 'misc':      return parsed.misc?.get      (item.uniqueName);
    case 'component': return undefined;
  }
}

// ─── Per-category field application ───────────────────────────────────────────

function applyModFields(item: EnrichedItem, mod: WfcdMod | undefined): void {
  if (!mod) return;

  if (Array.isArray(mod.levelStats)) {
    const levelStats: string[][] = [];
    for (const ls of mod.levelStats) {
      levelStats.push(Array.isArray(ls?.stats) ? ls.stats.filter(s => typeof s === 'string') : []);
    }
    if (levelStats.length > 0) item.levelStats = levelStats;
  }

  if (mod.compatName)                  item.compatName   = mod.compatName.toUpperCase();
  if (mod.polarity)                    item.polarity     = mod.polarity;
  if (mod.isAugment)                   item.isAugment    = true;
  if (mod.isExilus)                    item.isExilus     = true;
  if (mod.imageName)                   item.imageName    = mod.imageName;
  if (mod.modSet)                     { item.modSet = mod.modSet; item.isSet = true; }
  if (mod.baseDrain !== undefined)     item.baseDrain    = mod.baseDrain;
  if (mod.transmutable !== undefined)  item.transmutable = mod.transmutable;

  const modRarity = asItemRarity(mod.rarity);
  if (modRarity) item.rarity = modRarity;
}

function applyWarframeFields(item: EnrichedItem, wf: WfcdWarframe | undefined, ctx: EnrichmentContext): void {
  if (!wf) return;

  if (wf.polarities?.length) item.polarities   = wf.polarities;
  if (wf.aura)               item.auraPolarity = wf.aura;

  if (wf.abilities?.length) {
    item.abilities = wf.abilities.map(toAbility);
  }

  const wiki = ctx.wikiWarframes.get(wf.name);

  // Wiki passive (pre-resolved prose) wins over WFCD (raw |TOKEN| template).
  if (wiki?.passive)              item.passiveDescription = wiki.passive;
  else if (wf.passiveDescription) item.passiveDescription = wf.passiveDescription;

  const stats: ItemStats = {};
  if (typeof wf.health      === 'number' && wf.health      > 0) stats.health      = wf.health;
  if (typeof wf.shield      === 'number' && wf.shield      > 0) stats.shield      = wf.shield;
  if (typeof wf.armor       === 'number' && wf.armor       > 0) stats.armor       = wf.armor;
  if (typeof wf.power       === 'number' && wf.power       > 0) stats.energy      = wf.power;
  if (typeof wf.sprintSpeed === 'number' && wf.sprintSpeed > 0) stats.sprintSpeed = wf.sprintSpeed;
  if (Object.keys(stats).length > 0) item.stats = stats;

  if (wf.components?.length) {
    const reqs = componentsToBuildRequirements(wf.components, wf.name);
    if (reqs.length > 0) item.buildRequirements = reqs;
  }

  if (wf.type) item.type = wf.type;

  // Wiki-sourced general info — pure wiki, no WFCD analogue.
  if (wiki) {
    if (wiki.sex)                                   item.sex                 = wiki.sex;
    if (wiki.subsumedAbility)                       item.subsumedAbility     = wiki.subsumedAbility;
    if (wiki.tacticalAbility)                       item.tacticalAbility     = wiki.tacticalAbility;
    if (wiki.progenitorElement)                     item.progenitorElement   = wiki.progenitorElement;
    if (wiki.themes)                                item.themes              = wiki.themes;
    if (wiki.playstyle?.length)                     item.playstyle           = wiki.playstyle;
    if (typeof wiki.initialEnergy === 'number')     item.initialEnergy       = wiki.initialEnergy;
    if (typeof wiki.sellPrice     === 'number')     item.sellPrice           = wiki.sellPrice;

    const r30: ItemStats = {};
    if (typeof wiki.healthRank30 === 'number' && wiki.healthRank30 > 0) r30.health = wiki.healthRank30;
    if (typeof wiki.shieldRank30 === 'number' && wiki.shieldRank30 > 0) r30.shield = wiki.shieldRank30;
    if (typeof wiki.energyRank30 === 'number' && wiki.energyRank30 > 0) r30.energy = wiki.energyRank30;
    if (typeof wiki.armorRank30  === 'number' && wiki.armorRank30  > 0) r30.armor  = wiki.armorRank30;
    if (Object.keys(r30).length > 0) item.statsRank30 = r30;
  }
}

function applyWeaponFields(item: EnrichedItem, w: WfcdWeapon | undefined): void {
  if (!w) return;

  const stats: ItemStats = {};
  if (typeof w.totalDamage         === 'number' && w.totalDamage         > 0) stats.damage           = w.totalDamage;
  if (typeof w.fireRate            === 'number' && w.fireRate            > 0) stats.fireRate         = w.fireRate;
  if (typeof w.criticalChance      === 'number' && w.criticalChance      > 0) stats.critChance       = w.criticalChance;
  if (typeof w.criticalMultiplier  === 'number' && w.criticalMultiplier  > 0) stats.critMultiplier   = w.criticalMultiplier;
  if (typeof w.procChance          === 'number' && w.procChance          > 0) stats.statusChance     = w.procChance;
  if (typeof w.magazineSize        === 'number' && w.magazineSize        > 0) stats.magazine         = w.magazineSize;
  if (typeof w.reloadTime          === 'number' && w.reloadTime          > 0) stats.reload           = w.reloadTime;
  if (typeof w.omegaAttenuation    === 'number' && w.omegaAttenuation    > 0) stats.rivenDisposition = w.omegaAttenuation;
  if (typeof w.accuracy            === 'number' && w.accuracy            > 0) stats.accuracy         = w.accuracy;
  // Melee numerics — only emit when present so frontend can switch layout
  // on group presence rather than weapon-class detection.
  if (typeof w.range               === 'number' && w.range               > 0) stats.range            = w.range;
  if (typeof w.blockingAngle       === 'number' && w.blockingAngle       > 0) stats.blockingAngle    = w.blockingAngle;
  if (typeof w.comboDuration       === 'number' && w.comboDuration       > 0) stats.comboDuration    = w.comboDuration;
  if (typeof w.followThrough       === 'number' && w.followThrough       > 0) stats.followThrough    = w.followThrough;
  if (typeof w.slamAttack          === 'number' && w.slamAttack          > 0) stats.slamAttack       = w.slamAttack;
  if (typeof w.slamRadialDamage    === 'number' && w.slamRadialDamage    > 0) stats.slamRadialDamage = w.slamRadialDamage;
  if (Object.keys(stats).length > 0) item.stats = stats;

  if (typeof w.masteryReq === 'number') item.masteryRank   = w.masteryReq;
  if (w.polarities?.length)             item.polarities    = w.polarities;
  if (w.type)                           item.type          = w.type;
  if (w.productCategory)                item.subtype       = w.productCategory;
  if (w.trigger)                        item.weaponTrigger = w.trigger;
  if (w.noise)                          item.weaponNoise   = w.noise;
  if (w.damage && Object.keys(w.damage).length > 0) item.damageTypes = w.damage;

  if (w.components?.length) {
    const reqs = componentsToBuildRequirements(w.components, w.name);
    if (reqs.length > 0) item.buildRequirements = reqs;
  }
}

function applySentinelFields(item: EnrichedItem, s: WfcdSentinel | undefined): void {
  if (!s) return;

  const stats: ItemStats = {};
  if (typeof s.health === 'number' && s.health > 0) stats.health = s.health;
  if (typeof s.shield === 'number' && s.shield > 0) stats.shield = s.shield;
  if (typeof s.armor  === 'number' && s.armor  > 0) stats.armor  = s.armor;
  if (Object.keys(stats).length > 0) item.stats = stats;

  if (s.polarities?.length)             item.polarities  = s.polarities;
  if (typeof s.masteryReq === 'number') item.masteryRank = s.masteryReq;
  if (s.abilities?.length)              item.abilities   = s.abilities.map(toAbility);

  if (s.components?.length) {
    const reqs = componentsToBuildRequirements(s.components, s.name);
    if (reqs.length > 0) item.buildRequirements = reqs;
  }
}

function applyPetFields(item: EnrichedItem, p: WfcdPet | undefined): void {
  if (!p) return;

  const stats: ItemStats = {};
  if (typeof p.health === 'number' && p.health > 0) stats.health = p.health;
  if (typeof p.shield === 'number' && p.shield > 0) stats.shield = p.shield;
  if (typeof p.armor  === 'number' && p.armor  > 0) stats.armor  = p.armor;
  if (Object.keys(stats).length > 0) item.stats = stats;

  if (p.polarities?.length)             item.polarities  = p.polarities;
  if (typeof p.masteryReq === 'number') item.masteryRank = p.masteryReq;
  if (p.abilities?.length)              item.abilities   = p.abilities.map(toAbility);
  if (p.type)                           item.type        = p.type;

  if (p.components?.length) {
    const reqs = componentsToBuildRequirements(p.components, p.name);
    if (reqs.length > 0) item.buildRequirements = reqs;
  }
}

function applyArcaneFields(item: EnrichedItem, a: WfcdArcane | undefined): void {
  if (!a) return;

  if (Array.isArray(a.levelStats)) {
    const levelStats: string[][] = [];
    for (const ls of a.levelStats) {
      levelStats.push(Array.isArray(ls?.stats) ? ls.stats.filter(s => typeof s === 'string') : []);
    }
    if (levelStats.length > 0) item.levelStats = levelStats;
  }

  const r = asItemRarity(a.rarity);
  if (r) item.rarity = r;

  if (a.type) item.type = a.type;
}

function applyRelicFields(item: EnrichedItem, r: WfcdRelic | undefined): void {
  if (!r) return;
  if (typeof r.vaulted === 'boolean') item.vaulted = r.vaulted;
  if (r.tier)                          item.type    = r.tier;
}

function applyResourceFields(item: EnrichedItem, r: WfcdResource | WfcdMisc | undefined): void {
  if (!r) return;
  if (r.type) item.type = r.type;
}

function applyGearFields(item: EnrichedItem, g: WfcdGear | undefined): void {
  if (!g) return;
  if (g.type) item.type = g.type;
}

// ─── Component → BuildRequirement ─────────────────────────────────────────────

/** Standard part nouns — distinguishes parts from generic resources. */
const PART_SHORT_NAMES = new Set([
  'Blueprint', 'Chassis', 'Neuroptics', 'Systems',
  'Harness', 'Wings', 'Carapace', 'Cerebrum',
  'Stock', 'Barrel', 'Receiver', 'Link', 'Grip', 'Blade',
  'Lower Limb', 'Upper Limb', 'String',
]);

/**
 * WFCD ships generic short component names ("Blueprint", "Chassis") because
 * the parent context is implicit. Frontend's ComponentsBlock looks rows
 * up by exact name in Dexie — where they live as "Ash Blueprint", "Ash
 * Chassis" — so we prefix the generic shorts with the parent name.
 */
function componentsToBuildRequirements(components: readonly WfcdComponent[], parentName: string): BuildRequirement[] {
  const reqs: BuildRequirement[] = [];
  for (const c of components) {
    if (!c.name || !Number.isFinite(c.itemCount) || c.itemCount <= 0) continue;
    const item = PART_SHORT_NAMES.has(c.name) ? `${parentName} ${c.name}` : c.name;
    reqs.push({ item, count: c.itemCount });
  }
  return reqs;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function toAbility(a: WfcdAbility): Ability {
  const out: Ability = {
    name:        a.name,
    description: a.description ?? '',
  };
  if (a.imageName) out.imageName = a.imageName;
  return out;
}

function toIntroduced(i: WfcdIntroduced): IntroducedInfo {
  const out: IntroducedInfo = { name: i.name };
  if (i.date)   out.date   = i.date;
  if (i.url)    out.url    = i.url;
  if (i.parent) out.parent = i.parent;
  return out;
}

function toPatchHistory(logs: readonly WfcdPatchLog[]): PatchLogEntry[] {
  return logs.map((p) => {
    const entry: PatchLogEntry = { name: p.name, date: p.date };
    if (p.url)       entry.url       = p.url;
    if (p.additions) entry.additions = p.additions;
    if (p.changes)   entry.changes   = p.changes;
    if (p.fixes)     entry.fixes     = p.fixes;
    return entry;
  });
}

// ─── Icon resolution ──────────────────────────────────────────────────────────

const CDN_BASE = 'https://cdn.warframestat.us/img';
const PLACEHOLDER_ICON = '';   // empty string → frontend uses lotus placeholder

function resolveIconUrl(imageName: string | undefined, displayName: string): string {
  if (imageName && imageName.length > 0) return `${CDN_BASE}/${imageName}`;
  if (displayName && displayName.length > 0) return `${CDN_BASE}/${slugifyName(displayName)}.png`;
  return '';
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
    case 'Cosmic':    return 'Legendary';
  }
}

function mapBountyTier(raw: string): BountyTier | undefined {
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

const MAX_RECOMMENDATIONS = 5;
const MAX_DROP_LOCATIONS_PER_ITEM = 15;

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
  if (loc.sourceName.startsWith('Sortie'))      return 20;
  if (loc.sourceName.startsWith('Arbitration')) return 10;
  if (loc.sourceName.endsWith('Bounty'))        return 8;
  if (loc.sourceName === 'Void Fissure')        return 6;
  if (loc.sourceName.startsWith('Mission')) {
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
// currently appear as a drop in any non-relic source.
// For non-Prime items we don't set vaulted (it's irrelevant).

function inferVaulted(m: BuiltItem, ctx: EnrichmentContext): boolean | undefined {
  if (!isPrimePartByName(m.name, m.category)) return undefined;

  const containingRelics = new Set<string>();
  for (const drop of m.drops) {
    if (drop.source !== 'relic') continue;
    if (drop.relicTier && drop.relicName) {
      containingRelics.add(`${drop.relicTier} ${drop.relicName} Relic`);
    }
  }

  if (containingRelics.size === 0) return undefined;

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
      return undefined;
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

function asItemRarity(raw: string | undefined): ItemRarity | undefined {
  switch (raw) {
    case 'Legendary':
    case 'Rare':
    case 'Uncommon':
    case 'Common':
      return raw;
    default:
      return undefined;
  }
}

// ─── Stats roll-up ────────────────────────────────────────────────────────────

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
