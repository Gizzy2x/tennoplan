/**
 * Local icon assets for synthetic codex entries (currencies WFCD doesn't ship).
 * Kept separate from src/core/domain/syntheticItems so that module stays pure
 * (asset imports would break the CI probe / non-bundler importers).
 *
 * Sourced from the in-repo wiki icon set under src/assets/tennoicons/currency.
 * Items without a bundled icon simply fall through to the lotus placeholder.
 */

import endoIcon    from '@/assets/tennoicons/currency/64px-Endo.png';
import creditsIcon from '@/assets/tennoicons/currency/64px-Credits.png';
import kuvaIcon    from '@/assets/tennoicons/currency/Kuva64.png';

/** uniqueName → bundled (Vite-hashed) asset URL. */
export const SYNTHETIC_ICON_URLS: Record<string, string> = {
  '/Tennoplan/Currency/Endo':    endoIcon,
  '/Tennoplan/Currency/Credits': creditsIcon,
  '/Tennoplan/Currency/Kuva':    kuvaIcon,
};
