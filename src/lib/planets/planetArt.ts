/**
 * planetArt — maps Warframe planet/region names to local stylized art.
 *
 * Static Vite imports so the bundler hashes + chunks the PNGs alongside
 * the rest of the asset graph. Unknown / open-world / relay labels get
 * normalized to their parent planet (Cetus → Earth, Fortuna → Venus,
 * Necralisk → Deimos, Zariman → New Zariman) so the visual treatment
 * stays consistent regardless of which mission frame surfaced the drop.
 *
 * Asset source: `src/assets/worlds/*.png` — user-curated stylized renders,
 * not WFCD/CDN. Filename casing matches the export (Kuva_Fortress.png,
 * New_Zariman.png — underscored where the in-game label has spaces).
 */

import ceres        from '@/assets/worlds/Ceres.png';
import deimos       from '@/assets/worlds/Deimos.png';
import earth        from '@/assets/worlds/Earth.png';
import eris         from '@/assets/worlds/Eris.png';
import europa       from '@/assets/worlds/Europa.png';
import jupiter      from '@/assets/worlds/Jupiter.png';
import kuvaFortress from '@/assets/worlds/Kuva_Fortress.png';
import lua          from '@/assets/worlds/Lua.png';
import mars         from '@/assets/worlds/Mars.png';
import mercury      from '@/assets/worlds/Mercury.png';
import neptune      from '@/assets/worlds/Neptune.png';
import newZariman   from '@/assets/worlds/New_Zariman.png';
import phobos       from '@/assets/worlds/Phobos.png';
import pluto        from '@/assets/worlds/Pluto.png';
import saturn       from '@/assets/worlds/Saturn.png';
import sedna        from '@/assets/worlds/Sedna.png';
import uranus       from '@/assets/worlds/Uranus.png';
import venus        from '@/assets/worlds/Venus.png';
import voidArt      from '@/assets/worlds/Void.png';

/**
 * Canonical display name → PNG URL.
 * Keys are case-preserved display names (used directly in labels).
 * Use `getPlanetArt(name)` for lookups — it handles aliasing + casing.
 */
export const PLANET_ART: Record<string, string> = {
  'Ceres':         ceres,
  'Deimos':        deimos,
  'Earth':         earth,
  'Eris':          eris,
  'Europa':        europa,
  'Jupiter':       jupiter,
  'Kuva Fortress': kuvaFortress,
  'Lua':           lua,
  'Mars':          mars,
  'Mercury':       mercury,
  'Neptune':       neptune,
  'New Zariman':   newZariman,
  'Phobos':        phobos,
  'Pluto':         pluto,
  'Saturn':        saturn,
  'Sedna':         sedna,
  'Uranus':        uranus,
  'Venus':         venus,
  'Void':          voidArt,
};

/**
 * Aliases — open-world tilesets, relays, and Lich/Sister tilesets all live
 * inside a parent planet. We collapse them so the visual representation
 * stays anchored to the celestial body the player navigates to.
 *
 * Keys are lowercased to match the normalizer's comparison.
 */
const PLANET_ALIASES: Record<string, string> = {
  // Open worlds
  'cetus':                'Earth',
  'plains of eidolon':    'Earth',
  'plains':               'Earth',
  'fortuna':              'Venus',
  'orb vallis':           'Venus',
  'vallis':               'Venus',
  'cambion':              'Deimos',
  'cambion drift':        'Deimos',
  'necralisk':            'Deimos',
  'entrati vaults':       'Deimos',
  'entrati labs':         'Deimos',
  'zariman':              'New Zariman',
  'zariman ten zero':     'New Zariman',
  'new zariman':          'New Zariman',
  'hollvania':            'Earth',     // 1999 Höllvania — no dedicated art yet
  'höllvania':            'Earth',
  // The Moon
  'lua':                  'Lua',
  'the moon':             'Lua',
  'moon':                 'Lua',
  // Kuva
  'kuva fortress':        'Kuva Fortress',
  'kuva':                 'Kuva Fortress',
  // Void
  'void':                 'Void',
  'the void':             'Void',
};

/**
 * Normalize a raw planet / region name to a canonical PLANET_ART key.
 * Returns null when the name doesn't resolve to any known asset.
 */
