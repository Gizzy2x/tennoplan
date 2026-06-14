/**
 * Per-category block opt-ins for the Codex entry shell.
 *
 * The shell ([CodexEntryPage.tsx]) iterates the list for the entry's
 * category and dispatches each key to a block component. Blocks that
 * lack data render nothing, so the same list can be conservative —
 * "include this when present" is the rule, not "only include when sure".
 *
 * Order matters: the array is the render order top-to-bottom.
 */

import type { ItemCategory } from '@/core/domain/tennoplanApi';

export type BlockKey =
  // ── Universal ──
  | 'Header'
  | 'HeroIcon'
  | 'Description'
  | 'CephalonNotes'
  | 'Characteristics'
  | 'Drops'
  | 'BestFarms'
  | 'Build'
  | 'PatchHistory'
  | 'Related'
  | 'WikiFooter'
  // ── Category-specific ──
  | 'StatsWarframe'
  | 'StatsWeapon'
  | 'StatsCompanion'
  | 'Polarities'
  | 'Abilities'
  | 'Passive'
  | 'GeneralInformation'
  | 'BuildCost'
  | 'Components'
  | 'ModCard'
  | 'ModStats'
  | 'ArcaneStats'
  | 'AugmentContext'
  | 'PlanetaryOrigins'
  | 'Consumers'
  | 'RelicRewards'
  | 'DucatValue';

/**
 * Fallback used when a category has no explicit set. Picks the safe
 * universal subset so unknown categories still render meaningfully.
 */
export const UNIVERSAL_BLOCKS: BlockKey[] = [
  'Header', 'HeroIcon', 'Description', 'CephalonNotes', 'Drops', 'BestFarms',
  'Related', 'WikiFooter',
];

export const BLOCK_SETS: Partial<Record<ItemCategory, BlockKey[]>> = {
  // HeroIcon + StatsWarframe move into the sticky right-rail
  // WarframeSummaryCard, so they're intentionally absent here.
  // Polarities stays left — it's build-context, not at-a-glance summary.
  // Related sits just before WikiFooter so the page peaks on
  // discovery (see RelatedEntriesBlock for the resolution rules).
  Warframe: [
    'Header', 'Polarities', 'GeneralInformation', 'Characteristics', 'Description', 'CephalonNotes',
    'Passive', 'Abilities', 'BuildCost', 'Components', 'BestFarms', 'PatchHistory',
    'Related', 'WikiFooter',
  ],
  // HeroIcon + StatsWeapon are owned by the right-rail WeaponSummaryCard.
  // Polarities stays left — it's build-context, not at-a-glance summary.
  Weapon: [
    'Header', 'Polarities', 'Characteristics', 'Description', 'CephalonNotes',
    'BuildCost', 'Components', 'BestFarms', 'PatchHistory', 'Related', 'WikiFooter',
  ],
  // HeroIcon + StatsCompanion live in the right-rail CompanionSummaryCard,
  // which is shared with Sentinel below. Polarities stays left as build context.
  Companion: [
    'Header', 'Polarities', 'Characteristics', 'Description', 'CephalonNotes',
    'BuildCost', 'Components', 'BestFarms', 'Related', 'WikiFooter',
  ],
  // Same rail as Companion; the left column keeps the prose blocks
  // (Passive + Abilities carry the descriptions the rail tiles only
  // gesture at).
  Sentinel: [
    'Header', 'Polarities', 'Characteristics', 'Description', 'CephalonNotes',
    'Passive', 'Abilities', 'BuildCost', 'Components', 'BestFarms', 'Related', 'WikiFooter',
  ],
  // ModCard renders the signature card + rank-synced stat ladder + meta in one
  // block (the old ModDetailModal body, now a page section).
  Mod: [
    'Header', 'ModCard', 'AugmentContext', 'Description', 'CephalonNotes', 'Drops',
    'BestFarms', 'PatchHistory', 'Related', 'WikiFooter',
  ],
  Relic: [
    'Header', 'RelicRewards', 'Drops', 'BestFarms', 'WikiFooter',
  ],
  Arcane: [
    'Header', 'HeroIcon', 'ArcaneStats', 'Description', 'CephalonNotes', 'Drops',
    'BestFarms', 'Related', 'WikiFooter',
  ],
  Blueprint: [
    'Header', 'HeroIcon', 'Description', 'CephalonNotes', 'BuildCost', 'Build', 'Drops',
    'BestFarms', 'Related', 'WikiFooter',
  ],
  // Resources lead with the cinematic Planetary Origins hero (planet
  // art + resource orb), then description, then the "Used in" reverse-
  // join so the page answers both "where do I get it" and "what does
  // it craft" in the first viewport. Drops + BestFarms keep the full
  // node-level detail below for power users.
  Resource: [
    'Header', 'PlanetaryOrigins', 'Description', 'CephalonNotes', 'Consumers',
    'BestFarms', 'Drops', 'Related', 'WikiFooter',
  ],
};

export function blocksFor(category: ItemCategory): BlockKey[] {
  return BLOCK_SETS[category] ?? UNIVERSAL_BLOCKS;
}
