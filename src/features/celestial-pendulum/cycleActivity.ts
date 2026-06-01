/**
 * cycleActivity — static config for the Celestial Pendulum "Orrery".
 *
 * This is the single source of truth for the *meaning* of a cycle phase:
 * what activity each world/state unlocks, why it matters, and which
 * resources it yields. The page and its components stay presentational.
 *
 * Design intent (impeccable v3): the user must FEEL the time and know what
 * happens during it. A bare "NIGHT" label says nothing — "Eidolon Hunt"
 * with a prime-window marker says everything.
 */

import type { CycleId } from '@/core/domain/cycles';
import { getPlanetArt, getPlanetCrop } from '@/lib/planets/planetArt';
import { PRESTIGE_LEVEL } from '@/tokens/worldThemes';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KeyResource {
  name:   string;
  source: string;
}

export interface CycleActivity {
  /** Short headline of what's happening, e.g. "Eidolon Hunt". */
  label:   string;
  /** One-line intel — why this window matters. ≤ ~110 chars. */
  blurb:   string;
  /** True for a high-value, time-gated window (P0 prestige). */
  isPrime: boolean;
}

export interface WorldMeta {
  id:       CycleId;
  /** Display label shown on the card, e.g. "FORTUNA". */
  label:    string;
  /** Region/hub name, e.g. "Orb Vallis". */
  region:   string;
  /** Local planet art URL, or undefined for worlds with no render (Duviri). */
  art?:     string;
  /**
   * Crop hint for the circular thumb. The source PNGs are hand-curated and
   * inconsistently framed (some planets sit off-centre, some carry stray
   * ornaments in the margins), so each one gets a static object-position +
   * zoom so the planet lands centred in its ring. Tweak the two numbers per
   * world while watching the live page — the art never changes, so these are
   * set-once constants, not recurring upkeep.
   */
  artPosition?: string;
  artScale?:    number;
}

// ─── Curated world order ─────────────────────────────────────────────────────
// Only the worlds players actively track for cycle-gated activities. Earth is
// intentionally excluded (no bounties, redundant with the Cetus region).

export const ORRERY_ORDER: CycleId[] = ['cetus', 'vallis', 'cambion', 'zariman', 'duviri'];

interface WorldMetaSeed {
  label:  string;
  region: string;
  /** Planet/region name → resolves to art + crop via planetArt.ts. */
  planet: string | null;
}

const WORLD_META: Record<string, WorldMetaSeed> = {
  cetus:   { label: 'CETUS',   region: 'Plains of Eidolon',  planet: 'Cetus'   },
  vallis:  { label: 'FORTUNA', region: 'Orb Vallis',         planet: 'Fortuna' },
  cambion: { label: 'DEIMOS',  region: 'Cambion Drift',      planet: 'Cambion' },
  zariman: { label: 'ZARIMAN', region: 'Chrysalith',         planet: 'Zariman' },
  duviri:  { label: 'DUVIRI',  region: 'The Duviri Paradox', planet: null      },
  earth:   { label: 'EARTH',   region: 'Earth',              planet: 'Earth'   },
};

export function getWorldMeta(id: CycleId): WorldMeta {
  const m = WORLD_META[id] ?? { label: id.toUpperCase(), region: '', planet: null };
  // Crop hints live in planetArt.ts so the orrery and codex thumbs never diverge.
  const crop = getPlanetCrop(m.planet);
  return {
    id,
    label:       m.label,
    region:      m.region,
    art:         m.planet ? getPlanetArt(m.planet) : undefined,
    artPosition: crop.position,
    artScale:    crop.scale,
  };
}

// ─── Activity per world/state ────────────────────────────────────────────────

const ACTIVITY: Record<string, Omit<CycleActivity, 'isPrime'>> = {
  'cetus-day': {
    label: 'Plains Bounties',
    blurb: 'Daytime Ostron bounties and open mining. Iradite and Maprico surface under sunlight.',
  },
  'cetus-night': {
    label: 'Eidolon Hunt',
    blurb: 'Teralyst, Gantulyst and Hydrolyst roam the Plains. Arcanes and Eidolon Shards drop only now.',
  },
  'vallis-warm': {
    label: 'Exploiter Orb',
    blurb: 'Warm-only window. Charge Thermia fractures, then drop the Exploiter Orb for Lazulite Toroids.',
  },
  'vallis-cold': {
    label: 'Toroid Sweep',
    blurb: 'Default Vallis state. Toroids and coolant deposits across the caves and Temple of Profit.',
  },
  'cambion-fass': {
    label: 'Fass — Vault Run',
    blurb: 'Fass Residue is active. Run Isolation Vaults for Scintillant and Necramech parts.',
  },
  'cambion-vome': {
    label: 'Vome Cycle',
    blurb: 'Vome Residue is active. Collect both residue types across a full cycle for Entrati standing.',
  },
  'zariman-corpus': {
    label: 'Holdfast Bounties',
    blurb: 'Corpus-held rotation. Voidplume and Holdfast standing from the Chrysalith bounty board.',
  },
  'zariman-grineer': {
    label: 'Holdfast Bounties',
    blurb: 'Grineer-held rotation. Voidplume and Holdfast standing from the Chrysalith bounty board.',
  },
  'earth-day': {
    label: 'Day Cycle',
    blurb: 'Earth proxima in daylight. No gated rewards — purely cosmetic.',
  },
  'earth-night': {
    label: 'Night Cycle',
    blurb: 'Earth proxima after dark. No gated rewards — purely cosmetic.',
  },
};

