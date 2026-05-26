/* V3 mod-card asset registry — multi-piece layered architecture.
 *
 * Every tier entry declares:
 *   - Asset paths  : PNG pieces used to build the card visually
 *   - Layout flags : which UI zones are visible (drain, polarity, rank pips…)
 *
 * This means new card types that suppress certain elements (no drain,
 * no rank pips, etc.) only need a registry entry — ModCardV3 reads the
 * flags and renders (or skips) each zone automatically.
 *
 * Cross-tier borrowing is explicit in code — no physical file copies.
 * Shared universal pieces (rank pips, rank line) reference a single
 * canonical source rather than being duplicated per folder.
 *
 * ── Tier map ──────────────────────────────────────────────────────────────
 *  Standard rarity : Bronze · Silver · Gold · Legendary · Omega (Riven)
 *  Specialty       : Amalgam · Galvanized · Peculiar · Archon
 *  Railjack        : PlexusCommon · PlexusUncommon · PlexusRare
 *  Antique         : AntiqueCommon · AntiqueUncommon · AntiqueRare
 *  Tome            : TomeCommon · TomeUncommon · TomeRare           [art pending]
 *  Antivirus       : Antivirus                                      [art pending]
 *  Potency         : Potency                                        [art pending]
 *  Tektolyst       : Tektolyst                                      [art pending]
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { ModEntry } from '@/lib/mods/codexModsAdapter';

// ─── Asset loaders ────────────────────────────────────────────────────────────

const v3Pngs = import.meta.glob<{ default: string }>([
  '../../../assets/mod-frames/Bronze/*.png',
  '../../../assets/mod-frames/Silver/*.png',
  '../../../assets/mod-frames/Gold/*.png',
  '../../../assets/mod-frames/Legendary/*.png',
  '../../../assets/mod-frames/Omega/*.png',
  '../../../assets/mod-frames/Amalgam/*.png',
  '../../../assets/mod-frames/Galvanized/*.png',
  '../../../assets/mod-frames/Peculiar/*.png',
  '../../../assets/mod-frames/Archon/*.png',
  '../../../assets/mod-frames/Plexus Common/*.png',
  '../../../assets/mod-frames/Plexus Uncommon/*.png',
  '../../../assets/mod-frames/Plexus Rare/*.png',
], { eager: true });

function png(folder: string, file: string): string {
  const key = `../../../assets/mod-frames/${folder}/${file}`;
  return (v3Pngs[key] as { default: string } | undefined)?.default ?? '';
}

// ─── Polarity SVGs ────────────────────────────────────────────────────────────
// Loaded as raw strings so hardcoded colours can be stripped and replaced with
// fill="currentColor", letting CSS --tier-text-color drive the icon tint.

const polaritySvgsRaw = import.meta.glob<string>(
  '../../../assets/mod-frames/Polarity Types/*.svg',
  { eager: true, query: '?raw', import: 'default' },
);

function svgRaw(file: string): string {
  const key = `../../../assets/mod-frames/Polarity Types/${file}`;
  const raw = (polaritySvgsRaw[key] as string | undefined) ?? '';
  return raw
    .replace(/fill="#[0-9a-fA-F]{3,6}"/gi,   'fill="currentColor"')
    .replace(/stroke="#[0-9a-fA-F]{3,6}"/gi, 'stroke="currentColor"')
    .replace(/fill:#[0-9a-fA-F]{3,6}/gi,     'fill:currentColor')
    .replace(/stroke:#[0-9a-fA-F]{3,6}/gi,   'stroke:currentColor')
    .replace(/<svg\b(?![^>]*\bfill=)([^>]*)>/i, '<svg fill="currentColor"$1>');
}

const POLARITY_ICONS: Record<string, string> = {
  madurai: svgRaw('Madurai.svg'),
  naramon: svgRaw('Naramon.svg'),
  vazarin: svgRaw('Vazarin.svg'),
  zenurik: svgRaw('Zenurik.svg'),
  umbra:   svgRaw('Umbra.svg'),
  penjaga: svgRaw('Penjaga.svg'),
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type V3Tier =
  // Standard rarity
  | 'Bronze' | 'Silver' | 'Gold' | 'Legendary' | 'Omega'
  // Specialty
  | 'Amalgam' | 'Galvanized' | 'Peculiar' | 'Archon'
  // Railjack
  | 'PlexusCommon' | 'PlexusUncommon' | 'PlexusRare'
  // Antique (art pending)
  | 'AntiqueCommon' | 'AntiqueUncommon' | 'AntiqueRare'
  // Tome (art pending)
  | 'TomeCommon' | 'TomeUncommon' | 'TomeRare'
  // Single-variant types (art pending)
  | 'Antivirus' | 'Potency' | 'Tektolyst';

export interface FrameAssetSetV3 {
  // ── Piece assets ───────────────────────────────────────────────────────────
  background:             string;
  frameTop:               string;
  frameBottom:            string;
  sideLight:              string;
  cornerLights:           string | null;  // null = no corner lights (e.g. Archon)
  topRightBacker:         string;         // 45×26 native — 1-digit drains
  topRightBackerExtended: string;         // 58×26 native — 2-digit drains (extends left)
  lowerTab:               string;
  rankCompleteLine:       string;
  rankSlotActive:         string;

  // ── Layout flags ───────────────────────────────────────────────────────────
  // Each flag controls whether that UI zone renders at all.
  // false = zone is completely absent (no space reserved, no empty gap).
  // Tune these per tier to match the card's in-game design.
  showDrain:     boolean;  // top-right backer plate + capacity cost number
  showPolarity:  boolean;  // polarity icon/symbol inside the backer (needs showDrain)
  showSideLight: boolean;  // left/right edge accent lights
  showRankPips:  boolean;  // rank pip row at bottom of card
  showRankLine:  boolean;  // "maxed" rank-complete indicator line
  showLowerTab:  boolean;  // compat name tab at card bottom
}

// ─── Layout presets ───────────────────────────────────────────────────────────
// Spread into tier entries to set defaults, then override individual flags.

/** Every zone visible — the standard Warframe mod card layout. */
const FULL_LAYOUT = {
  showDrain:     true,
  showPolarity:  true,
  showSideLight: true,
  showRankPips:  true,
  showRankLine:  true,
  showLowerTab:  true,
} as const;

