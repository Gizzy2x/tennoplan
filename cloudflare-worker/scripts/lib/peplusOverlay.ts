// ---------------------------------------------------------------------------
// Public Export Plus authority overlay — Codex v2 phase A.
//
// Runs AFTER enrichCodex, BEFORE normalizeCodex. Two jobs:
//
// 1. AUTHORITY OVERRIDE (matched uniqueNames). PE+ is DE's own export, so
//    for fields both sources carry, PE+ wins — this is what makes the codex
//    correct in the hours/days after a patch while WFCD lags. Rules:
//      • NUMERIC stats are overridden (units verified identical: crit/status
//        are fractions in both; WFCD copies the same Public Export numbers,
//        so values only diverge when WFCD is stale — exactly when we want
//        the override).
//      • ENUM/string fields are FILL-ONLY (normalized to our conventions).
//        WFCD's casing ("Auto", "vazarin") is what the frontend renders;
//        we never fight it, only patch holes.
//      • Mod per-rank levelStats / descriptions stay WFCD — PE+ ships mod
//        STRUCTURE (polarity, drain, rarity, max rank), not display prose.
//
// 2. GAP REPORT + SYNTHESIS (unmatched uniqueNames). Items in PE+ but not in
//    the build are the patch-day gap — brand-new items WFCD hasn't shipped
//    yet. We synthesize minimal codex entries for them (name via dict.en,
//    category via productCategory, stats where present) so new items exist
//    in Tennoplan on day one; the next WFCD catch-up build enriches them
//    with icons/drops/components automatically (same uniqueName = same row).
//
// The whole stage is a no-op when PE+ wasn't loaded (layer-optional).
// ---------------------------------------------------------------------------

import type { EnrichedItem } from '../../src/codex/enricher';
import type { ItemStats, ItemRarity } from '../../src/types';
import type { PePlusData, PePowersuit, PeWeapon, PeUpgrade, PeRecipe } from './peplus';
import { peName } from './peplus';
import { logger } from '../../src/logger';

const log = (msg: string, data?: unknown) => logger.info('codex-peplus-overlay', msg, data);

// ─── Report shape ─────────────────────────────────────────────────────────────

