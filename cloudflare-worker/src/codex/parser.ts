// ---------------------------------------------------------------------------
// Codex parser — turn raw WFCD JSON into per-category typed lookup maps.
//
// WFCD-only pipeline (post-2026-05-26 refactor). Each per-category blob is
// already in @wfcd/items shape: explicit fields, English strings, normalised
// polarities. No locale resolution needed.
//
// Drops come location-keyed (planet → node → rotation → reward[]). Builder
// needs item-keyed lookup, so we INVERT here: every reward becomes a flat
// ParsedDrop with full source context, then we group by `itemName`.
//
// Defensive style: every field access through optional chaining, every
// shape-narrowing wrapped. WFCD occasionally renames fields between releases;
// we'd rather drop a row than throw the whole sync.
// ---------------------------------------------------------------------------

import { logger } from '../logger';
import type { RawCodexBlobs } from './fetcher';

const log  = (msg: string, data?: unknown) => logger.info ('codex-parser', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn ('codex-parser', msg, data);

// ─── Shared WFCD record fragments ─────────────────────────────────────────────

export interface WfcdIntroduced {
  name:    string;
  date?:   string;
  url?:    string;
  parent?: string;
}

export interface WfcdPatchLog {
  name:       string;
  date:       string;
  url?:       string;
  additions?: string;
  changes?:   string;
  fixes?:     string;
}

/** Component sub-piece, used by warframes / weapons / sentinels / pets. */
export interface WfcdComponent {
  uniqueName?:  string;
  name:         string;
  description?: string;
  itemCount:    number;
  imageName?:   string;
  tradable?:    boolean;
  /**
   * Drops attached directly to this component by WFCD — already joined,
   * no name lookup needed. Each entry: { location, type, chance, rarity, uniqueName }.
   * `type` is the drop's inventory name (e.g. "Volt Prime Chassis Blueprint")
   * which differs from our synthesized item name ("Volt Prime Chassis"). We
   * consume these directly in the builder rather than via dropsByName.
   */
  drops?:       WfcdComponentDrop[];
}

export interface WfcdComponentDrop {
  location?:    string;
  type?:        string;
  chance?:      number;
  rarity?:      string;
  uniqueName?:  string;
}

// ─── Per-category records ─────────────────────────────────────────────────────

export interface WfcdMod {
  uniqueName:   string;
  name:         string;
  levelStats?:  Array<{ stats?: string[] }>;
  polarity?:    string;
  rarity?:      string;
  baseDrain?:   number;
  compatName?:  string;
  description?: string;
  isAugment?:   boolean;
  isExilus?:    boolean;
  modSet?:      string;
  imageName?:   string;
  tradable?:    boolean;
  type?:        string;
  wikiaUrl?:    string;
  releaseDate?: string;
  transmutable?: boolean;
  introduced?:  WfcdIntroduced;
  patchlogs?:   WfcdPatchLog[];
}

export interface WfcdWarframe {
  uniqueName:   string;
  name:         string;
  description?: string;
  polarities?:  string[];
  aura?:        string;
  abilities?:   WfcdAbility[];
  components?:  WfcdComponent[];
  health?:      number;
  shield?:      number;
  armor?:       number;
  power?:       number;
  sprintSpeed?: number;
  wikiaUrl?:    string;
  releaseDate?: string;
  introduced?:  WfcdIntroduced;
  patchlogs?:   WfcdPatchLog[];
  masterable?:  boolean;
  isPrime?:     boolean;
  imageName?:          string;
  type?:               string;
  passiveDescription?: string;
}

export interface WfcdAbility {
  uniqueName:  string;
  name:        string;
  description: string;
  imageName?:  string;
}

export interface WfcdWeapon {
  uniqueName:        string;
  name:              string;
  description?:      string;
  type?:             string;
  category?:         string;
  productCategory?:  string;
  masteryReq?:       number;
  totalDamage?:      number;
  fireRate?:         number;
  criticalChance?:   number;
  criticalMultiplier?: number;
  procChance?:       number;
  magazineSize?:     number;
  reloadTime?:       number;
  components?:       WfcdComponent[];
  imageName?:        string;
  wikiaUrl?:         string;
  introduced?:       WfcdIntroduced;
  patchlogs?:        WfcdPatchLog[];
  releaseDate?:      string;
  tradable?:         boolean;
  isPrime?:          boolean;
  polarities?:       string[];
  /** Per-damage-type breakdown — keys like 'impact', 'slash', 'puncture',
   *  'heat', 'cold', 'electricity', 'toxin', combined elements, etc.
   *  Values are absolute damage on a single shot/hit. */
  damage?:           Record<string, number>;
  /** Riven disposition multiplier (0.50–1.55). Drives the in-game dot count
   *  on the modding screen. We surface both the raw number and a derived
   *  1–5 dot count in the frontend. */
  omegaAttenuation?: number;
  /** Ranged-only — projectile/hitscan accuracy (higher = tighter). */
  accuracy?:         number;
  /** "Silent" | "Alarming" — affects enemy aggro on un-suppressed shots. */
  noise?:            string;
  /** "Auto" | "Semi-Auto" | "Burst" | "Held" | "Charge" | "Active". */
  trigger?:          string;
  // Melee-specific numerics. Absent on ranged weapons.
  range?:            number;
  blockingAngle?:    number;
  comboDuration?:    number;
  followThrough?:    number;
  slamAttack?:       number;
  slamRadialDamage?: number;
}

export interface WfcdSentinel {
  uniqueName:   string;
  name:         string;
  description?: string;
  health?:      number;
  shield?:      number;
  armor?:       number;
  components?:  WfcdComponent[];
  imageName?:   string;
  wikiaUrl?:    string;
  introduced?:  WfcdIntroduced;
  patchlogs?:   WfcdPatchLog[];
  releaseDate?: string;
  tradable?:    boolean;
  isPrime?:     boolean;
  polarities?:  string[];
  abilities?:   WfcdAbility[];
  masteryReq?:  number;
}

export interface WfcdPet {
  uniqueName:   string;
  name:         string;
  description?: string;
  health?:      number;
  shield?:      number;
  armor?:       number;
  components?:  WfcdComponent[];
  imageName?:   string;
  wikiaUrl?:    string;
  introduced?:  WfcdIntroduced;
  patchlogs?:   WfcdPatchLog[];
  releaseDate?: string;
  tradable?:    boolean;
  polarities?:  string[];
  abilities?:   WfcdAbility[];
  masteryReq?:  number;
  type?:        string;
}

export interface WfcdArcane {
  uniqueName:   string;
  name:         string;
  description?: string;
  rarity?:      string;
  levelStats?:  Array<{ stats?: string[] }>;
  imageName?:   string;
  wikiaUrl?:    string;
  introduced?:  WfcdIntroduced;
  patchlogs?:   WfcdPatchLog[];
  releaseDate?: string;
  tradable?:    boolean;
  type?:        string;
}

export interface WfcdRelic {
  uniqueName:   string;
  name:         string;
  description?: string;
  rewards?:     WfcdRelicReward[];
  imageName?:   string;
  wikiaUrl?:    string;
  vaulted?:     boolean;
  tier?:        string;
  locations?:   string[];
}

export interface WfcdRelicReward {
  itemName?:   string;
  rarity?:     string;
  chance?:     number;
  rotation?:   string;
}

export interface WfcdResource {
  uniqueName:   string;
  name:         string;
  description?: string;
  type?:        string;
  category?:    string;
  imageName?:   string;
  wikiaUrl?:    string;
  tradable?:    boolean;
  /** Items that this resource is a component of (rare; some prime-part rows expose it). */
  parents?:     string[];
}

export interface WfcdGear {
  uniqueName:   string;
  name:         string;
  description?: string;
  type?:        string;
  imageName?:   string;
  wikiaUrl?:    string;
  tradable?:    boolean;
}

/**
 * Misc — WFCD's catch-all for core crafting resources that /resources skips:
 * Orokin Cell, Argon Crystal, Neural Sensors, Forma, Orokin Catalyst, etc.
 * Same shape as WfcdResource; classified as Resource downstream.
 */
export interface WfcdMisc {
  uniqueName:   string;
  name:         string;
  description?: string;
  type?:        string;
  category?:    string;
  imageName?:   string;
  wikiaUrl?:    string;
  tradable?:    boolean;
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
  // Per-category maps keyed by uniqueName. null when the upstream fetch failed.
  mods:        Map<string, WfcdMod>      | null;
  warframes:   Map<string, WfcdWarframe> | null;
  weapons:     Map<string, WfcdWeapon>   | null;
  sentinels:   Map<string, WfcdSentinel> | null;
  pets:        Map<string, WfcdPet>      | null;
  arcanes:     Map<string, WfcdArcane>   | null;
  relics:      Map<string, WfcdRelic>    | null;
  resources:   Map<string, WfcdResource> | null;
  gear:        Map<string, WfcdGear>     | null;
  misc:        Map<string, WfcdMisc>     | null;

  // Drops indexed by item display name (case-preserved). null = drops fetch failed.
  dropsByName: Map<string, ParsedDrop[]> | null;
  /** All drops as a flat list — used for relic content lookup + active-relic detection. */
  allDrops:    ParsedDrop[];

  /** Wiki-sourced per-warframe records (passive prose + Sex/Subsumed/etc),
   *  keyed by warframe display name. Empty when the wiki fetch failed;
   *  enricher treats absent fields as "no override". */
  wikiWarframes: ReadonlyMap<string, import('./wikiWarframes').WikiWarframeRecord>;

  // Source / quality bookkeeping
  hasDrops:    boolean;
  dropsSource: 'wfcd' | 'wfcd-github' | null;
  stats: {
    totalItems:   number;
    totalDrops:   number;
    perCategory:  Record<string, number>;
  };
}

// ─── Top-level entry point ────────────────────────────────────────────────────

export function parseCodex(blobs: RawCodexBlobs): ParsedCodex {
  const t0 = Date.now();

  const mods      = blobs.mods      != null ? parseWfcdMods     (blobs.mods)      : null;
  const warframes = blobs.warframes != null ? parseWfcdWarframes(blobs.warframes) : null;
  const weapons   = blobs.weapons   != null ? parseWfcdWeapons  (blobs.weapons)   : null;
  const sentinels = blobs.sentinels != null ? parseWfcdSentinels(blobs.sentinels) : null;
  const pets      = blobs.pets      != null ? parseWfcdPets     (blobs.pets)      : null;
  const arcanes   = blobs.arcanes   != null ? parseWfcdArcanes  (blobs.arcanes)   : null;
  const relics    = blobs.relics    != null ? parseWfcdRelics   (blobs.relics)    : null;
  const resources = blobs.resources != null ? parseWfcdResources(blobs.resources) : null;
  const gear      = blobs.gear      != null ? parseWfcdGear     (blobs.gear)      : null;
  const misc      = blobs.misc      != null ? parseWfcdMisc     (blobs.misc)      : null;

  const drops       = blobs.drops != null ? parseDrops(blobs.drops) : null;
  const dropsByName = drops != null ? indexDropsByName(drops) : null;
  const allDrops    = drops ?? [];

  const perCategory: Record<string, number> = {
    mods:      mods?.size      ?? 0,
    warframes: warframes?.size ?? 0,
    weapons:   weapons?.size   ?? 0,
    sentinels: sentinels?.size ?? 0,
    pets:      pets?.size      ?? 0,
    arcanes:   arcanes?.size   ?? 0,
    relics:    relics?.size    ?? 0,
    resources: resources?.size ?? 0,
    gear:      gear?.size      ?? 0,
    misc:      misc?.size      ?? 0,
  };
  const totalItems = Object.values(perCategory).reduce((sum, n) => sum + n, 0);

  const result: ParsedCodex = {
    mods, warframes, weapons, sentinels, pets, arcanes, relics, resources, gear, misc,
    dropsByName,
    allDrops,
    wikiWarframes: blobs.wikiWarframes,
    hasDrops:    drops != null && drops.length > 0,
    dropsSource: blobs.dropsSource,
    stats: {
      totalItems,
      totalDrops:  allDrops.length,
      perCategory,
    },
  };

  log('parsed codex', {
    ms:          Date.now() - t0,
    totalItems,
    perCategory,
    drops:       allDrops.length,
    dropsSource: blobs.dropsSource ?? 'unavailable',
  });

  return result;
}

// ─── WFCD Mods ────────────────────────────────────────────────────────────────
//
// Returns a Map keyed by uniqueName. Every field is preserved as-is — the
// enricher decides which ones to copy onto TennoplanItem.

const KNOWN_POLARITIES = new Set([
  'madurai', 'vazarin', 'naramon', 'zenurik', 'unairu',
  'penjaga', 'umbra', 'aura', 'universal', 'none',
]);

// Real-world baseline: ~10% of mods legitimately lack levelStats (stance
// variants, focus ways, mod-set bonus tokens). Threshold catches catastrophic
// upstream shape changes (50%+); normal variance stays quiet.
const SHAPE_DRIFT_THRESHOLD_PCT = 25;

export function parseWfcdMods(raw: unknown): Map<string, WfcdMod> {
  const out = new Map<string, WfcdMod>();
  if (!Array.isArray(raw)) {
    warn('wfcd /mods response is not an array — upstream shape may have changed', {
      type: raw === null ? 'null' : typeof raw,
    });
    return out;
  }

  let missingLevelStats = 0;
  let missingPolarity   = 0;
  let missingRarity     = 0;
  let unknownPolarity   = 0;
  let droppedRows       = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const mod: WfcdMod = { uniqueName, name };

    if (Array.isArray(row['levelStats'])) mod.levelStats = row['levelStats'] as WfcdMod['levelStats'];
    else                                   missingLevelStats++;

    if (typeof row['polarity'] === 'string') {
      mod.polarity = row['polarity'];
      if (!KNOWN_POLARITIES.has(mod.polarity)) unknownPolarity++;
    } else {
      missingPolarity++;
    }

    if (typeof row['rarity'] === 'string') mod.rarity = row['rarity'];
    else                                   missingRarity++;

    if (typeof row['baseDrain']    === 'number')  mod.baseDrain    = row['baseDrain']    as number;
    if (typeof row['compatName']   === 'string')  mod.compatName   = row['compatName']   as string;
    if (typeof row['description']  === 'string')  mod.description  = row['description']  as string;
    if (typeof row['imageName']    === 'string')  mod.imageName    = row['imageName']    as string;
    if (typeof row['modSet']       === 'string')  mod.modSet       = row['modSet']       as string;
    if (typeof row['type']         === 'string')  mod.type         = row['type']         as string;
    if (row['isAugment'] === true) mod.isAugment = true;
    if (row['isExilus']  === true) mod.isExilus  = true;
    if (typeof row['tradable']     === 'boolean') mod.tradable     = row['tradable']     as boolean;
    if (typeof row['wikiaUrl']     === 'string')  mod.wikiaUrl     = row['wikiaUrl']     as string;
    if (typeof row['releaseDate']  === 'string')  mod.releaseDate  = row['releaseDate']  as string;
    if (typeof row['transmutable'] === 'boolean') mod.transmutable = row['transmutable'] as boolean;

    const introduced = parseIntroduced(row['introduced']);
    if (introduced) mod.introduced = introduced;

    const patchlogs = parsePatchLogs(row['patchlogs']);
    if (patchlogs.length > 0) mod.patchlogs = patchlogs;

    if (!out.has(uniqueName)) out.set(uniqueName, mod);
  }

  const total = out.size;
  const pct = (n: number) => total === 0 ? 100 : Math.round((n / total) * 1000) / 10;

  log('parsed wfcd mods', {
    total,
    droppedRows,
    missingLevelStats: `${missingLevelStats} (${pct(missingLevelStats)}%)`,
    missingPolarity:   `${missingPolarity} (${pct(missingPolarity)}%)`,
    missingRarity:     `${missingRarity} (${pct(missingRarity)}%)`,
    unknownPolarity,
  });

  if (total === 0) warn('wfcd /mods produced ZERO mods — upstream shape likely broke');
  if (pct(missingLevelStats) > SHAPE_DRIFT_THRESHOLD_PCT) {
    warn('wfcd /mods shape may have shifted — many entries lack levelStats', { missingLevelStats, total });
  }
  if (pct(missingPolarity) > SHAPE_DRIFT_THRESHOLD_PCT) {
    warn('wfcd /mods shape may have shifted — many entries lack polarity', { missingPolarity, total });
  }

  return out;
}

