/**
 * HeaderBlock — name + classification + flag pills.
 *
 * Universal: works for every category. Reads:
 *   • name        — display name
 *   • category    — for the subtitle ("Warframe" / "Rifle Mod" / etc.)
 *   • type        — preferred over category when present (more specific)
 *   • masteryRank — gold MR badge when > 0
 *   • rarity      — color-coded pill (Mods + collectibles)
 *   • vaulted     — pill for vaulted prime parts
 *   • tradeable   — explicit "Account-bound" pill when false
 *
 * Pills are placed top-right of the title; the subtitle row sits below.
 * If no flags apply, the pill cluster is hidden — no empty space.
 */

import clsx from 'clsx';
import type { CodexEntry } from '../../types';
import styles from './HeaderBlock.module.css';

interface HeaderBlockProps {
  entry: CodexEntry;
}

export function HeaderBlock({ entry }: HeaderBlockProps) {
  const isPrime = /\bPrime\b/.test(entry.name);
  const typeLabel = entry.type
    ? cleanTypeLabel(entry.type, entry.category)
    : (isPrime ? `Prime ${entry.category}` : entry.category);

  const rarityKey = entry.rarity?.toLowerCase();
  const rarityClass = rarityKey
    ? styles[`pill--${rarityKey}` as keyof typeof styles]
    : undefined;

  const showPills = entry.vaulted === true
    || entry.rarity !== undefined
    || entry.tradeable === false;

  return (
    <header className={styles.root}>
      <div className={styles.topRow}>
        <h1 className={styles.title}>{entry.name}</h1>

        {showPills && (
          <div className={styles.pills} role="group" aria-label="Entry tags">
            {entry.rarity && (
              <span className={clsx(styles.pill, rarityClass)}>
                <span className={styles.pillDot} aria-hidden="true" />
                {entry.rarity}
              </span>
            )}
            {entry.vaulted === true && (
              <span className={clsx(styles.pill, styles['pill--vaulted'])}>
                Vaulted
              </span>
            )}
            {entry.tradeable === false && (
              <span className={styles.pill}>Account-bound</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.subtitleRow}>
        <span>{typeLabel}</span>
        {entry.masteryRank != null && entry.masteryRank > 0 && (
          <>
            <span className={styles.subtitleDot}>·</span>
            <span className={styles.mrBadge}>MR {entry.masteryRank}</span>
          </>
        )}
        {entry.tradeable === true && (
          <>
            <span className={styles.subtitleDot}>·</span>
            <span>Tradeable</span>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Calamity's `type` field carries raw enum strings like
 * `/Lotus/Types/Game/PowerSuit` or `PRODUCT_CATEGORY_WEAPONS`. When we
 * have a clean string, use it; otherwise fall back to the category
 * with a "Prime" prefix where appropriate.
 */
function cleanTypeLabel(type: string, category: string): string {
  // Already-clean values pass through (e.g. "Warframe Mod").
  if (!type.includes('/') && !type.includes('_')) return type;
  return category;
}
