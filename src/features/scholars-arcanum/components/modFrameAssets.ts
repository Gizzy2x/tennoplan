import type { ModEntry } from '@/lib/mods/modsAdapter';

// Eager-load frame PNGs via Vite glob — resolved to hashed URLs at build time
const framePngs = import.meta.glob<{ default: string }>([
  '../../../assets/mod-frames/Common-Mod/*.png',
  '../../../assets/mod-frames/Uncommon-Mod/*.png',
  '../../../assets/mod-frames/Rare-Mod/*.png',
  '../../../assets/mod-frames/Legendary-Mod/*.png',
  '../../../assets/mod-frames/Amalgam-Mod/*.png',
  '../../../assets/mod-frames/Galvanized-Mod/*.png',
  '../../../assets/mod-frames/Riven-Mod/*.png',
  '../../../assets/mod-frames/Peculiar-Mod/Peculiar*.png',
  '../../../assets/mod-frames/Archon-mods-full-card/*.png',
  '../../../assets/mod-frames/Universal Assets/*.png',
], { eager: true });

const polaritySvgsRaw = import.meta.glob<string>(
  '../../../assets/mod-frames/type-polarity/*.svg',
  { eager: true, query: '?raw', import: 'default' },
);

function png(folder: string, file: string): string {
  const key = `../../../assets/mod-frames/${folder}/${file}`;
  return (framePngs[key] as { default: string } | undefined)?.default ?? '';
}

