/**
 * tennoIconMap — maps Warframe text-icon codes (e.g. <DT_SLASH_COLOR>) to
 * local asset URLs. Vite handles the asset imports and hashing.
 *
 * Source of truth for codes: https://wiki.warframe.com/w/Text_Icons
 * Codes appear in:
 *   - @wfcd/items mod `description` and `levelStats` strings (mods-map.json)
 *   - Worldstate descriptions
 *   - Future: Riven mod stat strings (same format)
 *
 * Adding a new code:
 *   1. Drop the icon into the appropriate src/assets/tennoicons/<folder>/
 *   2. Add a static import below
 *   3. Add the code → URL entry in TENNOICON_MAP
 */

// --- Damage type icons (the small color glyphs shown in-game) ---
import dmgImpact      from '@/assets/tennoicons/damage/DmgImpactSmall64.png';
import dmgPuncture    from '@/assets/tennoicons/damage/DmgPunctureSmall64.png';
import dmgSlash       from '@/assets/tennoicons/damage/DmgSlashSmall64.png';
import dmgHeat        from '@/assets/tennoicons/damage/DmgHeatSmall64.png';
import dmgCold        from '@/assets/tennoicons/damage/DmgColdSmall64.png';
import dmgElectricity from '@/assets/tennoicons/damage/DmgElectricitySmall64.png';
import dmgToxin       from '@/assets/tennoicons/damage/DmgToxinSmall64.png';
import dmgBlast       from '@/assets/tennoicons/damage/DmgBlastSmall64.png';
import dmgRadiation   from '@/assets/tennoicons/damage/DmgRadiationSmall64.png';
import dmgGas         from '@/assets/tennoicons/damage/DmgGasSmall64.png';
import dmgMagnetic    from '@/assets/tennoicons/damage/DmgMagneticSmall64.png';
import dmgViral       from '@/assets/tennoicons/damage/DmgViralSmall64.png';
import dmgCorrosive   from '@/assets/tennoicons/damage/DmgCorrosiveSmall64.png';
import dmgVoid        from '@/assets/tennoicons/damage/DmgVoidSmall64.png';
import dmgTau         from '@/assets/tennoicons/damage/DmgTauSmall64.png';
import dmgTrue        from '@/assets/tennoicons/damage/DmgTrueSmall64.png';

// --- Focus school clean variants (used for <MADURAI_CLEAN>, etc.) ---
import focusMadurai   from '@/assets/tennoicons/focus/IconFocusCleanMadurai(xWhite).png';
import focusNaramon   from '@/assets/tennoicons/focus/IconFocusCleanNaramon(xWhite).png';
import focusUnairu    from '@/assets/tennoicons/focus/IconFocusCleanUnairu(xWhite).png';
import focusVazarin   from '@/assets/tennoicons/focus/IconFocusCleanVazarin(xWhite).png';
import focusZenurik   from '@/assets/tennoicons/focus/IconFocusCleanZenurik(xWhite).png';

// --- Stats / HUD glyphs ---
import iconShield     from '@/assets/tennoicons/stats/IconShield.png';
import iconEnergy     from '@/assets/tennoicons/stats/IconEnergy.gif';
import iconAffinity   from '@/assets/tennoicons/rank/MasteryAffinity64(xDark).png';

/**
 * Code → asset URL. Unknown codes return `undefined` and the StatLine
 * component will strip them silently.
 */
export const TENNOICON_MAP: Record<string, string> = {
  // Damage
  '<DT_IMPACT_COLOR>':      dmgImpact,
  '<DT_PUNCTURE_COLOR>':    dmgPuncture,
  '<DT_SLASH_COLOR>':       dmgSlash,
  '<DT_FIRE_COLOR>':        dmgHeat,        // DE uses FIRE for Heat
  '<DT_FREEZE_COLOR>':      dmgCold,        // DE uses FREEZE for Cold
  '<DT_ELECTRICITY_COLOR>': dmgElectricity,
  '<DT_POISON_COLOR>':      dmgToxin,       // DE uses POISON for Toxin
  '<DT_EXPLOSION_COLOR>':   dmgBlast,       // DE uses EXPLOSION for Blast
  '<DT_RADIATION_COLOR>':   dmgRadiation,
  '<DT_GAS_COLOR>':         dmgGas,
  '<DT_MAGNETIC_COLOR>':    dmgMagnetic,
  '<DT_VIRAL_COLOR>':       dmgViral,
  '<DT_CORROSIVE_COLOR>':   dmgCorrosive,
  '<DT_RADIANT_COLOR>':     dmgVoid,        // RADIANT = Void
  '<DT_SENTIENT>':          dmgTau,         // Sentient/Tau damage
  '<DT_TRUE_COLOR>':        dmgTrue,        // future-proofing

  // Focus
  '<MADURAI_CLEAN>':        focusMadurai,
  '<NARAMON_CLEAN>':        focusNaramon,
  '<UNAIRU_CLEAN>':         focusUnairu,
  '<VAZARIN_CLEAN>':        focusVazarin,
  '<ZENURIK_CLEAN>':        focusZenurik,

  // Stats / HUD
  '<SHIELD>':               iconShield,
  '<ENERGY>':               iconEnergy,
  '<AFFINITY_SHARE>':       iconAffinity,
};

/**
 * Non-icon codes — these have semantic meaning but render as text or trigger
 * styling. Handled in StatLine separately from the icon map.
 */
export const TENNOICON_TEXT_TOKENS: Record<string, string> = {
  '<LINE_SEPARATOR>': ' · ',
};

/**
 * Codes that signal layout/styling rather than rendering anything. StatLine
 * strips these but may use them to add classNames in the future.
 */
export const TENNOICON_FLAG_CODES = new Set([
  '<LOWER_IS_BETTER>',
  '<SECONDARY_FIRE>',
  '<USE>',
]);
