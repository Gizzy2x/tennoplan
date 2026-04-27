/**
 * Tactical Radar map data — SVG blueprint paths + hotspot nodes.
 *
 * ViewBox for all maps: "0 0 400 220"
 * Paths are abstract schematics, not literal in-game maps.
 * Hotspot coords correspond to that ViewBox space.
 *
 * Hotspot visibility:
 *   active   — current cycle's farming nodes (bright, solid)
 *   approach — next cycle's nodes when isPreHeat (hollow, pulsing ghost)
 */

import type { CycleId } from '@/core/domain/cycles';

export interface RadarHotspot {
  id:       string;
  label:    string;     // location name, e.g. "Eidolon Lake"
  resource: string;     // what you're farming there
  tip:      string;     // short how-to
  cx:       number;     // SVG x coord (0–400)
  cy:       number;     // SVG y coord (0–220)
  tier:     'primary' | 'secondary';
  cycles:   string[];   // state keys this hotspot is active for
}

export interface RadarMapDef {
  id:        CycleId;
  /** Outer boundary path — thin, ~25% opacity */
  boundary:  string;
  /** Interior terrain / topology hints — very thin, ~12% opacity */
  terrain:   string[];
  /** Named zone outlines (e.g. lake, cave cluster) */
  zones:     { id: string; path: string; label: string }[];
  /** Entry point marker (always visible) */
  entryPoint:{ cx: number; cy: number; label: string };
  hotspots:  RadarHotspot[];
}

// ─── Cetus — Plains of Eidolon ────────────────────────────────────────────────

export const CETUS_MAP: RadarMapDef = {
  id: 'cetus',
  boundary: 'M 15,210 L 5,150 L 15,90 L 40,45 L 85,15 L 165,8 L 255,10 L 330,20 L 375,55 L 388,110 L 375,165 L 345,200 L 275,215 L 160,218 Z',
  terrain: [
    'M 60,120 C 100,115 150,118 200,113 C 250,108 300,115 350,120',
    'M 50,155 C 90,148 140,151 200,147 C 260,143 320,148 360,155',
    'M 80,88  C 120,82  165,85  210,80  C 255,75  300,82  340,88',
  ],
  zones: [
    {
      id:    'eidolon-lake',
      path:  'M 130,42 C 140,22 165,15 200,18 C 240,14 272,22 285,42 C 295,58 282,72 260,78 C 235,86 165,82 145,72 C 128,64 122,56 130,42 Z',
      label: 'EIDOLON LAKE',
    },
  ],
  entryPoint: { cx: 200, cy: 210, label: 'CETUS GATE' },
  hotspots: [
    // ── Day cycle ─────────────────────────────────────────
    {
      id: 'iradite-a', label: 'Rock Formations', resource: 'Iradite',
      tip: 'Orange mineral deposits near Grineer-held outcrops.',
      cx: 135, cy: 145, tier: 'secondary', cycles: ['day'],
    },
    {
      id: 'iradite-b', label: 'Central Plains', resource: 'Iradite',
      tip: 'High density cluster mid-map.',
      cx: 205, cy: 132, tier: 'secondary', cycles: ['day'],
    },
    {
      id: 'iradite-c', label: 'East Outcrops', resource: 'Iradite + Grokdrul',
      tip: 'East side formations, Grineer camps nearby.',
      cx: 278, cy: 148, tier: 'secondary', cycles: ['day'],
    },
    {
      id: 'mining-w', label: 'West Hillside', resource: 'Sentirum / Nyth',
      tip: 'Rare gem veins. Use Advanced Nosam Cutter.',
      cx: 158, cy: 100, tier: 'primary', cycles: ['day'],
    },
    {
      id: 'mining-e', label: 'East Hillside', resource: 'Sentirum / Nyth',
      tip: 'Rare gem veins along eastern ridge.',
      cx: 318, cy: 108, tier: 'primary', cycles: ['day'],
    },
    {
      id: 'grineer-w', label: 'Grineer Base West', resource: 'Grokdrul',
      tip: 'Break supply crates, loot Grineer storage.',
      cx: 75, cy: 172, tier: 'secondary', cycles: ['day'],
    },
    {
      id: 'grineer-e', label: 'Grineer Base East', resource: 'Grokdrul',
      tip: 'Eastern fortification — good standing bounties here.',
      cx: 316, cy: 168, tier: 'secondary', cycles: ['day'],
    },
    // ── Night cycle (P0) ─────────────────────────────────
    {
      id: 'wisp-nw',   label: 'Lake Shore NW', resource: 'Cetus Wisp',
      tip: 'Wisps glow and bob above water. No combat needed.',
      cx: 148, cy: 68, tier: 'primary', cycles: ['night'],
    },
    {
      id: 'wisp-ne',   label: 'Lake Shore NE', resource: 'Cetus Wisp',
      tip: 'Dense wisp spawn along the north-east shoreline.',
      cx: 268, cy: 72, tier: 'primary', cycles: ['night'],
    },
    {
      id: 'teralyst',  label: 'Eidolon Lake', resource: 'Brilliant Shard / Arcanes',
      tip: 'Teralyst spawns here at night. Bring Eidolon lures.',
      cx: 205, cy: 50, tier: 'primary', cycles: ['night'],
    },
    {
      id: 'sentient',  label: 'North Plains', resource: 'Intact Sentient Core',
      tip: 'Sentient Battalysts patrol here — easy core farming.',
      cx: 162, cy: 98, tier: 'secondary', cycles: ['night'],
    },
    {
      id: 'sentient-e', label: 'NE Plains', resource: 'Intact Sentient Core',
      tip: 'Secondary Sentient patrol route.',
      cx: 282, cy: 90, tier: 'secondary', cycles: ['night'],
    },
  ],
};

