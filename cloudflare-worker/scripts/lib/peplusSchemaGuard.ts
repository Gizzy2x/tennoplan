// ---------------------------------------------------------------------------
// Public Export Plus schema-drift guard — Codex v2 phase A safety net.
//
// Why this exists:
//   The PE+ overlay (peplusOverlay.ts) reads PE+ fields POSITIONALLY by name
//   (`totalDamage`, `criticalChance`, `baseDrain`, …). PE+ is a generated npm
//   package with NO changelog and no declared license — if DE renames or drops
//   a field, our reads silently become `undefined`, `overrideStats` skips them
//   (peplusOverlay.ts), and the codex quietly degrades to stale WFCD numbers
//   with ZERO error. That is exactly the "silent strip hides drift" failure the
//   tokenScanner was built to catch — this is its twin for PE+ field shapes.
//
// What it does (mirrors tokenScanner's known-set → diff pattern):
//   • Snapshot, per consumed export, the fields the overlay reads (+ a
//     `critical` flag) and the FULL set of top-level keys seen at snapshot time.
//   • At build time, after loadPePlus(), count how many records carry each
//     consumed field and collect the actual key union.
//   • CRITICAL field present on ZERO records of a non-empty export → FATAL.
//     (A universal stat/identity field at literally 0 is unambiguous drift —
//     DE renamed/removed it. Partial-presence optional fields never hit 0 if
//     they are real, so this is a non-flaky signal.) The build fails, last-good
//     keeps serving — same fail-clean posture as the size gate + token scan.
//   • NEW top-level key not in the snapshot baseline → WARN (informational:
//     "PE+ added X" — an enrichment opportunity, never breaks the build).
//   • EVERY consumed field's presence % is logged each build — the visible
//     "tell me" surface for soft drift on non-critical fields (no auto-WARN
//     there: flags like codexSecret are sparse by design, 0 is legitimate).
//
// Accepting an intentional change = update SCHEMA below. Same ergonomics as the
// known-tokens registry. Build-only (never bundled into the worker).
// ---------------------------------------------------------------------------

import type { PePlusData } from './peplus';

// ─── The snapshot (the "known schema") ─────────────────────────────────────────

type MapKey = 'warframes' | 'weapons' | 'mods' | 'arcanes';

interface FieldSpec {
  /** Field the overlay reads from a record. */
  field:    string;
  /** Present on 0 records of a non-empty export → FATAL. Reserve for fields
   *  whose silent loss ships WRONG or MISSING data: numeric OVERRIDE targets,
   *  identity (name), and weapon productCategory (drives synthesis). Fill-only
   *  enums (polarity, rarity, trigger…) are NON-critical — their loss only
   *  forfeits a gap-fill, WFCD's value stands. */
  critical: boolean;
}

interface ExportSpec {
  /** Source file name — for human-readable messages only. */
  exportFile: string;
  /** Which PePlusData map carries these records. */
  mapKey:     MapKey;
  /** Fields the overlay consumes, with criticality. */
  consumed:   FieldSpec[];
  /** Full top-level key union captured at snapshot time (2026-06-14, PE+ as
   *  installed). New keys absent from this list fire the opportunity WARN. */
  knownKeys:  readonly string[];
}

const C = (field: string): FieldSpec => ({ field, critical: true });
const o = (field: string): FieldSpec => ({ field, critical: false });

const SCHEMA: readonly ExportSpec[] = [
  {
    exportFile: 'ExportWarframes.json',
    mapKey:     'warframes',
    consumed: [
      C('name'), C('health'), C('shield'), C('armor'), C('power'),
      o('description'), o('sprintSpeed'), o('masteryReq'), o('productCategory'),
      o('codexSecret'), o('variantType'),
    ],
    knownKeys: [
      'abilities', 'additionalItems', 'armor', 'codexSecret', 'description',
      'exalted', 'excludeFromMarket', 'health', 'icon', 'introducedAt',
      'longDescription', 'masteryReq', 'maxLevelCap', 'name', 'nemesisUpgradeTag',
      'parentName', 'passiveDescription', 'platinumCost', 'power',
      'productCategory', 'shield', 'sprintSpeed', 'stamina', 'variantType',
    ],
  },
  {
    exportFile: 'ExportWeapons.json',
    mapKey:     'weapons',
    consumed: [
      C('name'), C('totalDamage'), C('damagePerShot'), C('criticalChance'),
      C('criticalMultiplier'), C('procChance'), C('fireRate'), C('productCategory'),
      o('description'), o('magazineSize'), o('reloadTime'), o('accuracy'),
      o('multishot'), o('omegaAttenuation'), o('masteryReq'), o('trigger'), o('noise'),
      o('codexSecret'), o('tradable'), o('variantType'),
    ],
    knownKeys: [
      'accuracy', 'additionalItems', 'bayonetOtherWeaponType', 'behaviours',
      'blockingAngle', 'codexSecret', 'comboDuration', 'compatibilityTags',
      'creditsCost', 'criticalChance', 'criticalMultiplier', 'damagePerShot',
      'defaultUpgrades', 'description', 'donationStandingBonus', 'excludeFromCodex',
      'excludeFromMarket', 'fireRate', 'followThrough', 'gunType',
      'heavyAttackDamage', 'heavySlamAttack', 'heavySlamRadialDamage',
      'heavySlamRadius', 'holsterCategory', 'icon', 'introducedAt', 'magazineSize',
      'masteryReq', 'maxLevelCap', 'multishot', 'name', 'noise', 'omegaAttenuation',
      'parentName', 'partType', 'platinumCost', 'primeOmegaAttenuation',
      'procChance', 'productCategory', 'range', 'reloadTime', 'sentinel',
      'slamAttack', 'slamRadialDamage', 'slamRadius', 'slideAttack', 'slot',
      'totalDamage', 'tradable', 'trigger', 'variantType', 'windUp',
    ],
  },
  {
    exportFile: 'ExportUpgrades.json',
    mapKey:     'mods',
    consumed: [
      C('name'), C('baseDrain'),
      o('description'), o('polarity'), o('rarity'), o('fusionLimit'),
      o('compatName'), o('type'), o('codexSecret'), o('tradable'),
    ],
    knownKeys: [
      'availableChallenges', 'baseDrain', 'codexSecret', 'compat', 'compatName',
      'compatibilityTags', 'compatibleItems', 'description', 'excludeFromCodex',
      'fusionLimit', 'icon', 'incompatibilityTags', 'introducedAt', 'isFrivolous',
      'isStarter', 'isUtility', 'levelStats', 'modSet', 'modSetValues', 'name',
      'polarity', 'rarity', 'subtype', 'tradable', 'type', 'upgradeEntries',
    ],
  },
  {
    exportFile: 'ExportArcanes.json',
    mapKey:     'arcanes',
    consumed: [
      C('name'),
      o('description'), o('rarity'), o('codexSecret'),
    ],
    knownKeys: [
      'codexSecret', 'distillPointValue', 'excludeFromCodex', 'fusionLimit',
      'icon', 'levelStats', 'name', 'rarity',
    ],
  },
];

