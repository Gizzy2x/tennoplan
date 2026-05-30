/**
 * CodexSummaryRail — dispatches a per-category summary component for the
 * codex entry page's sticky right rail.
 *
 * Categories without a registered summary return null, and the shell
 * collapses to single-column. That keeps the rollout incremental:
 * Warframe lands first, Weapon/Companion/Sentinel/Relic follow.
 *
 * The summary card is its own primitive — it deliberately overlaps with
 * the left column's HeaderBlock title (different sizes, different roles).
 * The left header anchors the page; the rail's name labels the card.
 */

import type { ComponentType } from 'react';
import type { ItemCategory } from '@/core/domain/tennoplanApi';
import type { CodexEntry } from '../types';
import { WarframeSummaryCard } from './WarframeSummaryCard';
import { WeaponSummaryCard } from './WeaponSummaryCard';

type SummaryComponent = ComponentType<{ entry: CodexEntry }>;

/**
 * Registry of category → summary component. Add a row here when a new
 * category gets a summary primitive; the shell discovers it automatically
 * via `hasSummaryFor`.
 */
const SUMMARY_BY_CATEGORY: Partial<Record<ItemCategory, SummaryComponent>> = {
  Warframe: WarframeSummaryCard,
  Weapon:   WeaponSummaryCard,
};

/** True when this entry's category has a summary primitive wired. */
export function hasSummaryFor(category: ItemCategory): boolean {
  return SUMMARY_BY_CATEGORY[category] !== undefined;
}

interface CodexSummaryRailProps {
  entry: CodexEntry;
}

export function CodexSummaryRail({ entry }: CodexSummaryRailProps) {
  const Summary = SUMMARY_BY_CATEGORY[entry.category];
  if (!Summary) return null;
  return <Summary entry={entry} />;
}