// ─── WFCD Warframes ───────────────────────────────────────────────────────────

export function parseWfcdWarframes(raw: unknown): Map<string, WfcdWarframe> {
  const out = new Map<string, WfcdWarframe>();
  if (!Array.isArray(raw)) {
    warn('wfcd /warframes response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows       = 0;
  let missingPolarities = 0;
  let missingAbilities  = 0;
  let missingComponents = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const wf: WfcdWarframe = { uniqueName, name };

    if (Array.isArray(row['polarities']) && (row['polarities'] as unknown[]).every(p => typeof p === 'string')) {
      wf.polarities = row['polarities'] as string[];
    } else {
      missingPolarities++;
    }
    if (typeof row['aura']               === 'string') wf.aura               = row['aura']               as string;
    if (typeof row['description']        === 'string') wf.description        = row['description']        as string;
    if (typeof row['passiveDescription'] === 'string') wf.passiveDescription = row['passiveDescription'] as string;
    if (typeof row['imageName']          === 'string') wf.imageName          = row['imageName']          as string;
    if (typeof row['type']               === 'string') wf.type               = row['type']               as string;
    if (typeof row['health']      === 'number') wf.health      = row['health']      as number;
    if (typeof row['shield']      === 'number') wf.shield      = row['shield']      as number;
    if (typeof row['armor']       === 'number') wf.armor       = row['armor']       as number;
    if (typeof row['power']       === 'number') wf.power       = row['power']       as number;
    if (typeof row['sprintSpeed'] === 'number') wf.sprintSpeed = row['sprintSpeed'] as number;

    const abilities = parseAbilities(row['abilities']);
    if (abilities.length > 0) wf.abilities = abilities;
    else missingAbilities++;

    const components = parseComponents(row['components']);
    if (components.length > 0) wf.components = components;
    else missingComponents++;

    if (typeof row['wikiaUrl']    === 'string')  wf.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['releaseDate'] === 'string')  wf.releaseDate = row['releaseDate'] as string;
    if (typeof row['masterable']  === 'boolean') wf.masterable  = row['masterable']  as boolean;
    if (typeof row['isPrime']     === 'boolean') wf.isPrime     = row['isPrime']     as boolean;

    const introduced = parseIntroduced(row['introduced']);
    if (introduced) wf.introduced = introduced;

    const patchlogs = parsePatchLogs(row['patchlogs']);
    if (patchlogs.length > 0) wf.patchlogs = patchlogs;

    if (!out.has(uniqueName)) out.set(uniqueName, wf);
  }

  const total = out.size;
  const pct = (n: number) => total === 0 ? 100 : Math.round((n / total) * 1000) / 10;

  log('parsed wfcd warframes', {
    total,
    droppedRows,
    missingPolarities: `${missingPolarities} (${pct(missingPolarities)}%)`,
    missingAbilities:  `${missingAbilities} (${pct(missingAbilities)}%)`,
    missingComponents: `${missingComponents} (${pct(missingComponents)}%)`,
  });

  if (total === 0) warn('wfcd /warframes produced ZERO entries — upstream shape likely broke');

  return out;
}