export interface OverlayReport {
  /** PE+ package version the overlay ran against. */
  peVersion:        string;
  /** Items matched by uniqueName, per overlaid category. */
  matched:          Record<string, number>;
  /** Matched items where at least one numeric stat actually changed —
   *  the "WFCD was stale here" signal. Expect ~0 normally, spikes post-patch. */
  statDivergence:   Record<string, number>;
  /** Enum/string holes filled from PE+. */
  enumFills:        number;
  /** Weapons whose per-type damage breakdown was authored from PE+
   *  damagePerShot (matched + synthesized). PE+ ships melee splits WFCD omits,
   *  so this exceeds WFCD's damage-map coverage. */
  damageBreakdowns: number;
  /** Weapons where the mapped damagePerShot sum deviated >2% from totalDamage —
   *  a slot reorder/new-type signal (non-fatal; schema guard owns the hard fail). */
  damageSumWarnings: number;
  /** Mods given a computed Endo-to-max upgrade cost (matched + synthesized). */
  upgradeCosts:     number;
  /** Items given a foundry build cost from ExportRecipes (any category). */
  buildCosts:       number;
  /** PE+ records with no codex row (after junk filters) — the patch-day gap. */
  peOnly:           Record<string, number>;
  /** Of those, how many we synthesized into minimal entries. */
  synthesized:      number;
  /** Codex rows in overlaid categories with no PE+ record (WFCD-only;
   *  usually modular/virtual items DE doesn't export individually). */
  wfcdOnly:         Record<string, number>;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function applyPePlusAuthority(items: EnrichedItem[], pe: PePlusData): OverlayReport {
  const t0 = Date.now();

  const report: OverlayReport = {
    peVersion:      pe.version,
    matched:         {},
    statDivergence:  {},
    enumFills:       0,
    damageBreakdowns:  0,
    damageSumWarnings: 0,
    upgradeCosts:      0,
    buildCosts:        0,
    peOnly:          {},
    synthesized:     0,
    wfcdOnly:        {},
  };

  const byUniqueName = new Map(items.map((i) => [i.uniqueName, i]));

  // ── 1. Authority override on matched rows ──
  for (const item of items) {
    switch (item.category) {
      case 'Warframe': overlayWarframe(item, pe.warframes.get(item.uniqueName), report); break;
      case 'Weapon':   overlayWeapon(item, pe.weapons.get(item.uniqueName), report);     break;
      case 'Mod':      overlayMod(item, pe.mods.get(item.uniqueName), pe, report);       break;
      default: break;
    }
    // Build cost applies to ANY craftable item, regardless of category.
    applyBuildCost(item, pe.recipes.get(item.uniqueName), report);
  }

  // ── 2. Gap report + synthesis ──
  synthesizeMissing(items, byUniqueName, pe, report);

  log('PE+ authority applied', { ms: Date.now() - t0, ...report });
  return report;
}

// ─── Per-category overlays ────────────────────────────────────────────────────

function overlayWarframe(item: EnrichedItem, peRec: PePowersuit | undefined, report: OverlayReport): void {
  if (!peRec) { bump(report.wfcdOnly, 'Warframe'); return; }
  bump(report.matched, 'Warframe');

  const diverged = overrideStats(item, {
    health:      peRec.health,
    shield:      peRec.shield,
    armor:       peRec.armor,
    energy:      peRec.power,
    sprintSpeed: peRec.sprintSpeed,
  });
  if (typeof peRec.masteryReq === 'number') item.masteryRank = peRec.masteryReq;
  if (diverged) bump(report.statDivergence, 'Warframe');
}

function overlayWeapon(item: EnrichedItem, peRec: PeWeapon | undefined, report: OverlayReport): void {
  if (!peRec) { bump(report.wfcdOnly, 'Weapon'); return; }
  bump(report.matched, 'Weapon');

  const diverged = overrideStats(item, {
    damage:           peRec.totalDamage,
    critChance:       peRec.criticalChance,
    critMultiplier:   peRec.criticalMultiplier,
    statusChance:     peRec.procChance,
    fireRate:         peRec.fireRate,
    magazine:         peRec.magazineSize,
    reload:           peRec.reloadTime,
    accuracy:         peRec.accuracy,
    rivenDisposition: peRec.omegaAttenuation,
  });
  if (typeof peRec.masteryReq === 'number') item.masteryRank = peRec.masteryReq;

  // Multishot — store only innate (>1); single-shot weapons default to 1 in
  // display/calc, so storing 1 on every rifle would be pure blob bloat.
  if (typeof peRec.multishot === 'number' && peRec.multishot > 1) {
    (item.stats ??= {}).multishot = peRec.multishot;
  }

  // Damage-type breakdown — PE+ authority over WFCD's `damage` map. PE+'s
  // damagePerShot is the per-type split that sums to totalDamage (verified 0
  // mismatch across 647 weapons), so it corrects post-patch drift AND fills
  // melee, which WFCD ships no `damage` map for (the DamageStrip's known gap).
  const dmg = deriveDamageTypes(peRec.damagePerShot, peRec.totalDamage, report);
  if (dmg) { item.damageTypes = dmg; report.damageBreakdowns++; }

  // Enum fills — WFCD casing is the display convention; only patch holes.
  if (!item.weaponTrigger && peRec.trigger) { item.weaponTrigger = normalizeTrigger(peRec.trigger); report.enumFills++; }
  if (!item.weaponNoise && peRec.noise)     { item.weaponNoise   = titleCase(peRec.noise);          report.enumFills++; }

  if (diverged) bump(report.statDivergence, 'Weapon');
}

function overlayMod(item: EnrichedItem, peRec: PeUpgrade | undefined, pe: PePlusData, report: OverlayReport): void {
  if (!peRec) { bump(report.wfcdOnly, 'Mod'); return; }
  bump(report.matched, 'Mod');

  if (typeof peRec.baseDrain === 'number') {
    if (item.baseDrain !== undefined && item.baseDrain !== peRec.baseDrain) bump(report.statDivergence, 'Mod');
    item.baseDrain = peRec.baseDrain;
  }

  // Fill-only: polarity school, rarity, compat label, tradability.
  if (!item.polarity && peRec.polarity) {
    const school = AP_TO_SCHOOL[peRec.polarity];
    if (school) { item.polarity = school; report.enumFills++; }
  }
  if (!item.rarity && peRec.rarity) {
    const rarity = asRarity(peRec.rarity);
    if (rarity) { item.rarity = rarity; report.enumFills++; }
  }
  if (!item.compatName && peRec.compatName) {
    const compat = peName(pe, peRec.compatName);
    if (compat) { item.compatName = compat; report.enumFills++; }
  }
  if (item.tradeable === undefined && typeof peRec.tradable === 'boolean') {
    item.tradeable = peRec.tradable;
    report.enumFills++;
  }

  // Upgrade cost — Endo to fully rank, from the resolved rarity + PE+ max rank.
  const endo = modEndoToMax(item.rarity, peRec.fusionLimit);
  if (endo !== undefined) { item.upgradeCost = { endoToMax: endo }; report.upgradeCosts++; }
}

// ─── Synthesis of PE+-only items (the patch-day gap) ──────────────────────────

/** productCategory → our ItemCategory, for records we synthesize confidently. */
const WEAPON_CATEGORIES = new Set([
  'LongGuns', 'Pistols', 'Melee', 'SpaceGuns', 'SpaceMelee',
  'SentinelWeapons', 'SpecialItems', 'DrifterMelee', 'OperatorAmps',
]);

function synthesizeMissing(
  items:        EnrichedItem[],
  byUniqueName: Map<string, EnrichedItem>,
  pe:           PePlusData,
  report:       OverlayReport,
): void {
  const push = (item: EnrichedItem, gapKey: string) => {
    bump(report.peOnly, gapKey);
    items.push(item);
    byUniqueName.set(item.uniqueName, item);
    report.synthesized++;
  };

  for (const [uniqueName, rec] of pe.warframes) {
    if (byUniqueName.has(uniqueName) || skipRecord(uniqueName, rec.codexSecret)) continue;
    const name = peName(pe, rec.name);
    if (!name) continue;
    const item = baseSynthetic(uniqueName, name, 'Warframe', peName(pe, rec.description));
    item.subtype = rec.productCategory;
    const stats: ItemStats = {};
    if (rec.health > 0) stats.health = rec.health;
    if (rec.shield > 0) stats.shield = rec.shield;
    if (rec.armor  > 0) stats.armor  = rec.armor;
    if (rec.power  > 0) stats.energy = rec.power;
    if (typeof rec.sprintSpeed === 'number' && rec.sprintSpeed > 0) stats.sprintSpeed = rec.sprintSpeed;
    if (Object.keys(stats).length > 0) item.stats = stats;
    if (typeof rec.masteryReq === 'number') item.masteryRank = rec.masteryReq;
    push(item, 'Warframe');
  }

  for (const [uniqueName, rec] of pe.weapons) {
    if (byUniqueName.has(uniqueName) || skipRecord(uniqueName, rec.codexSecret)) continue;
    if (!WEAPON_CATEGORIES.has(rec.productCategory)) continue;
    const name = peName(pe, rec.name);
    if (!name) continue;
    const item = baseSynthetic(uniqueName, name, 'Weapon', peName(pe, rec.description));
    item.subtype = rec.productCategory;
    const stats: ItemStats = {};
    if (typeof rec.totalDamage        === 'number' && rec.totalDamage        > 0) stats.damage           = rec.totalDamage;
    if (typeof rec.criticalChance     === 'number' && rec.criticalChance     > 0) stats.critChance       = rec.criticalChance;
    if (typeof rec.criticalMultiplier === 'number' && rec.criticalMultiplier > 0) stats.critMultiplier   = rec.criticalMultiplier;
    if (typeof rec.procChance         === 'number' && rec.procChance         > 0) stats.statusChance     = rec.procChance;
    if (typeof rec.fireRate           === 'number' && rec.fireRate           > 0) stats.fireRate         = rec.fireRate;
    if (typeof rec.magazineSize       === 'number' && rec.magazineSize       > 0) stats.magazine         = rec.magazineSize;
    if (typeof rec.reloadTime         === 'number' && rec.reloadTime         > 0) stats.reload           = rec.reloadTime;
    if (typeof rec.omegaAttenuation   === 'number' && rec.omegaAttenuation   > 0) stats.rivenDisposition = rec.omegaAttenuation;
    if (typeof rec.multishot          === 'number' && rec.multishot          > 1) stats.multishot        = rec.multishot;
    if (Object.keys(stats).length > 0) item.stats = stats;
    const dmg = deriveDamageTypes(rec.damagePerShot, rec.totalDamage, report);
    if (dmg) { item.damageTypes = dmg; report.damageBreakdowns++; }
    if (typeof rec.masteryReq === 'number') item.masteryRank   = rec.masteryReq;
    if (rec.trigger)                        item.weaponTrigger = normalizeTrigger(rec.trigger);
    if (rec.noise)                          item.weaponNoise   = titleCase(rec.noise);
    if (typeof rec.tradable === 'boolean')  item.tradeable     = rec.tradable;
    push(item, 'Weapon');
  }

  for (const [uniqueName, rec] of pe.mods) {
    if (byUniqueName.has(uniqueName) || skipRecord(uniqueName, rec.codexSecret)) continue;
    const name = peName(pe, rec.name);
    if (!name) continue;
    const item = baseSynthetic(uniqueName, name, 'Mod', peName(pe, rec.description));
    if (typeof rec.baseDrain === 'number')  item.baseDrain = rec.baseDrain;
    if (rec.polarity && AP_TO_SCHOOL[rec.polarity]) item.polarity = AP_TO_SCHOOL[rec.polarity];
    const rarity = rec.rarity ? asRarity(rec.rarity) : undefined;
    if (rarity) item.rarity = rarity;
    const compat = peName(pe, rec.compatName);
    if (compat) item.compatName = compat;
    if (typeof rec.tradable === 'boolean') item.tradeable = rec.tradable;
    const endo = modEndoToMax(item.rarity, rec.fusionLimit);
    if (endo !== undefined) { item.upgradeCost = { endoToMax: endo }; report.upgradeCosts++; }
    push(item, 'Mod');
  }

  for (const [uniqueName, rec] of pe.arcanes) {
    if (byUniqueName.has(uniqueName) || skipRecord(uniqueName, rec.codexSecret)) continue;
    const name = peName(pe, rec.name);
    if (!name) continue;
    const item = baseSynthetic(uniqueName, name, 'Arcane', peName(pe, rec.description));
    const rarity = rec.rarity ? asRarity(rec.rarity) : undefined;
    if (rarity) item.rarity = rarity;
    push(item, 'Arcane');
  }
}

/** Riven templates and other internal/virtual rows that must never become
 *  codex entries. codexSecret marks hidden/unreleased content. */
function skipRecord(uniqueName: string, codexSecret: boolean | undefined): boolean {
  if (codexSecret) return true;
  if (uniqueName.includes('/Randomized/')) return true;   // riven mod templates
  return false;
}

function baseSynthetic(
  uniqueName:  string,
  name:        string,
  category:    EnrichedItem['category'],
  description: string | undefined,
): EnrichedItem {
  const item: EnrichedItem = {
    uniqueName,
    name,
    category,
    iconUrl:       '',          // validator accepts; frontend renders placeholder
    dropLocations: [],          // new items have no drop data yet by definition
    _qualityHints: ['peplus-only'],
  };
  if (description) item.description = description;
  return item;
}

// ─── Normalization helpers ────────────────────────────────────────────────────

/**
 * Override numeric stats in place; returns true when an existing value
 * MEANINGFULLY changed. Tolerance is relative (0.1%) because WFCD serializes
 * float32 round-trips (0.25999999) where PE+ writes clean decimals (0.26) —
 * those are the same number, not a balance change, and counting them made
 * the divergence signal useless (578/634 weapons "diverged" on noise).
 */
function overrideStats(item: EnrichedItem, updates: Partial<ItemStats>): boolean {
  let diverged = false;
  let stats = item.stats;
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== 'number' || value <= 0) continue;   // never zero a stat
    if (!stats) stats = item.stats = {};
    const prev = stats[key];
    if (prev !== undefined && Math.abs(prev - value) > Math.abs(value) * 1e-3) diverged = true;
    stats[key] = value;
  }
  return diverged;
}