// ─── Report shape ───────────────────────────────────────────────────────────

export interface FieldCoverage {
  field:    string;
  critical: boolean;
  present:  number;
  total:    number;
  pct:      number;
}

export interface ExportCoverage {
  exportFile: string;
  total:      number;
  fields:     FieldCoverage[];
}

export interface SchemaGuardReport {
  /** false when any critical field vanished — caller should exit(1). */
  ok:               boolean;
  coverage:         ExportCoverage[];
  /** Critical fields on 0 records of a non-empty export — FATAL. */
  vanishedCritical: { exportFile: string; field: string }[];
  /** Top-level keys present in data but absent from the snapshot — WARN. */
  newFields:        { exportFile: string; field: string }[];
}

// ─── The check ────────────────────────────────────────────────────────────────

export function checkPePlusSchema(pe: PePlusData): SchemaGuardReport {
  const coverage:         ExportCoverage[] = [];
  const vanishedCritical: SchemaGuardReport['vanishedCritical'] = [];
  const newFields:        SchemaGuardReport['newFields'] = [];

  for (const spec of SCHEMA) {
    const map = pe[spec.mapKey];
    const records = [...map.values()] as unknown as Record<string, unknown>[];
    const total = records.length;

    // Presence count per consumed field + actual key union in one pass.
    const presence = new Map<string, number>(spec.consumed.map((f) => [f.field, 0]));
    const seenKeys = new Set<string>();
    for (const rec of records) {
      for (const key of Object.keys(rec)) {
        seenKeys.add(key);
        const v = rec[key];
        if (presence.has(key) && v !== undefined && v !== null) {
          presence.set(key, presence.get(key)! + 1);
        }
      }
    }

    const fields: FieldCoverage[] = spec.consumed.map((f) => {
      const present = presence.get(f.field) ?? 0;
      const pct = total > 0 ? (present / total) * 100 : 0;
      if (f.critical && total > 0 && present === 0) {
        vanishedCritical.push({ exportFile: spec.exportFile, field: f.field });
      }
      return { field: f.field, critical: f.critical, present, total, pct };
    });
    coverage.push({ exportFile: spec.exportFile, total, fields });

    // New-field detection: actual keys not in the committed baseline.
    const known = new Set(spec.knownKeys);
    for (const key of [...seenKeys].sort()) {
      if (!known.has(key)) newFields.push({ exportFile: spec.exportFile, field: key });
    }
  }

  return { ok: vanishedCritical.length === 0, coverage, vanishedCritical, newFields };
}

// ─── Formatting for CI logs ─────────────────────────────────────────────────

export function formatSchemaGuard(r: SchemaGuardReport): string {
  const lines: string[] = [];

  for (const ex of r.coverage) {
    lines.push(`  ${ex.exportFile} (${ex.total} records):`);
    for (const f of ex.fields) {
      const tag = f.critical ? '[crit]' : '      ';
      const pct = f.pct.toFixed(0).padStart(3);
      const flag = f.critical && f.present === 0 ? '  <-- VANISHED' : '';
      lines.push(`    ${tag} ${f.field.padEnd(20)} ${pct}%  (${f.present}/${f.total})${flag}`);
    }
  }

  if (r.newFields.length > 0) {
    lines.push('');
    lines.push(`  WARN — ${r.newFields.length} new PE+ field(s) not in the snapshot (enrichment opportunity):`);
    for (const n of r.newFields) lines.push(`    + ${n.exportFile}: ${n.field}`);
    lines.push('    To acknowledge: add the key to the matching knownKeys[] in peplusSchemaGuard.ts.');
  }

  if (r.vanishedCritical.length > 0) {
    lines.push('');
    lines.push(`  FATAL — ${r.vanishedCritical.length} critical PE+ field(s) vanished (DE likely renamed/removed them):`);
    for (const v of r.vanishedCritical) lines.push(`    ! ${v.exportFile}: ${v.field}`);
    lines.push('    The overlay reads these positionally — silent loss would ship stale data.');
    lines.push('    Fix: check PE+ for the rename, update peplus.ts + peplusOverlay.ts + the');
    lines.push('    SCHEMA snapshot in peplusSchemaGuard.ts, then rebuild.');
  }

  return lines.join('\n');
}