// ─── WFCD Weapons ─────────────────────────────────────────────────────────────

export function parseWfcdWeapons(raw: unknown): Map<string, WfcdWeapon> {
  const out = new Map<string, WfcdWeapon>();
  if (!Array.isArray(raw)) {
    warn('wfcd /weapons response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const w: WfcdWeapon = { uniqueName, name };

    if (typeof row['description']        === 'string')  w.description        = row['description']        as string;
    if (typeof row['type']               === 'string')  w.type               = row['type']               as string;
    if (typeof row['category']           === 'string')  w.category           = row['category']           as string;
    if (typeof row['productCategory']    === 'string')  w.productCategory    = row['productCategory']    as string;
    if (typeof row['masteryReq']         === 'number')  w.masteryReq         = row['masteryReq']         as number;
    if (typeof row['totalDamage']        === 'number')  w.totalDamage        = row['totalDamage']        as number;
    if (typeof row['fireRate']           === 'number')  w.fireRate           = row['fireRate']           as number;
    if (typeof row['criticalChance']     === 'number')  w.criticalChance     = row['criticalChance']     as number;
    if (typeof row['criticalMultiplier'] === 'number')  w.criticalMultiplier = row['criticalMultiplier'] as number;
    if (typeof row['procChance']         === 'number')  w.procChance         = row['procChance']         as number;
    if (typeof row['magazineSize']       === 'number')  w.magazineSize       = row['magazineSize']       as number;
    if (typeof row['reloadTime']         === 'number')  w.reloadTime         = row['reloadTime']         as number;
    if (typeof row['imageName']          === 'string')  w.imageName          = row['imageName']          as string;
    if (typeof row['wikiaUrl']           === 'string')  w.wikiaUrl           = row['wikiaUrl']           as string;
    if (typeof row['releaseDate']        === 'string')  w.releaseDate        = row['releaseDate']        as string;
    if (typeof row['tradable']           === 'boolean') w.tradable           = row['tradable']           as boolean;
    if (typeof row['isPrime']            === 'boolean') w.isPrime            = row['isPrime']            as boolean;
    if (typeof row['omegaAttenuation']   === 'number')  w.omegaAttenuation   = row['omegaAttenuation']   as number;
    if (typeof row['accuracy']           === 'number')  w.accuracy           = row['accuracy']           as number;
    if (typeof row['noise']              === 'string')  w.noise              = row['noise']              as string;
    if (typeof row['trigger']            === 'string')  w.trigger            = row['trigger']            as string;
    if (typeof row['range']              === 'number')  w.range              = row['range']              as number;
    if (typeof row['blockingAngle']      === 'number')  w.blockingAngle      = row['blockingAngle']      as number;
    if (typeof row['comboDuration']      === 'number')  w.comboDuration      = row['comboDuration']      as number;
    if (typeof row['followThrough']      === 'number')  w.followThrough      = row['followThrough']      as number;
    if (typeof row['slamAttack']         === 'number')  w.slamAttack         = row['slamAttack']         as number;
    if (typeof row['slamRadialDamage']   === 'number')  w.slamRadialDamage   = row['slamRadialDamage']   as number;

    const damage = parseDamageMap(row['damage']);
    if (damage) w.damage = damage;

    if (Array.isArray(row['polarities']) && (row['polarities'] as unknown[]).every(p => typeof p === 'string')) {
      w.polarities = row['polarities'] as string[];
    }

    const components = parseComponents(row['components']);
    if (components.length > 0) w.components = components;

    const introduced = parseIntroduced(row['introduced']);
    if (introduced) w.introduced = introduced;

    const patchlogs = parsePatchLogs(row['patchlogs']);
    if (patchlogs.length > 0) w.patchlogs = patchlogs;

    if (!out.has(uniqueName)) out.set(uniqueName, w);
  }

  log('parsed wfcd weapons', { total: out.size, droppedRows });
  if (out.size === 0) warn('wfcd /weapons produced ZERO entries');

  return out;
}

// ─── WFCD Sentinels ───────────────────────────────────────────────────────────

export function parseWfcdSentinels(raw: unknown): Map<string, WfcdSentinel> {
  const out = new Map<string, WfcdSentinel>();
  if (!Array.isArray(raw)) {
    warn('wfcd /sentinels response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const s: WfcdSentinel = { uniqueName, name };

    if (typeof row['description'] === 'string')  s.description = row['description'] as string;
    if (typeof row['health']      === 'number')  s.health      = row['health']      as number;
    if (typeof row['shield']      === 'number')  s.shield      = row['shield']      as number;
    if (typeof row['armor']       === 'number')  s.armor       = row['armor']       as number;
    if (typeof row['imageName']   === 'string')  s.imageName   = row['imageName']   as string;
    if (typeof row['wikiaUrl']    === 'string')  s.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['releaseDate'] === 'string')  s.releaseDate = row['releaseDate'] as string;
    if (typeof row['tradable']    === 'boolean') s.tradable    = row['tradable']    as boolean;
    if (typeof row['isPrime']     === 'boolean') s.isPrime     = row['isPrime']     as boolean;
    if (typeof row['masteryReq']  === 'number')  s.masteryReq  = row['masteryReq']  as number;

    if (Array.isArray(row['polarities']) && (row['polarities'] as unknown[]).every(p => typeof p === 'string')) {
      s.polarities = row['polarities'] as string[];
    }

    const components = parseComponents(row['components']);
    if (components.length > 0) s.components = components;

    const abilities = parseAbilities(row['abilities']);
    if (abilities.length > 0) s.abilities = abilities;

    const introduced = parseIntroduced(row['introduced']);
    if (introduced) s.introduced = introduced;

    const patchlogs = parsePatchLogs(row['patchlogs']);
    if (patchlogs.length > 0) s.patchlogs = patchlogs;

    if (!out.has(uniqueName)) out.set(uniqueName, s);
  }

  log('parsed wfcd sentinels', { total: out.size, droppedRows });

  return out;
}

// ─── WFCD Pets ────────────────────────────────────────────────────────────────

export function parseWfcdPets(raw: unknown): Map<string, WfcdPet> {
  const out = new Map<string, WfcdPet>();
  if (!Array.isArray(raw)) {
    warn('wfcd /pets response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const p: WfcdPet = { uniqueName, name };

    if (typeof row['description'] === 'string')  p.description = row['description'] as string;
    if (typeof row['health']      === 'number')  p.health      = row['health']      as number;
    if (typeof row['shield']      === 'number')  p.shield      = row['shield']      as number;
    if (typeof row['armor']       === 'number')  p.armor       = row['armor']       as number;
    if (typeof row['imageName']   === 'string')  p.imageName   = row['imageName']   as string;
    if (typeof row['wikiaUrl']    === 'string')  p.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['releaseDate'] === 'string')  p.releaseDate = row['releaseDate'] as string;
    if (typeof row['tradable']    === 'boolean') p.tradable    = row['tradable']    as boolean;
    if (typeof row['masteryReq']  === 'number')  p.masteryReq  = row['masteryReq']  as number;
    if (typeof row['type']        === 'string')  p.type        = row['type']        as string;

    if (Array.isArray(row['polarities']) && (row['polarities'] as unknown[]).every(x => typeof x === 'string')) {
      p.polarities = row['polarities'] as string[];
    }

    const components = parseComponents(row['components']);
    if (components.length > 0) p.components = components;

    const abilities = parseAbilities(row['abilities']);
    if (abilities.length > 0) p.abilities = abilities;

    const introduced = parseIntroduced(row['introduced']);
    if (introduced) p.introduced = introduced;

    const patchlogs = parsePatchLogs(row['patchlogs']);
    if (patchlogs.length > 0) p.patchlogs = patchlogs;

    if (!out.has(uniqueName)) out.set(uniqueName, p);
  }

  log('parsed wfcd pets', { total: out.size, droppedRows });

  return out;
}

// ─── WFCD Arcanes ─────────────────────────────────────────────────────────────

export function parseWfcdArcanes(raw: unknown): Map<string, WfcdArcane> {
  const out = new Map<string, WfcdArcane>();
  if (!Array.isArray(raw)) {
    warn('wfcd /arcanes response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const a: WfcdArcane = { uniqueName, name };

    if (typeof row['description'] === 'string')  a.description = row['description'] as string;
    if (typeof row['rarity']      === 'string')  a.rarity      = row['rarity']      as string;
    if (typeof row['imageName']   === 'string')  a.imageName   = row['imageName']   as string;
    if (typeof row['wikiaUrl']    === 'string')  a.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['releaseDate'] === 'string')  a.releaseDate = row['releaseDate'] as string;
    if (typeof row['tradable']    === 'boolean') a.tradable    = row['tradable']    as boolean;
    if (typeof row['type']        === 'string')  a.type        = row['type']        as string;
    if (Array.isArray(row['levelStats'])) a.levelStats = row['levelStats'] as WfcdArcane['levelStats'];

    const introduced = parseIntroduced(row['introduced']);
    if (introduced) a.introduced = introduced;

    const patchlogs = parsePatchLogs(row['patchlogs']);
    if (patchlogs.length > 0) a.patchlogs = patchlogs;

    if (!out.has(uniqueName)) out.set(uniqueName, a);
  }

  log('parsed wfcd arcanes', { total: out.size, droppedRows });

  return out;
}

// ─── WFCD Relics ──────────────────────────────────────────────────────────────

export function parseWfcdRelics(raw: unknown): Map<string, WfcdRelic> {
  const out = new Map<string, WfcdRelic>();
  if (!Array.isArray(raw)) {
    warn('wfcd /relics response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const rel: WfcdRelic = { uniqueName, name };

    if (typeof row['description'] === 'string')  rel.description = row['description'] as string;
    if (typeof row['imageName']   === 'string')  rel.imageName   = row['imageName']   as string;
    if (typeof row['wikiaUrl']    === 'string')  rel.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['vaulted']     === 'boolean') rel.vaulted     = row['vaulted']     as boolean;
    if (typeof row['tier']        === 'string')  rel.tier        = row['tier']        as string;

    if (Array.isArray(row['locations']) && (row['locations'] as unknown[]).every(l => typeof l === 'string')) {
      rel.locations = row['locations'] as string[];
    }

    if (Array.isArray(row['rewards'])) {
      const rewards: WfcdRelicReward[] = [];
      for (const rw of row['rewards'] as unknown[]) {
        if (!rw || typeof rw !== 'object') continue;
        const rr = rw as Record<string, unknown>;
        const entry: WfcdRelicReward = {};
        if (typeof rr['itemName'] === 'string') entry.itemName = rr['itemName'] as string;
        if (typeof rr['rarity']   === 'string') entry.rarity   = rr['rarity']   as string;
        if (typeof rr['chance']   === 'number') entry.chance   = rr['chance']   as number;
        if (typeof rr['rotation'] === 'string') entry.rotation = rr['rotation'] as string;
        if (entry.itemName) rewards.push(entry);
      }
      if (rewards.length > 0) rel.rewards = rewards;
    }

    if (!out.has(uniqueName)) out.set(uniqueName, rel);
  }

  log('parsed wfcd relics', { total: out.size, droppedRows });

  return out;
}

// ─── WFCD Resources ───────────────────────────────────────────────────────────

export function parseWfcdResources(raw: unknown): Map<string, WfcdResource> {
  const out = new Map<string, WfcdResource>();
  if (!Array.isArray(raw)) {
    warn('wfcd /resources response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const res: WfcdResource = { uniqueName, name };

    if (typeof row['description'] === 'string')  res.description = row['description'] as string;
    if (typeof row['type']        === 'string')  res.type        = row['type']        as string;
    if (typeof row['category']    === 'string')  res.category    = row['category']    as string;
    if (typeof row['imageName']   === 'string')  res.imageName   = row['imageName']   as string;
    if (typeof row['wikiaUrl']    === 'string')  res.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['tradable']    === 'boolean') res.tradable    = row['tradable']    as boolean;

    if (Array.isArray(row['parents']) && (row['parents'] as unknown[]).every(p => typeof p === 'string')) {
      res.parents = row['parents'] as string[];
    }

    if (!out.has(uniqueName)) out.set(uniqueName, res);
  }

  log('parsed wfcd resources', { total: out.size, droppedRows });

  return out;
}

// ─── WFCD Gear ────────────────────────────────────────────────────────────────

export function parseWfcdGear(raw: unknown): Map<string, WfcdGear> {
  const out = new Map<string, WfcdGear>();
  if (!Array.isArray(raw)) {
    warn('wfcd /gear response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const g: WfcdGear = { uniqueName, name };

    if (typeof row['description'] === 'string')  g.description = row['description'] as string;
    if (typeof row['type']        === 'string')  g.type        = row['type']        as string;
    if (typeof row['imageName']   === 'string')  g.imageName   = row['imageName']   as string;
    if (typeof row['wikiaUrl']    === 'string')  g.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['tradable']    === 'boolean') g.tradable    = row['tradable']    as boolean;

    if (!out.has(uniqueName)) out.set(uniqueName, g);
  }

  log('parsed wfcd gear', { total: out.size, droppedRows });

  return out;
}

// ─── WFCD Misc ────────────────────────────────────────────────────────────────
//
// Catch-all for core crafting resources missing from /resources (Orokin Cell,
// Argon Crystal, Neural Sensors, Forma, etc.). Same shape as WfcdResource;
// builder classifies these as Resource (or Ingredient/Equipment per uniqueName).

export function parseWfcdMisc(raw: unknown): Map<string, WfcdMisc> {
  const out = new Map<string, WfcdMisc>();
  if (!Array.isArray(raw)) {
    warn('wfcd misc response is not an array', { type: raw === null ? 'null' : typeof raw });
    return out;
  }

  let droppedRows = 0;

  for (const r of raw) {
    if (!r || typeof r !== 'object') { droppedRows++; continue; }
    const row = r as Record<string, unknown>;
    const uniqueName = typeof row['uniqueName'] === 'string' ? row['uniqueName'] : null;
    const name       = typeof row['name']       === 'string' ? row['name']       : null;
    if (!uniqueName || !name) { droppedRows++; continue; }

    const m: WfcdMisc = { uniqueName, name };

    if (typeof row['description'] === 'string')  m.description = row['description'] as string;
    if (typeof row['type']        === 'string')  m.type        = row['type']        as string;
    if (typeof row['category']    === 'string')  m.category    = row['category']    as string;
    if (typeof row['imageName']   === 'string')  m.imageName   = row['imageName']   as string;
    if (typeof row['wikiaUrl']    === 'string')  m.wikiaUrl    = row['wikiaUrl']    as string;
    if (typeof row['tradable']    === 'boolean') m.tradable    = row['tradable']    as boolean;

    if (!out.has(uniqueName)) out.set(uniqueName, m);
  }

  log('parsed wfcd misc', { total: out.size, droppedRows });

  return out;
}

// ─── Shared per-row fragment parsers ──────────────────────────────────────────

function parseAbilities(raw: unknown): WfcdAbility[] {
  if (!Array.isArray(raw)) return [];
  const out: WfcdAbility[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object') continue;
    const ar = a as Record<string, unknown>;
    const aName = typeof ar['name']       === 'string' ? ar['name']       : null;
    const aUniq = typeof ar['uniqueName'] === 'string' ? ar['uniqueName'] : null;
    if (!aName || !aUniq) continue;
    const entry: WfcdAbility = {
      uniqueName:  aUniq,
      name:        aName,
      description: typeof ar['description'] === 'string' ? ar['description'] : '',
    };
    if (typeof ar['imageName'] === 'string') entry.imageName = ar['imageName'] as string;
    out.push(entry);
  }
  return out;
}

function parseComponents(raw: unknown): WfcdComponent[] {
  if (!Array.isArray(raw)) return [];
  const out: WfcdComponent[] = [];
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue;
    const cr = c as Record<string, unknown>;
    const cName  = typeof cr['name']      === 'string' ? cr['name']      : null;
    const cCount = typeof cr['itemCount'] === 'number' ? cr['itemCount'] : null;
    if (!cName || cCount == null) continue;
    const entry: WfcdComponent = { name: cName, itemCount: cCount };
    if (typeof cr['uniqueName']  === 'string')  entry.uniqueName  = cr['uniqueName']  as string;
    if (typeof cr['description'] === 'string')  entry.description = cr['description'] as string;
    if (typeof cr['imageName']   === 'string')  entry.imageName   = cr['imageName']   as string;
    if (typeof cr['tradable']    === 'boolean') entry.tradable    = cr['tradable']    as boolean;

    if (Array.isArray(cr['drops'])) {
      const drops: WfcdComponentDrop[] = [];
      for (const d of cr['drops'] as unknown[]) {
        if (!d || typeof d !== 'object') continue;
        const dr = d as Record<string, unknown>;
        const drop: WfcdComponentDrop = {};
        if (typeof dr['location']   === 'string') drop.location   = dr['location']   as string;
        if (typeof dr['type']       === 'string') drop.type       = dr['type']       as string;
        if (typeof dr['chance']     === 'number') drop.chance     = dr['chance']     as number;
        if (typeof dr['rarity']     === 'string') drop.rarity     = dr['rarity']     as string;
        if (typeof dr['uniqueName'] === 'string') drop.uniqueName = dr['uniqueName'] as string;
        if (drop.location || drop.type) drops.push(drop);
      }
      if (drops.length > 0) entry.drops = drops;
    }

    out.push(entry);
  }
  return out;
}