/**
 * PE+ `damagePerShot` slot index → our lowercase UI damage-type key (the same
 * vocabulary WFCD's `damage` map and WeaponSummaryCard's damageIconFor speak,
 * so no frontend change is needed). The slot order mirrors the IAttackData key
 * declaration in PE+'s shipped index.d.ts (DT_IMPACT, DT_PUNCTURE, DT_SLASH,
 * DT_FIRE, …) and was verified against live data: slots 0–13 are the standard
 * elements and the mapped sum equals totalDamage for every weapon. Slot 15
 * (DT_FINISHER) and slot 19 (the cinematic slot on Wukong's Shadow Clones)
 * carry "true" damage. Unmapped/unused slots are skipped. The schema guard
 * marks damagePerShot critical; deriveDamageTypes' sum check catches a reorder.
 */
const DPS_INDEX_TO_KEY: readonly (string | undefined)[] = [
  'impact', 'puncture', 'slash', 'heat', 'cold', 'electricity', 'toxin', 'blast',
  'radiation', 'gas', 'magnetic', 'viral', 'corrosive', 'void',
  undefined, 'true', undefined, undefined, undefined, 'true',
];

/**
 * Map a PE+ damagePerShot array into TennoplanItem.damageTypes (absolute damage
 * per lowercase type). Returns undefined when there's no usable breakdown so the
 * caller keeps WFCD's map. Bumps report.damageSumWarnings when the mapped sum
 * drifts >2% from totalDamage (a slot reorder/new-type tell — non-fatal).
 */
