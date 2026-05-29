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
  | 'Drops'
  | 'BestFarms'
  | 'Build'
  | 'PatchHistory'
  | 'WikiFooter'
  // ── Category-specific ──
  | 'StatsWarframe'
  | 'StatsWeapon'
  | 'StatsCompanion'
  | 'Polarities'
  | 'Abilities'
  | 'Passive'
  | 'Components'
  | 'ModStats'
  | 'RelicRewards'
  | 'DucatValue';

/**
 * Fallback used when a category has no explicit set. Picks the safe
 * universal subset so unknown categories still render meaningfully.
 */
export const UNIVERSAL_BLOCKS: BlockKey[] = [
  'Header', 'HeroIcon', 'Description', 'Drops', 'BestFarms', 'WikiFooter',
];

export const BLOCK_SETS: Partial<Record<ItemCategory, BlockKey[]>> = {
  // HeroIcon + StatsWarframe move into the sticky right-rail
  // WarframeSummaryCard, so they're intentionally absent here.
  // Polarities stays left — it's build-context, not at-a-glance summary.
  Warframe: [
    'Header', 'Polarities', 'Description',
    'Passive', 'Abilities', 'Components', 'BestFarms', 'PatchHistory', 'WikiFooter',
  ],
  Weapon: [
    'Header', 'HeroIcon', 'StatsWeapon', 'Polarities', 'Description',
    'Components', 'BestFarms', 'PatchHistory', 'WikiFooter',
  ],
  Companion: [
    'Header', 'HeroIcon', 'StatsCompanion', 'Polarities', 'Description',
    'Components', 'BestFarms', 'WikiFooter',
  ],
  Sentinel: [
    'Header', 'HeroIcon', 'StatsCompanion', 'Polarities', 'Description',
    'Passive', 'Abilities', 'Components', 'BestFarms', 'WikiFooter',
  ],
  Mod: [
    'Header', 'HeroIcon', 'ModStats', 'Description', 'Drops',
    'BestFarms', 'PatchHistory', 'WikiFooter',
  ],
  Relic: [
    'Header', 'RelicRewards', 'Drops', 'BestFarms', 'WikiFooter',
  ],
  Arcane: [
    'Header', 'HeroIcon', 'Description', 'Drops', 'BestFarms', 'WikiFooter',
  ],
  Blueprint: [
    'Header', 'HeroIcon', 'Description', 'Build', 'Drops', 'BestFarms', 'WikiFooter',
  ],
};

export function blocksFor(category: ItemCategory): BlockKey[] {
  return BLOCK_SETS[category] ?? UNIVERSAL_BLOCKS;
}
