// ---------------------------------------------------------------------------
// Characteristics — computed Advantages / Disadvantages (the wiki's
// "Characteristics" section), generated from codex stats. NO curation.
//
// How: for each peer COHORT (weapons by slot, warframes, companions, sentinels)
// and each ranked stat, rank an item's value against its peers and label the
// percentile band (Very high / Above average / Below average / Very low).
// Notable highs become advantages, notable lows become disadvantages; the
// average middle is omitted (no one needs "average crit"). Mirrors how the
// wiki builds the section, so it scales to every stat-bearing item at once.
//
// Known limitation (documented, not a bug): ranks BASE stats as the codex
// stores them. e.g. Kohm's status is its low per-pellet base, not the
// multishot-aggregated 90% shown in-game — effective-stat ranking is calc-
// engine work for later. Consistent across all items, so the ranking is fair.
// ---------------------------------------------------------------------------

import type {
  TennoplanItem, ItemStats, Characteristic, CharacteristicBand, ItemCharacteristics,
} from '../types';

// ─── Stat specs per cohort type ────────────────────────────────────────────

interface StatSpec {
  key:            keyof ItemStats & string;
  label:          string;
  fmt:            (v: number) => string;
  /** true: higher value = better (most). false: lower = better (reload). */
  higherIsBetter: boolean;
  /** Absent value treated as this (multishot: 1) so the whole cohort ranks. */
  defaultValue?:  number;
  /** Only ever surface as an advantage — a floor value isn't a flaw
   *  (e.g. multishot 1 is normal, not a disadvantage). */
  advantageOnly?: boolean;
}

