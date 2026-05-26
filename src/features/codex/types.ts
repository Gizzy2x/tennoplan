/**
 * Codex view-model types.
 *
 * The Codex presents TennoplanItem records as detailed "wiki-style" pages.
 * For Phase A there is no new persistence layer — CodexEntry is simply a
 * TennoplanItem viewed through the codex lens. Future phases (B: wiki
 * augmenter, C: curated overlay) will extend TennoplanItem itself rather
 * than introduce a parallel store, so consumers keep using one type.
 *
 * CodexCompositeEntry wraps a multi-part item (a Warframe and its four
 * components, a Weapon and its component blueprints) so the page renderer
 * can show acquisition for every part in one place.
 */

import type { TennoplanItem } from '@/core/domain/tennoplanApi';

export type CodexEntry = TennoplanItem;

export interface CodexCompositeEntry {
  /** The "headline" item — e.g. the assembled Warframe. */
  root:       CodexEntry;
  /** Component parts (blueprints, chassis, etc.). Order is presentation-meaningful. */
  components: CodexEntry[];
}

/**
 * Shared base for every block component. Blocks receive the full entry and
 * decide internally whether they have enough data to render — the shell
 * never gates them, so adding new optional fields to TennoplanItem
 * doesn't require touching the shell.
 *
 * Blocks that need controlled state (e.g. ModStatsBlock's rank slider)
 * extend this with extra props.
 */
export interface BlockProps<E = CodexEntry> {
  entry: E;
}
