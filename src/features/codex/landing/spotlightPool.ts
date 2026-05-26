/**
 * Curated spotlight pool for the Codex landing.
 *
 * One uniqueName per entry. Rotates weekly via deterministic UTC-week
 * indexing — every user sees the same item all week, then it advances
 * on UTC Monday 00:00. Slower than daily (which would feel gimmicky)
 * but faster than monthly (which would feel stagnant).
 *
 * Pool composition mixes iconic warframes and famously-useful mods so
 * the spotlight stays interesting whether a player is new (oh that's
 * what Streamline does) or returning (oh Mesa Prime is back). Weapons,
 * companions, and other categories join the pool as their codex
 * coverage lands.
 *
 * When a pool item is missing from Dexie (codex not synced, or upstream
 * dropped the item), the resolver walks forward in the pool until it
 * finds one that exists. That keeps the spotlight valid even on a
 * fresh install where only the bundled mod fallback is available.
 */

export interface SpotlightPoolEntry {
  uniqueName: string;
  /** Display hint for fallback when Dexie hasn't resolved yet. */
  hint?:      string;
}

/**
 * Pool order is the rotation order. Pick items players will recognise
 * — landing a stranger's name in the spotlight on week one would be a
 * weird first impression. We seed with widely-known entries.
 *
 * NOTE: uniqueNames come from DE's Public Export — they are stable
 * across patches. If DE ever changes one, the resolver's "next in pool"
 * fallback covers the gap until we update this file.
 */
export const SPOTLIGHT_POOL: SpotlightPoolEntry[] = [
  // ── Warframes (iconic / popular) ─────────────────────────────────
  { uniqueName: '/Lotus/Powersuits/Volt/VoltPrime',           hint: 'Volt Prime' },
  { uniqueName: '/Lotus/Powersuits/Mag/MagPrime',             hint: 'Mag Prime' },
  { uniqueName: '/Lotus/Powersuits/Excalibur/ExcaliburPrime', hint: 'Excalibur Prime' },
  { uniqueName: '/Lotus/Powersuits/Mesa/MesaPrime',           hint: 'Mesa Prime' },
  { uniqueName: '/Lotus/Powersuits/Saryn/SarynPrime',         hint: 'Saryn Prime' },
  { uniqueName: '/Lotus/Powersuits/Nyx/NyxPrime',             hint: 'Nyx Prime' },
  { uniqueName: '/Lotus/Powersuits/Trinity/TrinityPrime',     hint: 'Trinity Prime' },
  { uniqueName: '/Lotus/Powersuits/Nezha/NezhaPrime',         hint: 'Nezha Prime' },

  // ── Mods (universal staples) ─────────────────────────────────────
  { uniqueName: '/Lotus/Upgrades/Mods/Rifle/Base/RifleDamageMod',         hint: 'Serration' },
  { uniqueName: '/Lotus/Upgrades/Mods/Pistol/Damage/PistolDamageMod',     hint: 'Hornet Strike' },
  { uniqueName: '/Lotus/Upgrades/Mods/Shotgun/ShotgunDamageMod',          hint: 'Point Blank' },
  { uniqueName: '/Lotus/Upgrades/Mods/Melee/PressurePointMod',            hint: 'Pressure Point' },
  { uniqueName: '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityEfficiencyMod', hint: 'Streamline' },
  { uniqueName: '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityStrengthMod',   hint: 'Intensify' },
  { uniqueName: '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityRangeMod',      hint: 'Stretch' },
  { uniqueName: '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityDurationMod',   hint: 'Continuity' },

  // ── Mods (notable augments / playstyle-defining) ─────────────────
  { uniqueName: '/Lotus/Upgrades/Mods/Sets/CorrosiveProjectionMod',         hint: 'Corrosive Projection' },
  { uniqueName: '/Lotus/Upgrades/Mods/Rifle/CriticalChanceModRifle',        hint: 'Point Strike' },
  { uniqueName: '/Lotus/Upgrades/Mods/Rifle/CriticalDamageModRifle',        hint: 'Vital Sense' },
  { uniqueName: '/Lotus/Upgrades/Mods/Pistol/CriticalChanceModPistol',      hint: 'Pistol Gambit' },
];

const EPOCH_MS_UTC = Date.UTC(2024, 0, 1); // Monday, 1 Jan 2024 — arbitrary fixed reference
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Index into the pool for the current week. UTC-Monday rollover.
 * Same value all week for every user — pool index is deterministic
 * from wall-clock UTC and the fixed epoch above.
 */
export function currentSpotlightIndex(now: number = Date.now()): number {
  const weeksSinceEpoch = Math.floor((now - EPOCH_MS_UTC) / WEEK_MS);
  return ((weeksSinceEpoch % SPOTLIGHT_POOL.length) + SPOTLIGHT_POOL.length) % SPOTLIGHT_POOL.length;
}

/**
 * Walk the pool starting at the current week's index, returning the first
 * uniqueName for which `resolver` returns a truthy result. Returns null
 * if every pool entry is missing (codex never synced and bundled
 * fallback also can't satisfy any pool entry).
 */
export function resolveCurrentSpotlight<T>(
  resolver: (uniqueName: string) => T | undefined | null,
  now: number = Date.now(),
): { entry: SpotlightPoolEntry; value: T } | null {
  const start = currentSpotlightIndex(now);
  for (let i = 0; i < SPOTLIGHT_POOL.length; i++) {
    const idx = (start + i) % SPOTLIGHT_POOL.length;
    const entry = SPOTLIGHT_POOL[idx];
    if (!entry) continue;
    const value = resolver(entry.uniqueName);
    if (value) return { entry, value };
  }
  return null;
}