// ─── Shared pieces (canonical source — no file copies) ────────────────────────

const SHARED_RANK_LINE = png('Bronze', 'RankCompleteLine.png');
const SHARED_RANK_PIP  = png('Bronze', 'RankSlotActive.png');

// ─── Frame asset sets ─────────────────────────────────────────────────────────

const FRAME_SETS_V3: Record<V3Tier, FrameAssetSetV3> = {

  // ── Standard rarity tiers ──────────────────────────────────────────────────

  Bronze: {
    ...FULL_LAYOUT,
    background:             png('Bronze', 'BronzeBackground.png'),
    frameTop:               png('Bronze', 'BronzeFrameTop.png'),
    frameBottom:            png('Bronze', 'BronzeFrameBottom.png'),
    sideLight:              png('Bronze', 'BronzeSideLight.png'),
    cornerLights:           png('Bronze', 'BronzeCornerLights.png'),
    topRightBacker:         png('Bronze', 'BronzeTopRightBacker.png'),
    topRightBackerExtended: png('Bronze', 'BronzeTopRightBackerExtended.png'),
    lowerTab:               png('Bronze', 'BronzeLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  Silver: {
    ...FULL_LAYOUT,
    background:             png('Silver', 'SilverBackground.png'),
    frameTop:               png('Silver', 'SilverFrameTop.png'),
    frameBottom:            png('Silver', 'SilverFrameBottom.png'),
    sideLight:              png('Silver', 'SilverSideLight.png'),
    cornerLights:           png('Silver', 'SilverCornerLights.png'),
    topRightBacker:         png('Silver', 'SilverTopRightBacker.png'),
    topRightBackerExtended: png('Silver', 'SilverTopRightBackerExtended.png'),
    lowerTab:               png('Silver', 'SilverLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  Gold: {
    ...FULL_LAYOUT,
    background:             png('Gold', 'GoldBackground.png'),
    frameTop:               png('Gold', 'GoldFrameTop.png'),
    frameBottom:            png('Gold', 'GoldFrameBottom.png'),
    sideLight:              png('Gold', 'GoldSideLight.png'),
    cornerLights:           png('Gold', 'GoldCornerLights.png'),
    topRightBacker:         png('Gold', 'GoldTopRightBacker.png'),
    topRightBackerExtended: png('Gold', 'GoldTopRightBackerExtended.png'),
    lowerTab:               png('Gold', 'GoldLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  Legendary: {
    ...FULL_LAYOUT,
    background:             png('Legendary', 'LegendaryBackground.png'),
    frameTop:               png('Legendary', 'LegendaryFrameTop.png'),
    frameBottom:            png('Legendary', 'LegendaryFrameBottom.png'),
    sideLight:              png('Legendary', 'LegendarySideLight.png'),
    cornerLights:           png('Legendary', 'LegendaryCornerLights.png'),
    topRightBacker:         png('Legendary', 'LegendaryTopRightBacker.png'),
    topRightBackerExtended: png('Legendary', 'LegendaryTopRightBackerExtended.png'),
    lowerTab:               png('Legendary', 'LegendaryLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  // ── Specialty tiers ────────────────────────────────────────────────────────

  Omega: {
    ...FULL_LAYOUT,
    background:             png('Omega', 'SilverBackground.png'),
    frameTop:               png('Omega', 'RivenFrameTop.png'),
    frameBottom:            png('Omega', 'RivenFrameBottom.png'),
    sideLight:              png('Omega', 'RivenSideLight.png'),
    cornerLights:           png('Omega', 'RivenCornerLights.png'),
    topRightBacker:         png('Omega', 'RivenTopRightBacker.png'),
    topRightBackerExtended: png('Omega', 'RivenTopRightBacker.png'),  // no extended art yet
    lowerTab:               png('Omega', 'RivenLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  Amalgam: {
    ...FULL_LAYOUT,
    background:             png('Amalgam', 'AmalgamBackground.png'),
    frameTop:               png('Amalgam', 'AmalgamFrameTop.png'),
    frameBottom:            png('Amalgam', 'AmalgamFrameBottom.png'),
    sideLight:              png('Silver', 'SilverSideLight.png'),
    cornerLights:           png('Silver', 'SilverCornerLights.png'),
    topRightBacker:         png('Silver', 'SilverTopRightBacker.png'),
    topRightBackerExtended: png('Silver', 'SilverTopRightBackerExtended.png'),
    lowerTab:               png('Silver', 'SilverLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  Galvanized: {
    ...FULL_LAYOUT,
    background:             png('Galvanized', 'GalvanizedBackground.png'),
    frameTop:               png('Galvanized', 'GalvanizedFrameTop.png'),
    frameBottom:            png('Galvanized', 'GalvanizedFrameBottom.png'),
    sideLight:              png('Galvanized', 'GalvanizedSideLight.png'),
    cornerLights:           png('Galvanized', 'GalvanizedBottomLight.png'),
    topRightBacker:         png('Silver', 'SilverTopRightBacker.png'),
    topRightBackerExtended: png('Silver', 'SilverTopRightBackerExtended.png'),
    lowerTab:               png('Silver', 'SilverLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  Peculiar: {
    ...FULL_LAYOUT,
    background:             png('Legendary', 'LegendaryBackground.png'),
    frameTop:               png('Peculiar', 'PeculiarFrameTop.png'),
    frameBottom:            png('Peculiar', 'PeculiarFrameBottom.png'),
    sideLight:              png('Peculiar', 'PeculiarSideSmoke.png'),
    cornerLights:           png('Peculiar', 'PeculiarCornerLights.png'),
    topRightBacker:         png('Legendary', 'LegendaryTopRightBacker.png'),
    topRightBackerExtended: png('Legendary', 'LegendaryTopRightBackerExtended.png'),
    lowerTab:               png('Legendary', 'LegendaryLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  Archon: {
    ...FULL_LAYOUT,
    background:             png('Bronze', 'BronzeBackground.png'),
    frameTop:               png('Archon', 'ArchonFrameTop.png'),
    frameBottom:            png('Archon', 'ArchonFrameBottom.png'),
    sideLight:              png('Archon', 'ArchonSideLight.png'),
    cornerLights:           null,
    topRightBacker:         png('Gold', 'GoldTopRightBacker.png'),
    topRightBackerExtended: png('Gold', 'GoldTopRightBackerExtended.png'),
    lowerTab:               png('Gold', 'GoldLowerTab.png'),
    rankCompleteLine:       png('Archon', 'ArchonRankCompleteLine.png'),
    rankSlotActive:         SHARED_RANK_PIP,
  },

  // ── Plexus (Railjack avionic) tiers ───────────────────────────────────────

  PlexusCommon: {
    ...FULL_LAYOUT,
    background:             png('Bronze', 'BronzeBackground.png'),
    frameTop:               png('Plexus Common', 'AvionicModsFrameTopBronze.png'),
    frameBottom:            png('Plexus Common', 'AvionicModsFrameBottomBronze.png'),
    sideLight:              png('Bronze', 'BronzeSideLight.png'),
    cornerLights:           png('Galvanized', 'GalvanizedBottomLight.png'),
    topRightBacker:         png('Bronze', 'BronzeTopRightBacker.png'),
    topRightBackerExtended: png('Bronze', 'BronzeTopRightBackerExtended.png'),
    lowerTab:               png('Bronze', 'BronzeLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  PlexusUncommon: {
    ...FULL_LAYOUT,
    background:             png('Silver', 'SilverBackground.png'),
    frameTop:               png('Plexus Uncommon', 'AvionicModsFrameTopSilver.png'),
    frameBottom:            png('Plexus Uncommon', 'AvionicModsFrameBottomSilver.png'),
    sideLight:              png('Silver', 'SilverSideLight.png'),
    cornerLights:           png('Galvanized', 'GalvanizedBottomLight.png'),
    topRightBacker:         png('Silver', 'SilverTopRightBacker.png'),
    topRightBackerExtended: png('Silver', 'SilverTopRightBackerExtended.png'),
    lowerTab:               png('Silver', 'SilverLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  PlexusRare: {
    ...FULL_LAYOUT,
    background:             png('Gold', 'GoldBackground.png'),
    frameTop:               png('Plexus Rare', 'AvionicModsFrameTopGold.png'),
    frameBottom:            png('Plexus Rare', 'AvionicModsFrameBottomGold.png'),
    sideLight:              png('Gold', 'GoldSideLight.png'),
    cornerLights:           png('Galvanized', 'GalvanizedBottomLight.png'),
    topRightBacker:         png('Gold', 'GoldTopRightBacker.png'),
    topRightBackerExtended: png('Gold', 'GoldTopRightBackerExtended.png'),
    lowerTab:               png('Gold', 'GoldLowerTab.png'),
    rankCompleteLine:       SHARED_RANK_LINE,
    rankSlotActive:         SHARED_RANK_PIP,
  },

  // ── Antique (art pending) ──────────────────────────────────────────────────
  // Three rarity sub-tiers. Each has its own unique rank complete line art.
  // Stars (rankSlotActive) are shared with standard tiers.
  // Flags: FULL_LAYOUT assumed — adjust showDrain/showRankPips etc. once
  // the card design is finalised.

  AntiqueCommon: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',  // unique antique art — not the shared line
    rankSlotActive:         SHARED_RANK_PIP,
  },

  AntiqueUncommon: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },

  AntiqueRare: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },

  // ── Tome (art pending) ─────────────────────────────────────────────────────
  // Grimoire / tome weapon mods. Three rarity sub-tiers.
  // Flags: FULL_LAYOUT assumed — adjust once card design is finalised.

  TomeCommon: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },

  TomeUncommon: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },

  TomeRare: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },

  // ── Antivirus (art pending) ────────────────────────────────────────────────
  // Single-variant type. Layout flags TBD — set showDrain: false if this type
  // has no capacity cost, adjust others as card design becomes clear.

  Antivirus: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },

  // ── Potency (art pending) ──────────────────────────────────────────────────

  Potency: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },

  // ── Tektolyst (art pending) ────────────────────────────────────────────────

  Tektolyst: {
    ...FULL_LAYOUT,
    background:             '',
    frameTop:               '',
    frameBottom:            '',
    sideLight:              '',
    cornerLights:           null,
    topRightBacker:         '',
    topRightBackerExtended: '',
    lowerTab:               '',
    rankCompleteLine:       '',
    rankSlotActive:         SHARED_RANK_PIP,
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function detectTierV3(mod: Pick<ModEntry, 'name' | 'type' | 'rarity'>): V3Tier {
  const name = mod.name.toLowerCase();

  // Specialty prefix checks — override rarity
  if (name.startsWith('archon '))     return 'Archon';
  if (name.startsWith('amalgam '))    return 'Amalgam';
  if (name.startsWith('galvanized ')) return 'Galvanized';
  if (name.startsWith('peculiar '))   return 'Peculiar';

  // Plexus / Railjack avionic mods
  if (mod.type.includes('Plexus') || mod.type.includes('Avionic')) {
    const r = mod.rarity?.toLowerCase();
    if (r === 'rare')     return 'PlexusRare';
    if (r === 'uncommon') return 'PlexusUncommon';
    return 'PlexusCommon';
  }

  // Riven mods
  if (mod.type.includes('Riven')) return 'Omega';

  // New type checks — update detection predicates once mod data schema is defined
  if (mod.type === 'Antique') {
    const r = mod.rarity?.toLowerCase();
    if (r === 'rare')     return 'AntiqueRare';
    if (r === 'uncommon') return 'AntiqueUncommon';
    return 'AntiqueCommon';
  }
  if (mod.type === 'Tome') {
    const r = mod.rarity?.toLowerCase();
    if (r === 'rare')     return 'TomeRare';
    if (r === 'uncommon') return 'TomeUncommon';
    return 'TomeCommon';
  }
  if (mod.type === 'Antivirus')  return 'Antivirus';
  if (mod.type === 'Potency')    return 'Potency';
  if (mod.type === 'Tektolyst')  return 'Tektolyst';

  // Standard rarity fallback
  const r = mod.rarity?.toLowerCase();
  if (r === 'rare')      return 'Gold';
  if (r === 'uncommon')  return 'Silver';
  if (r === 'legendary') return 'Legendary';
  return 'Bronze';
}

export function getFrameAssetsV3(tier: V3Tier): FrameAssetSetV3 {
  return FRAME_SETS_V3[tier];
}

// ─── Tier colours ─────────────────────────────────────────────────────────────

export const TIER_TEXT_COLOR: Record<V3Tier, string> = {
  // Standard
  Bronze:          '#CA9A87',
  Silver:          '#ffffff',
  Gold:            '#FAE7BE',
  Legendary:       '#ffffff',
  Omega:           '#AC83D5',
  // Specialty
  Amalgam:         '#f0a8a8',
  Galvanized:      '#a8d0f0',
  Peculiar:        '#a8e0d4',
  Archon:          '#f5d08a',
  // Plexus
  PlexusCommon:    '#CA9A87',
  PlexusUncommon:  '#ffffff',
  PlexusRare:      '#FAE7BE',
  // Antique — warm aged palette
  AntiqueCommon:   '#A87850',
  AntiqueUncommon: '#90A0B0',
  AntiqueRare:     '#C8A030',
  // Tome — placeholder, tune once art is finalised
  TomeCommon:      '#C0A080',
  TomeUncommon:    '#A0B8C0',
  TomeRare:        '#D4B060',
  // Single-variant types — placeholder colours
  Antivirus:       '#80C8A0',
  Potency:         '#C080C0',
  Tektolyst:       '#80B0D0',
};

export const TIER_GLOW: Record<V3Tier, string> = {
  Bronze:          'rgba(130, 125, 115, 0.45)',
  Silver:          'rgba(100, 160, 220, 0.45)',
  Gold:            'rgba(210, 175,  80, 0.55)',
  Legendary:       'rgba(230, 215, 170, 0.55)',
  Omega:           'rgba(150,  80, 200, 0.55)',
  Amalgam:         'rgba(180,  50,  50, 0.45)',
  Galvanized:      'rgba( 60, 120, 180, 0.45)',
  Peculiar:        'rgba(100, 180, 160, 0.45)',
  Archon:          'rgba(220, 140,  40, 0.55)',
  PlexusCommon:    'rgba(130, 125, 115, 0.45)',
  PlexusUncommon:  'rgba(100, 160, 220, 0.45)',
  PlexusRare:      'rgba(210, 175,  80, 0.55)',
  AntiqueCommon:   'rgba(130,  90,  50, 0.45)',
  AntiqueUncommon: 'rgba(110, 140, 160, 0.45)',
  AntiqueRare:     'rgba(180, 150,  40, 0.50)',
  TomeCommon:      'rgba(140, 110,  70, 0.45)',
  TomeUncommon:    'rgba( 90, 140, 160, 0.45)',
  TomeRare:        'rgba(190, 155,  60, 0.50)',
  Antivirus:       'rgba( 60, 180, 120, 0.45)',
  Potency:         'rgba(160,  60, 180, 0.45)',
  Tektolyst:       'rgba( 60, 140, 200, 0.45)',
};