/**
 * Damage breakdown — WFCD ships an object with per-element keys
 * ({ impact: 5, slash: 38.5, heat: 0, ... }). We drop zero/negative values
 * so the consumer only iterates the elements that actually contribute,
 * and reject the whole thing if every entry is zero (e.g. on melee
 * weapons that publish per-attack damage via `attacks[]` instead).
 */
function parseDamageMap(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseIntroduced(raw: unknown): WfcdIntroduced | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const name = typeof r['name'] === 'string' ? r['name'] : undefined;
  if (!name) return undefined;
  const out: WfcdIntroduced = { name };
  if (typeof r['date']   === 'string') out.date   = r['date']   as string;
  if (typeof r['url']    === 'string') out.url    = r['url']    as string;
  if (typeof r['parent'] === 'string') out.parent = r['parent'] as string;
  return out;
}

/** Cap patchlogs per row — Ash alone has 135 entries; older history is
 *  rarely scrolled-to and explodes worker CPU + KV payload size. */
const MAX_PATCHLOGS_PER_ROW = 20;

export function parsePatchLogs(raw: unknown): WfcdPatchLog[] {
  if (!Array.isArray(raw)) return [];
  const out: WfcdPatchLog[] = [];
  // Iterate the tail of the array — WFCD ships oldest-first, frontend wants
  // newest-first. Walking from the end caps work AND yields the most-recent
  // entries by default.
  const start = Math.max(0, raw.length - MAX_PATCHLOGS_PER_ROW);
  for (let i = raw.length - 1; i >= start; i--) {
    const e = raw[i];
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    const name = typeof r['name'] === 'string' ? r['name'] : undefined;
    const date = typeof r['date'] === 'string' ? r['date'] : undefined;
    if (!name || !date) continue;
    const entry: WfcdPatchLog = { name, date };
    if (typeof r['url']       === 'string') entry.url       = r['url']       as string;
    if (typeof r['additions'] === 'string') entry.additions = r['additions'] as string;
    if (typeof r['changes']   === 'string') entry.changes   = r['changes']   as string;
    if (typeof r['fixes']     === 'string') entry.fixes     = r['fixes']     as string;
    out.push(entry);
  }
  return out;
}

