// ---------------------------------------------------------------------------
// syntheticItems.ts — codex entries for things WFCD does NOT model as items.
//
// Currencies like Endo / Credits / Kuva appear constantly as drop & bounty
// rewards but have no WFCD uniqueName, so they could never resolve under a
// name-match model (verified by analyze-drop-resolution.ts). We mint stable,
// app-owned uniqueNames under the reserved `/Tennoplan/...` namespace and
// inject them into the codex blob so every surface can deep-link to them like
// any other entry.
//
// These are injected as `source: 'component'` BuiltItems: the enricher already
// treats that source as "no WFCD lookup, read the embedded componentRecord",
// so no enricher changes are needed. Category 'Resource' groups them with
// other materials in the codex.
//
// Adding a new synthetic: append one row here with its match regex(es). The
// regexes are tested against the NORMALIZED name (lowercased, single-spaced)
// AND its quantity-stripped form ("400 Endo" → "endo"), so match the bare
// noun: /^endo$/, not /^\d+ endo$/.
// ---------------------------------------------------------------------------

import type { ItemCategory } from '../types';
import type { BuiltItem } from './builder';

export interface SyntheticItem {
  uniqueName:  string;
  name:        string;
  category:    ItemCategory;
  description: string;
  /** Optional WFCD CDN image filename. Omit → enricher slug-falls-back. */
  imageName?:  string;
  /** Regexes tested against normalized + quantity-stripped drop names. */
  match:       RegExp[];
}

export const SYNTHETIC_ITEMS: SyntheticItem[] = [
  {
    uniqueName:  '/Tennoplan/Currency/Endo',
    name:        'Endo',
    description: 'Endo is the resource used to upgrade Mods and Arcanes. Earned from Ayatan Sculptures, endless missions, sorties, and bounties.',
    category:    'Resource',
    match:       [/^endo$/],
  },
  {
    uniqueName:  '/Tennoplan/Currency/Credits',
    name:        'Credits',
    description: 'Credits are the standard currency, spent on crafting, trading fees, mods, and market purchases. Bounty "Credits Cache" rewards grant a bulk sum.',
    category:    'Resource',
    match:       [/^credits$/, /^credits cache$/],
  },
  {
    uniqueName:  '/Tennoplan/Currency/Kuva',
    name:        'Kuva',
    description: 'Kuva is a Requiem resource used to reroll Rivens and to convert or vanquish Kuva Liches and Sisters of Parvos.',
    category:    'Resource',
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

/** Produce BuiltItem rows for injection into the codex build (post-buildCodex). */
export function syntheticBuiltItems(): BuiltItem[] {
  return SYNTHETIC_ITEMS.map((s) => ({
    uniqueName: s.uniqueName,
    name:       s.name,
    category:   s.category,
    source:     'component' as const,
    drops:      [],
    componentRecord: {
      description: s.description,
      ...(s.imageName ? { imageName: s.imageName } : {}),
    },
  }));
}