export function normalizePlanetName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  // Exact alias hit (open worlds, special tilesets) wins.
  if (PLANET_ALIASES[lower]) return PLANET_ALIASES[lower];

  // Title-case + direct lookup against PLANET_ART keys.
  const titleCased = trimmed
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
  if (PLANET_ART[titleCased]) return titleCased;

  return null;
}

/** Get the PNG URL for a planet/region name, or undefined when unknown. */
export function getPlanetArt(raw: string | null | undefined): string | undefined {
  const canonical = normalizePlanetName(raw);
  return canonical ? PLANET_ART[canonical] : undefined;
}

/**
 * Pull the planet name out of a DropLocation. Tries multiple sources
 * because the worker enricher stamps planet info into different fields
 * depending on the drop source (mission vs. bounty vs. blueprint loc).
 *
 *   • `missions[0]` is "Earth/Hepit (Capture)" for mission rewards —
 *     prefix before slash is the planet.
 *   • `location` for bounties is "Cetus bounty Lv5-15 (A)" — first
 *     word is the open-world label (Cetus → Earth, etc.).
 *   • `location` for blueprint drops is sometimes "Earth/Mantle" too.
 *
 * Returns the canonical PLANET_ART key, or null when no planet can be
 * derived (relic drops, mod-by-enemy drops, etc.).
 */
export function planetFromDropLocation(d: {
  location?:  string;
  missions?:  string[];
}): string | null {
  // Prefer missions[0] — it's the most structured form.
  const mission = d.missions?.[0];
  if (mission) {
    const head = mission.split('/')[0]?.trim();
    const normalized = normalizePlanetName(head);
    if (normalized) return normalized;
  }
  if (d.location) {
    // "Earth/Mantle" — split on slash.
    const head = d.location.split('/')[0]?.trim();
    if (head && head !== d.location) {
      const normalized = normalizePlanetName(head);
      if (normalized) return normalized;
    }
    // "Cetus bounty Lv5-15 (A)" — first word is the open-world label.
    const firstWord = d.location.split(/\s+/)[0];
    if (firstWord) {
      const normalized = normalizePlanetName(firstWord);
      if (normalized) return normalized;
    }
  }
  return null;
}

/**
 * Aggregate a drop list by planet. Returns entries sorted by best chance
 * (highest first), so the primary source lands at index 0.
 */
export interface PlanetAggregate {
  planet:    string;          // canonical PLANET_ART key
  art:       string;          // PNG URL
  bestChance: number;         // 0.0–1.0, max across drops on this planet
  totalDrops: number;         // count of drop entries
  nodeCount:  number;         // distinct node count (heuristic)
  steelPath:  boolean;        // true when at least one drop is Steel Path
}

export function aggregateDropsByPlanet(
  drops: ReadonlyArray<{
    location?:     string;
    missions?:     string[];
    chance:        number;
    isSteelPath?:  boolean;
  }>,
): PlanetAggregate[] {
  const byPlanet = new Map<string, {
    bestChance: number;
    totalDrops: number;
    nodes:      Set<string>;
    steelPath:  boolean;
  }>();

  for (const d of drops) {
    const planet = planetFromDropLocation(d);
    if (!planet) continue;
    const art = PLANET_ART[planet];
    if (!art) continue;

    let agg = byPlanet.get(planet);
    if (!agg) {
      agg = { bestChance: 0, totalDrops: 0, nodes: new Set(), steelPath: false };
      byPlanet.set(planet, agg);
    }
    agg.bestChance  = Math.max(agg.bestChance, d.chance);
    agg.totalDrops += 1;
    if (d.isSteelPath) agg.steelPath = true;

    // Heuristic node identity: missions[0] when present, else location.
    const nodeKey = d.missions?.[0] ?? d.location;
    if (nodeKey) agg.nodes.add(nodeKey);
  }

  const out: PlanetAggregate[] = [];
  for (const [planet, agg] of byPlanet) {
    out.push({
      planet,
      art:        PLANET_ART[planet]!,
      bestChance: agg.bestChance,
      totalDrops: agg.totalDrops,
      nodeCount:  agg.nodes.size,
      steelPath:  agg.steelPath,
    });
  }
  out.sort((a, b) => b.bestChance - a.bestChance);
  return out;
}