// ─── WFCD drops walker ────────────────────────────────────────────────────────

/**
 * Top-level WFCD parse. Walks every section we know about, emits a flat
 * ParsedDrop[]. Unknown top-level keys are skipped — adding a new section
 * is one new walker + one new line below.
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
  walkBounty(r['deimosRewards'],               'Cambion',        out);
  walkBounty(r['zarimanRewards'],              'Zariman',        out);
  walkBounty(r['entratiLabRewards'],           'Entrati Vaults', out);

  return out;
}

// ─── Drop section walkers ─────────────────────────────────────────────────────
//
// Each walker pushes onto `out` directly to keep call sites linear. None throw
// — bad rows are silently skipped.

interface WfcdReward {
  itemName: string;
  rarity?:  string;
  chance?:  number;            // 0–100 from upstream
}

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
 * WFCD drops.relics is a flat array of relic-state rows:
 *   [{ tier, relicName, state, rewards: [{ itemName, rarity, chance }, ...] }, ...]
 *
 * One relic appears once per state (Intact / Exceptional / Flawless / Radiant)
 * because the reward chances differ per state. We emit one ParsedDrop per
 * (state × reward).
 *
 * (Pre-2026-05 WFCD used a nested { tier: { name: { rewards } } } shape; the
 * legacy walker that handled that is gone with the calamity pipeline.)
 */