function svgRaw(file: string): string {
  const key = `../../../assets/mod-frames/type-polarity/${file}`;
  const raw = (polaritySvgsRaw[key] as string | undefined) ?? '';
  return raw
    .replace(/fill="#[0-9a-fA-F]{3,6}"/gi,   'fill="currentColor"')
    .replace(/stroke="#[0-9a-fA-F]{3,6}"/gi, 'stroke="currentColor"')
    .replace(/fill:#[0-9a-fA-F]{3,6}/gi,     'fill:currentColor')
    .replace(/stroke:#[0-9a-fA-F]{3,6}/gi,   'stroke:currentColor');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModFrameType =
  | 'common' | 'uncommon' | 'rare' | 'legendary'
  | 'amalgam' | 'galvanized' | 'riven' | 'peculiar' | 'archon';

export interface FrameAssetSet {
  background:     string;
  frameTop:       string;
  frameBottom:    string;
  cornerLight:    string;
  sideLight:      string;
  topRightBacker: string;
  lowerTab:       string;
  rankLine:       string;
  rankPip:        string;
}

// ─── Frame asset sets ─────────────────────────────────────────────────────────

const FRAME_SETS: Record<ModFrameType, FrameAssetSet> = {
  common: {
    background:     png('Common-Mod', 'BronzeBackground.png'),
    frameTop:       png('Common-Mod', 'BronzeFrameTop.png'),
    frameBottom:    png('Common-Mod', 'BronzeFrameBottom.png'),
    cornerLight:    png('Common-Mod', 'BronzeCornerLights.png'),
    sideLight:      png('Common-Mod', 'BronzeSideLight.png'),
    topRightBacker: png('Common-Mod', 'BronzeTopRightBacker.png'),
    lowerTab:       png('Common-Mod', 'BronzeLowerTab.png'),
    rankLine:       png('Common-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Common-Mod', 'RankSlotActive.png'),
  },
  uncommon: {
    background:     png('Uncommon-Mod', 'SilverBackground.png'),
    frameTop:       png('Uncommon-Mod', 'SilverFrameTop.png'),
    frameBottom:    png('Uncommon-Mod', 'SilverFrameBottom.png'),
    cornerLight:    png('Uncommon-Mod', 'SilverCornerLights.png'),
    sideLight:      png('Uncommon-Mod', 'SilverSideLight.png'),
    topRightBacker: png('Uncommon-Mod', 'SilverTopRightBacker.png'),
    lowerTab:       png('Uncommon-Mod', 'SilverLowerTab.png'),
    rankLine:       png('Uncommon-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Uncommon-Mod', 'RankSlotActive.png'),
  },
  rare: {
    background:     png('Rare-Mod', 'GoldBackground.png'),
    frameTop:       png('Rare-Mod', 'GoldFrameTop.png'),
    frameBottom:    png('Rare-Mod', 'GoldFrameBottom.png'),
    cornerLight:    png('Rare-Mod', 'GoldCornerLights.png'),
    sideLight:      png('Rare-Mod', 'GoldSideLight.png'),
    topRightBacker: png('Rare-Mod', 'GoldTopRightBacker.png'),
    lowerTab:       png('Rare-Mod', 'GoldLowerTab.png'),
    rankLine:       png('Rare-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Rare-Mod', 'RankSlotActive.png'),
  },
  legendary: {
    background:     png('Legendary-Mod', 'LegendaryBackground.png'),
    frameTop:       png('Legendary-Mod', 'LegendaryFrameTop.png'),
    frameBottom:    png('Legendary-Mod', 'LegendaryFrameBottom.png'),
    cornerLight:    png('Legendary-Mod', 'LegendaryCornerLights.png'),
    sideLight:      png('Legendary-Mod', 'LegendarySideLight.png'),
    topRightBacker: png('Legendary-Mod', 'LegendaryTopRightBacker.png'),
    lowerTab:       png('Legendary-Mod', 'LegendaryLowerTab.png'),
    rankLine:       png('Legendary-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Legendary-Mod', 'RankSlotActive.png'),
  },
  amalgam: {
    background:     png('Amalgam-Mod', 'AmalgamBackground.png'),
    frameTop:       png('Amalgam-Mod', 'AmalgamFrameTop.png'),
    frameBottom:    png('Amalgam-Mod', 'AmalgamFrameBottom.png'),
    cornerLight:    png('Amalgam-Mod', 'LegendaryCornerLights.png'),
    sideLight:      png('Amalgam-Mod', 'LegendarySideLight.png'),
    topRightBacker: png('Amalgam-Mod', 'SilverTopRightBacker.png'),
    lowerTab:       png('Amalgam-Mod', 'SilverLowerTab.png'),
    rankLine:       png('Amalgam-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Amalgam-Mod', 'RankSlotActive.png'),
  },
  galvanized: {
    background:     png('Galvanized-Mod', 'GalvanizedBackground.png'),
    frameTop:       png('Galvanized-Mod', 'GalvanizedFrameTop.png'),
    frameBottom:    png('Galvanized-Mod', 'GalvanizedFrameBottom.png'),
    cornerLight:    png('Galvanized-Mod', 'GalvanizedBottomLight.png'),
    sideLight:      png('Galvanized-Mod', 'GalvanizedSideLight.png'),
    topRightBacker: png('Galvanized-Mod', 'SilverTopRightBacker.png'),
    lowerTab:       png('Galvanized-Mod', 'SilverLowerTab.png'),
    rankLine:       png('Galvanized-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Galvanized-Mod', 'RankSlotActive.png'),
  },
  riven: {
    background:     png('Riven-Mod', 'SilverBackground.png'),
    frameTop:       png('Riven-Mod', 'RivenFrameTop.png'),
    frameBottom:    png('Riven-Mod', 'RivenFrameBottom.png'),
    cornerLight:    png('Riven-Mod', 'RivenCornerLights.png'),
    sideLight:      png('Riven-Mod', 'RivenSideLight.png'),
    topRightBacker: png('Riven-Mod', 'RivenTopRightBacker.png'),
    lowerTab:       png('Riven-Mod', 'RivenLowerTab.png'),
    rankLine:       png('Riven-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Riven-Mod', 'RankSlotActive.png'),
  },
  peculiar: {
    background:     png('Uncommon-Mod', 'SilverBackground.png'),
    frameTop:       png('Peculiar-Mod', 'PeculiarFrameTop.png'),
    frameBottom:    png('Peculiar-Mod', 'PeculiarFrameBottom.png'),
    cornerLight:    png('Peculiar-Mod', 'PeculiarCornerLights.png'),
    sideLight:      png('Peculiar-Mod', 'PeculiarSideSmoke.png'),
    topRightBacker: png('Uncommon-Mod', 'SilverTopRightBacker.png'),
    lowerTab:       png('Uncommon-Mod', 'SilverLowerTab.png'),
    rankLine:       png('Uncommon-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Uncommon-Mod', 'RankSlotActive.png'),
  },
  archon: {
    background:     png('Legendary-Mod', 'LegendaryBackground.png'),
    frameTop:       png('Legendary-Mod', 'LegendaryFrameTop.png'),
    frameBottom:    png('Legendary-Mod', 'LegendaryFrameBottom.png'),
    cornerLight:    png('Legendary-Mod', 'LegendaryCornerLights.png'),
    sideLight:      png('Legendary-Mod', 'LegendarySideLight.png'),
    topRightBacker: png('Legendary-Mod', 'LegendaryTopRightBacker.png'),
    lowerTab:       png('Legendary-Mod', 'LegendaryLowerTab.png'),
    rankLine:       png('Legendary-Mod', 'RankCompleteLine.png'),
    rankPip:        png('Legendary-Mod', 'RankSlotActive.png'),
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function detectModFrameType(
  mod: Pick<ModEntry, 'name' | 'type' | 'rarity'>,
): ModFrameType {
  const name = mod.name.toLowerCase();
  if (name.startsWith('archon ')) return 'archon';
  if (name.startsWith('amalgam ')) return 'amalgam';
  if (name.startsWith('galvanized ')) return 'galvanized';
  if (name.startsWith('peculiar ')) return 'peculiar';
  if (mod.type.includes('Riven')) return 'riven';
  return mod.rarity.toLowerCase() as ModFrameType;
}

export function getFrameAssets(frameType: ModFrameType): FrameAssetSet {
  return FRAME_SETS[frameType];
}

// ─── V2 (consolidated 254×373 canvas assets) ───────────────────────────────────
// New approach: every layer is the full card canvas, stacked with inset:0.
// Pixel-perfect alignment because PNGs were exported at identical dimensions.

function uni(file: string): string {
  // Universal Assets uses a space in the folder name; glob keeps the literal space.
  const key = `../../../assets/mod-frames/Universal Assets/${file}`;
  return (framePngs[key] as { default: string } | undefined)?.default ?? '';
}

export interface FrameAssetSetV2 {
  background:       string;
  fullFrame:        string;
  rankCompleteLine: string;  // shared, only shown when fully ranked
  rankPip:          string;  // shared 12×12 star
}

const V2_SHARED = {
  rankCompleteLine: uni('RankCompleteLine.png'),
  rankPip:          uni('RankSlotActive.png'),
};

const FRAME_SETS_V2: Partial<Record<ModFrameType, FrameAssetSetV2>> = {
  rare: {
    background: png('Rare-Mod', 'Raremod-background.png'),
    fullFrame:  png('Rare-Mod', 'Raremod-full-top-frame.png'),
    ...V2_SHARED,
  },
  legendary: {
    background: png('Legendary-Mod', 'Legendarymod-background.png'),
    fullFrame:  png('Legendary-Mod', 'Legendarymod-full-top-frame.png'),
    ...V2_SHARED,
  },
};

export function getFrameAssetsV2(frameType: ModFrameType): FrameAssetSetV2 | null {
  return FRAME_SETS_V2[frameType] ?? null;
}

const ARCHON_FULL_CARDS: Record<string, string> = {
  'archon continuity': png('Archon-mods-full-card', 'ArchonContinuityMod.png'),
  'archon flow':       png('Archon-mods-full-card', 'ArchonFlowMod.png'),
  'archon intensify':  png('Archon-mods-full-card', 'ArchonIntensifyMod.png'),
  'archon stretch':    png('Archon-mods-full-card', 'ArchonStretchMod.png'),
  'archon vitality':   png('Archon-mods-full-card', 'ArchonVitalityMod.png'),
};

export function getArchonFullCard(modName: string): string | null {
  return ARCHON_FULL_CARDS[modName.toLowerCase()] ?? null;
}

const POLARITY_ICONS: Record<string, string> = {
  madurai: svgRaw('Madurai.svg'),
  naramon: svgRaw('Naramon.svg'),
  vazarin: svgRaw('Vazarin.svg'),
  zenurik: svgRaw('Zenurik.svg'),
  umbra:   svgRaw('Umbra.svg'),
};

export function getPolarityIcon(polarity: string): string | null {
  return POLARITY_ICONS[polarity] ?? null;
}

export const POLARITY_LABEL: Record<string, string> = {
  madurai:   'V',
  vazarin:   'D',
  naramon:   '—',
  zenurik:   'Z',
  unairu:    'U',
  penjaga:   'P',
  umbra:     'Ω',
  aura:      '⬡',
  universal: '◈',
};

export const FRAME_GLOW: Record<ModFrameType, string> = {
  common:     'rgba(130, 125, 115, 0.45)',
  uncommon:   'rgba(100, 160, 220, 0.45)',
  rare:       'rgba(210, 175, 80, 0.55)',
  legendary:  'rgba(230, 215, 170, 0.55)',
  amalgam:    'rgba(180, 50, 50, 0.45)',
  galvanized: 'rgba(60, 120, 180, 0.45)',
  riven:      'rgba(150, 80, 200, 0.55)',
  peculiar:   'rgba(100, 180, 160, 0.45)',
  archon:     'rgba(220, 140, 40, 0.55)',
};