// ─── Deimos — Cambion Drift ───────────────────────────────────────────────────

export const DEIMOS_MAP: RadarMapDef = {
  id: 'cambion',
  boundary: 'M 25,195 C 8,165 5,125 18,85 C 32,45 62,18 105,12 C 148,5 195,10 235,8 C 278,5 325,14 362,35 C 385,55 392,85 388,120 C 384,158 368,188 340,205 C 305,222 255,228 200,225 C 148,222 85,228 25,195 Z',
  terrain: [
    'M 60,85  C 80,70  110,65 130,80 C 150,95  145,115 125,120',
    'M 180,55 C 200,40 230,38 250,55 C 270,72  265,95  245,100',
    'M 290,100 C 310,85 340,82 355,100 C 368,118 360,140 340,145',
    'M 75,145  C 95,135 120,138 140,150 C 160,162 155,178 135,182',
    'M 230,155 C 250,142 278,140 295,155 C 310,168 305,188 285,192',
  ],
  zones: [
    {
      id:    'infested-core',
      path:  'M 140,70 C 155,52 180,45 210,48 C 242,45 268,58 275,80 C 280,100 265,118 240,122 C 210,128 160,122 145,105 C 132,92 128,82 140,70 Z',
      label: 'INFESTED CORE',
    },
  ],
  entryPoint: { cx: 200, cy: 218, label: 'NECRALISK' },
  hotspots: [
    // ── Fass cycle (P0) ──────────────────────────────────
    {
      id: 'vault-a',  label: 'Isolation Vault A', resource: 'Scintillant / Vault Loot',
      tip: 'First vault tier — solo friendly. Bring Necramech.',
      cx: 105, cy: 128, tier: 'primary', cycles: ['fass'],
    },
    {
      id: 'vault-b',  label: 'Isolation Vault B', resource: 'Scintillant / Son Token',
      tip: 'Second vault — Deimos Jugulus spawns inside.',
      cx: 238, cy: 98, tier: 'primary', cycles: ['fass'],
    },
    {
      id: 'vault-c',  label: 'Isolation Vault C', resource: 'Scintillant / Mother Token',
      tip: 'Third vault — highest Scintillant chance.',
      cx: 320, cy: 152, tier: 'primary', cycles: ['fass'],
    },
    {
      id: 'fass-pool-a', label: 'Fass Residue Pool', resource: 'Fass Residue',
      tip: 'Collect residue after Fass worm surfaces — fast standing.',
      cx: 178, cy: 172, tier: 'secondary', cycles: ['fass'],
    },
    {
      id: 'fass-pool-b', label: 'Fass Residue Cluster', resource: 'Fass Residue + Ganglion',
      tip: 'Secondary pool cluster. Ganglion deposits also nearby.',
      cx: 262, cy: 158, tier: 'secondary', cycles: ['fass'],
    },
    {
      id: 'conservation-f', label: 'Avichaea Trap Site', resource: 'Son Token (Rare)',
      tip: 'Use Son Token lure near infested growth clusters.',
      cx: 80, cy: 158, tier: 'secondary', cycles: ['fass'],
    },
    // ── Vome cycle ────────────────────────────────────────
    {
      id: 'vome-pool-a', label: 'Vome Residue Pool', resource: 'Vome Residue',
      tip: 'Glowing blue pools after Vome worm passes.',
      cx: 218, cy: 138, tier: 'primary', cycles: ['vome'],
    },
    {
      id: 'vome-pool-b', label: 'Vome Residue NE', resource: 'Vome Residue',
      tip: 'Secondary Vome pool — north-east area.',
      cx: 308, cy: 115, tier: 'primary', cycles: ['vome'],
    },
    {
      id: 'pustulite-a', label: 'Mining Zone W', resource: 'Pustulite',
      tip: 'Infested mineral veins — dense on the west side.',
      cx: 148, cy: 92, tier: 'secondary', cycles: ['vome'],
    },
    {
      id: 'pustulite-b', label: 'Mining Zone NE', resource: 'Pustulite',
      tip: 'Good secondary pustulite deposits near northern edge.',
      cx: 295, cy: 72, tier: 'secondary', cycles: ['vome'],
    },
    {
      id: 'conservation-v', label: 'Velocipod Site', resource: 'Son Token (Common)',
      tip: 'Velocipods roam near infested mounds — easy token farming.',
      cx: 80, cy: 155, tier: 'secondary', cycles: ['vome'],
    },
  ],
};

// ─── Map registry ─────────────────────────────────────────────────────────────

export const RADAR_MAPS: Partial<Record<CycleId, RadarMapDef>> = {
  cetus:   CETUS_MAP,
  cambion: DEIMOS_MAP,
};

/** Stubs for worlds without a custom map — used to render a "Coming soon" state */
export const HAS_RADAR_MAP = (id: CycleId): boolean => id in RADAR_MAPS;