function walkRelics(raw: unknown, out: ParsedDrop[]): void {
  if (!Array.isArray(raw)) return;
  for (const r of raw) {
    if (!isObj(r)) continue;
    const row = r as Record<string, unknown>;
    const tier = typeof row['tier']      === 'string' ? row['tier']      : '';
    const name = typeof row['relicName'] === 'string' ? row['relicName'] : '';
    if (!isRelicTier(tier) || !name) continue;

    const rewards = row['rewards'];
    if (!Array.isArray(rewards)) continue;

    const stateRaw = String(row['state'] ?? 'Intact');
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
 * WFCD shape: [{ bountyLevel, rewards: { A: [...], B: [...], C: [...] } }]
 * `bountyLevel` is a free-text string like "Level 5 - 15 Cetus Bounty".
 */
function walkBounty(raw: unknown, location: NonNullable<ParsedDrop['bountyLocation']>, out: ParsedDrop[]): void {
  if (!Array.isArray(raw)) return;
  for (const tierEntry of raw) {
    if (!isObj(tierEntry)) continue;
    const t = tierEntry as Record<string, unknown>;
    const tier = typeof t['bountyLevel'] === 'string' ? (t['bountyLevel'] as string) : undefined;

    if (isObj(t['rewards'])) {
      for (const [rotKey, rotRewards] of Object.entries(t['rewards'] as Record<string, unknown>)) {
        if (!Array.isArray(rotRewards)) continue;
        const stage = rotKey === 'A' || rotKey === 'B' || rotKey === 'C' ? rotKey : undefined;
        for (const rw of rotRewards) pushBountyReward(rw, location, tier, stage, out);
      }
      continue;
    }

    if (Array.isArray(t['rewards'])) {
      for (const rw of t['rewards'] as unknown[]) pushBountyReward(rw, location, tier, undefined, out);
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

// ─── Drop helpers ─────────────────────────────────────────────────────────────

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

function extractAnyRewardArray(obj: Record<string, unknown>): unknown[] {
  for (const v of Object.values(obj)) {
    if (Array.isArray(v) && v.length > 0 && isObj(v[0]) && typeof (v[0] as Record<string, unknown>)['itemName'] === 'string') {
      return v;
    }
  }
  return [];
}