function deriveDamageTypes(
  dps:    number[] | undefined,
  total:  number | undefined,
  report: OverlayReport,
): Record<string, number> | undefined {
  if (!Array.isArray(dps)) return undefined;
  const out: Record<string, number> = {};
  let sum = 0;
  for (let i = 0; i < dps.length; i++) {
    const v = dps[i];
    if (!(v > 0)) continue;
    const key = DPS_INDEX_TO_KEY[i];
    if (!key) continue;                       // unmapped/special slot
    out[key] = (out[key] ?? 0) + v;
    sum += v;
  }
  if (sum <= 0) return undefined;
  if (typeof total === 'number' && total > 0 && Math.abs(sum - total) > total * 0.02) {
    report.damageSumWarnings++;
  }
  return out;
}

/**
 * Foundry build cost from the item's recipe (keyed by resultType = uniqueName).
 * Requires a real buildTime; credits fall back across buildPrice/creditsCost.
 * Applies to any craftable item.
 */
function applyBuildCost(item: EnrichedItem, recipe: PeRecipe | undefined, report: OverlayReport): void {
  if (!recipe || typeof recipe.buildTime !== 'number' || recipe.buildTime <= 0) return;
  const credits = recipe.buildPrice ?? recipe.creditsCost;
  item.buildCost = {
    credits:   typeof credits === 'number' && credits > 0 ? credits : 0,
    buildTime: recipe.buildTime,
    ...(typeof recipe.skipBuildTimePrice === 'number' && recipe.skipBuildTimePrice > 0
      ? { rushPlatinum: recipe.skipBuildTimePrice }
      : {}),
  };
  report.buildCosts++;
}