const DUVIRI_BLURB =
  'The Spiral mood shapes which decrees appear. Pathos Clamps and Incarnon adapters come from the Circuit.';

/**
 * Resolve the activity for a world + state. Duviri moods collapse to a single
 * "The Circuit · <Mood>" activity; unknown keys fall back to a capitalised state.
 */
export function getActivity(id: CycleId, state: string): CycleActivity {
  const isPrime = (PRESTIGE_LEVEL[`${id}-${state}`] ?? 'none') === 'P0';

  if (id === 'duviri') {
    const mood = state.charAt(0).toUpperCase() + state.slice(1);
    return { label: `The Circuit · ${mood}`, blurb: DUVIRI_BLURB, isPrime };
  }

  const entry = ACTIVITY[`${id}-${state}`];
  if (entry) return { ...entry, isPrime };

  const cap = state.charAt(0).toUpperCase() + state.slice(1);
  return { label: cap, blurb: '', isPrime };
}

// ─── Key resources per world/state ───────────────────────────────────────────

export const KEY_RESOURCES: Record<string, KeyResource[]> = {
  'cetus-day': [
    { name: 'Iradite',           source: 'Rock formations' },
    { name: 'Grokdrul',          source: 'Grineer camps' },
    { name: 'Breath of Eidolon', source: 'Bounties Lv.4+' },
    { name: 'Sentirum',          source: 'Mining (rare)' },
  ],
  'cetus-night': [
    { name: 'Arcane Energize',          source: 'Eidolon hunts' },
    { name: 'Brilliant Eidolon Shard',  source: 'Eidolons' },
    { name: 'Cetus Wisp',               source: 'Plains (glowing)' },
    { name: 'Intact Sentient Core',     source: 'Sentients' },
  ],
  'vallis-warm': [
    { name: 'Lazulite Toroid',   source: 'Exploiter Orb' },
    { name: 'Atmo Systems',      source: 'Coolant pools' },
    { name: 'Thermal Sludge',    source: 'Mining' },
    { name: 'Mytocardia Spore',  source: 'Conservation' },
  ],
  'vallis-cold': [
    { name: 'Toroid',            source: 'Spiders & caves' },
    { name: 'Repeller Systems',  source: 'Profit-Taker' },
    { name: 'Gyromag Systems',   source: 'Heist bounties' },
    { name: 'Amarast',           source: 'Mining' },
  ],
  'cambion-fass': [
    { name: 'Scintillant',       source: 'Isolation Vaults' },
    { name: 'Fass Residue',      source: 'Fass Wyrm' },
    { name: 'Mother Token',      source: 'Bounties' },
    { name: 'Ganglion',          source: 'Infested deposits' },
  ],
  'cambion-vome': [
    { name: 'Vome Residue',      source: 'Vome Wyrm' },
    { name: 'Pustulite',         source: 'Mining' },
    { name: 'Son Token',         source: 'Conservation' },
    { name: 'Ganglion',          source: 'Infested deposits' },
  ],
  'zariman-corpus': [
    { name: 'Voidplume Quill',   source: 'Bounties Lv.3' },
    { name: 'Holdfast Token',    source: 'Bounties' },
    { name: 'Incarnon Genesis',  source: 'Bounties (rare)' },
    { name: 'Voidplume Down',    source: 'Bounties Lv.2' },
  ],
  'zariman-grineer': [
    { name: 'Voidplume Quill',   source: 'Bounties Lv.3' },
    { name: 'Holdfast Token',    source: 'Bounties' },
    { name: 'Incarnon Genesis',  source: 'Bounties (rare)' },
    { name: 'Voidplume Down',    source: 'Bounties Lv.2' },
  ],
  'duviri-joy':    [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-anger':  [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-envy':   [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-sorrow': [{ name: 'Pathos Clamp', source: 'The Circuit' }],
  'duviri-fear':   [{ name: 'Pathos Clamp', source: 'The Circuit' }],
};

export function getKeyResources(id: CycleId, state: string): KeyResource[] {
  return KEY_RESOURCES[`${id}-${state}`] ?? [];
}

// ─── Syndicate mapping (for bounty lookup) ───────────────────────────────────

export const CYCLE_TO_SYNDICATE: Partial<Record<CycleId, string>> = {
  cetus:   'Ostron',
  vallis:  'Solaris United',
  cambion: 'Entrati',
  zariman: 'The Holdfasts',
};

// ─── Countdown formatting ────────────────────────────────────────────────────

/** Live H:MM:SS / MM:SS countdown for cards and the hero. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Coarse "1h 23m" / "47m" label for next-phase ghosts. */
export function formatCoarse(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}
