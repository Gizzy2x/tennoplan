/**
 * Synthetic codex items — entries for things WFCD does NOT model as items.
 *
 * Currencies like Endo / Credits / Kuva appear constantly as drop & bounty
 * rewards but have no WFCD uniqueName, so they can never resolve by name match.
 * We mint stable, app-owned uniqueNames under the reserved `/Tennoplan/*`
 * namespace and add them to the codex (db.tennoplanItems) on the frontend after
 * each codex sync — so they exist as real, clickable entries with local icons
 * WITHOUT needing the CI codex republished.
 *
 * SINGLE SOURCE for the frontend: the dropResolver reads `match` from here to
 * map reward labels → these uniqueNames, and StaticDataService reads the rest to
 * build the db rows. Icons are mapped separately in src/lib/icons/syntheticIcons
 * (asset imports must stay out of this pure module so the resolver — and the CI
 * probe that mirrors it — can import it without a bundler).
 *
 * Adding one: append a row with its bare-noun match regex(es). The resolver
 * tests them against the normalized AND quantity-stripped name, so match "endo",
 * not "400 endo".
 */

import type { ItemCategory } from '@/core/domain/tennoplanApi';

export interface SyntheticItemDef {
  uniqueName:  string;
  name:        string;
  category:    ItemCategory;
  description: string;
  /** Regexes tested against normalized + quantity-stripped drop names. */
  match:       RegExp[];
}

export const SYNTHETIC_ITEMS: readonly SyntheticItemDef[] = [
  {
    uniqueName:  '/Tennoplan/Currency/Endo',
    name:        'Endo',
    category:    'Resource',
    description: 'Endo is the resource used to upgrade Mods and Arcanes. Earned from Ayatan Sculptures, endless missions, sorties, and bounties.',
    match:       [/^endo$/],
  },
  {
    uniqueName:  '/Tennoplan/Currency/Credits',
    name:        'Credits',
    category:    'Resource',
    description: 'Credits are the standard currency, spent on crafting, trading fees, mods, and market purchases. Bounty "Credits Cache" rewards grant a bulk sum.',
    match:       [/^credits$/, /^credits cache$/],
  },
  {
    uniqueName:  '/Tennoplan/Currency/Kuva',
    name:        'Kuva',
    category:    'Resource',
    description: 'Kuva is a Requiem resource used to reroll Rivens and to convert or vanquish Kuva Liches and Sisters of Parvos.',
    match:       [/^kuva$/],
  },
  {
    uniqueName:  '/Tennoplan/Resource/EncryptedJournalFragment',
    name:        'Encrypted Journal Fragment',
    description: 'An Entrati journal fragment awarded by Cambion Drift (Deimos) bounties. Turned in to the Necraloid / Entrati for standing.',
    category:    'Resource',
    match:       [/^encrypted journal fragment$/],
  },
];