/**
 * Total Endo to rank a mod from 0 to max, via DE's fusion formula:
 *   endoToMax = 10 × rarityNum × (2^maxRank − 1)
 * rarityNum: Common 1, Uncommon 2, Rare 3, Legendary 4. PE+'s rarity field
 * already encodes the cost tier (Primed/Umbra/Archon → Legendary, Galvanized/
 * Amalgam/Riven → Rare), verified against known mods (Vitality 10230, Primed
 * Continuity 40920, Galvanized Aptitude 30690). Returns undefined when rarity
 * or max rank is unknown / max rank is 0.
 */
const RARITY_FUSION_NUM: Record<string, number> = { Common: 1, Uncommon: 2, Rare: 3, Legendary: 4 };

function modEndoToMax(rarity: string | undefined, maxRank: number | undefined): number | undefined {
  if (!rarity || typeof maxRank !== 'number' || maxRank <= 0) return undefined;
  const n = RARITY_FUSION_NUM[rarity];
  if (!n) return undefined;
  return 10 * n * (2 ** maxRank - 1);
}

/** DE polarity tags → our lowercase school names (same map WFCD uses). */
const AP_TO_SCHOOL: Record<string, string> = {
  AP_ATTACK:    'madurai',
  AP_DEFENSE:   'vazarin',
  AP_TACTIC:    'naramon',
  AP_POWER:     'zenurik',
  AP_WARD:      'unairu',
  AP_PRECEPT:   'penjaga',
  AP_UMBRA:     'umbra',
  AP_UNIVERSAL: 'universal',
  AP_ANY:       'universal',
};

function normalizeTrigger(trigger: string): string {
  const map: Record<string, string> = {
    AUTO:        'Auto',
    SEMI:        'Semi',
    BURST:       'Burst',
    HELD:        'Held',
    CHARGE:      'Charge',
    ACTIVE:      'Active',
    DUPLEX:      'Duplex',
    AUTOBURST:   'Auto Burst',
  };
  return map[trigger] ?? titleCase(trigger);
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function asRarity(raw: string): ItemRarity | undefined {
  switch (raw.toUpperCase()) {
    case 'COMMON':    return 'Common';
    case 'UNCOMMON':  return 'Uncommon';
    case 'RARE':      return 'Rare';
    case 'LEGENDARY': return 'Legendary';
    default:          return undefined;
  }
}

function bump(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}