const pct  = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`;
const num  = (v: number) => Math.round(v).toLocaleString();
const mult = (v: number) => `${v.toFixed(2)}x`;
const sec  = (v: number) => `${v.toFixed(1)}s`;
const rate = (v: number) => `${v.toFixed(2)}/s`;
const dec2 = (v: number) => v.toFixed(2);
const mtr  = (v: number) => `${v.toFixed(1)}m`;

const RANGED: StatSpec[] = [
  { key: 'damage',          label: 'damage',              fmt: num,  higherIsBetter: true },
  { key: 'multishot',       label: 'multishot',           fmt: num,  higherIsBetter: true, defaultValue: 1, advantageOnly: true },
  { key: 'critChance',      label: 'critical chance',     fmt: pct,  higherIsBetter: true },
  { key: 'critMultiplier',  label: 'critical multiplier', fmt: mult, higherIsBetter: true },
  { key: 'statusChance',    label: 'status chance',       fmt: pct,  higherIsBetter: true },
  { key: 'fireRate',        label: 'fire rate',           fmt: rate, higherIsBetter: true },
  { key: 'magazine',        label: 'magazine',            fmt: num,  higherIsBetter: true },
  { key: 'reload',          label: 'reload speed',        fmt: sec,  higherIsBetter: false },
  { key: 'accuracy',        label: 'accuracy',            fmt: num,  higherIsBetter: true },
];

const MELEE: StatSpec[] = [
  { key: 'damage',          label: 'damage',              fmt: num,  higherIsBetter: true },
  { key: 'critChance',      label: 'critical chance',     fmt: pct,  higherIsBetter: true },
  { key: 'critMultiplier',  label: 'critical multiplier', fmt: mult, higherIsBetter: true },
  { key: 'statusChance',    label: 'status chance',       fmt: pct,  higherIsBetter: true },
  { key: 'fireRate',        label: 'attack speed',        fmt: dec2, higherIsBetter: true },
  { key: 'range',           label: 'range',               fmt: mtr,  higherIsBetter: true },
  { key: 'comboDuration',   label: 'combo duration',      fmt: sec,  higherIsBetter: true },
  { key: 'slamAttack',      label: 'slam attack',         fmt: num,  higherIsBetter: true },
];

const WARFRAME: StatSpec[] = [
  { key: 'health',          label: 'health',              fmt: num,  higherIsBetter: true },
  { key: 'shield',          label: 'shield',              fmt: num,  higherIsBetter: true },
  { key: 'armor',           label: 'armor',               fmt: num,  higherIsBetter: true },
  { key: 'energy',          label: 'energy',              fmt: num,  higherIsBetter: true },
  { key: 'sprintSpeed',     label: 'sprint speed',        fmt: dec2, higherIsBetter: true },
];

const SURVIVE: StatSpec[] = [
  { key: 'health',          label: 'health',              fmt: num,  higherIsBetter: true },
  { key: 'shield',          label: 'shield',              fmt: num,  higherIsBetter: true },
  { key: 'armor',           label: 'armor',               fmt: num,  higherIsBetter: true },
];

const WEAPON_SLOT: Record<string, string> = {
  LongGuns: 'Primary', Pistols: 'Secondary', Melee: 'Melee', DrifterMelee: 'Melee',
  SpaceGuns: 'ArchGun', SpaceMelee: 'ArchMelee',
};

const BAND_WORD: Record<CharacteristicBand, string> = {
  'very-high': 'Very high', 'above-average': 'Above average',
  'below-average': 'Below average', 'very-low': 'Very low',
};

/** Min cohort sample (with the stat present) to make a "very high/low" call. */
const MIN_COHORT = 8;
/** Cap per side so a page isn't a wall of bullets. */
const MAX_PER_SIDE = 6;

function cohortOf(item: TennoplanItem): string | null {
  switch (item.category) {
    case 'Warframe':  return `Warframe:${item.subtype ?? 'Suits'}`;
    case 'Companion': return 'Companion';
    case 'Sentinel':  return 'Sentinel';
    case 'Weapon': {
      const slot = WEAPON_SLOT[item.subtype ?? ''];
      return slot ? `Weapon:${slot}` : null;
    }
    default: return null;
  }
}

function specsFor(cohort: string): StatSpec[] {
  if (cohort.startsWith('Warframe')) return WARFRAME;
  if (cohort === 'Companion' || cohort === 'Sentinel') return SURVIVE;
  if (cohort.endsWith('Melee')) return MELEE;
  return RANGED;
}

function bandOf(goodness: number): CharacteristicBand | null {
  if (goodness >= 0.90) return 'very-high';
  if (goodness >= 0.75) return 'above-average';
  if (goodness <= 0.10) return 'very-low';
  if (goodness <= 0.25) return 'below-average';
  return null; // the average middle — omit
}

const isAdvantage = (b: CharacteristicBand) => b === 'very-high' || b === 'above-average';

/**
 * Compute Advantages/Disadvantages for every stat-bearing item, in place.
 * Returns the count of items that received characteristics.
 */
export function applyCharacteristics(items: TennoplanItem[]): number {
  // 1. Group by cohort.
  const groups = new Map<string, TennoplanItem[]>();
  for (const item of items) {
    const c = cohortOf(item);
    if (c) (groups.get(c) ?? groups.set(c, []).get(c)!).push(item);
  }

  // 2. Per cohort + stat: sorted value distribution (default-filled where set).
  const dists = new Map<string, number[]>(); // `${cohort}|${key}` → sorted values
  for (const [cohort, members] of groups) {
    for (const spec of specsFor(cohort)) {
      const vals: number[] = [];
      for (const m of members) {
        const raw = m.stats?.[spec.key] ?? spec.defaultValue;
        if (typeof raw === 'number' && raw > 0) vals.push(raw);
      }
      if (vals.length >= MIN_COHORT) {
        vals.sort((a, b) => a - b);
        dists.set(`${cohort}|${spec.key}`, vals);
      }
    }
  }

  // 3. Rank each item against its cohort.
  let count = 0;
  for (const item of items) {
    const cohort = cohortOf(item);
    if (!cohort) continue;
    const advantages: Characteristic[] = [];
    const disadvantages: Characteristic[] = [];

    for (const spec of specsFor(cohort)) {
      const vals = dists.get(`${cohort}|${spec.key}`);
      if (!vals) continue;
      const v = item.stats?.[spec.key] ?? spec.defaultValue;
      if (typeof v !== 'number' || v <= 0) continue;

      // Percentile = fraction of peers strictly below this value.
      const below = lowerCount(vals, v);
      const raw   = vals.length > 1 ? below / (vals.length - 1) : 0.5;
      const good  = spec.higherIsBetter ? raw : 1 - raw;
      const band  = bandOf(good);
      if (!band) continue;

      const note: Characteristic & { _g: number } = {
        stat: spec.key, band, text: `${BAND_WORD[band]} ${spec.label} (${spec.fmt(v)})`, _g: good,
      };
      if (isAdvantage(band)) advantages.push(note);
      else if (!spec.advantageOnly) disadvantages.push(note);
    }

    if (advantages.length === 0 && disadvantages.length === 0) continue;
    advantages.sort((a, b) => (b as any)._g - (a as any)._g);
    disadvantages.sort((a, b) => (a as any)._g - (b as any)._g);
    item.characteristics = {
      advantages:    advantages.slice(0, MAX_PER_SIDE).map(strip),
      disadvantages: disadvantages.slice(0, MAX_PER_SIDE).map(strip),
    };
    count++;
  }
  return count;
}

/** Count of array entries strictly less than v (array is sorted ascending). */
function lowerCount(sorted: number[], v: number): number {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; }
  return lo;
}

function strip(c: Characteristic & { _g?: number }): Characteristic {
  return { stat: c.stat, band: c.band, text: c.text };
}
