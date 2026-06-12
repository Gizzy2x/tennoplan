/**
 * CodexItemCard — generic browser card for any TennoplanItem.
 *
 * Drop-in for Weapons, Companions, Sentinels, and future categories that
 * don't need bespoke meta. Modeled on WarframeCard's layout but reads the
 * meta label from data instead of hard-coding a category string, so the
 * same card works across the codex.
 *
 * Meta resolution order:
 *   1. `entry.type`     (e.g. "Rifle", "Kubrow", "Sentinel") — preferred
 *   2. `entry.subtype`  (productCategory fallback)
 *   3. `entry.category` (final fallback)
 *
 * Prime ribbon fires on name match — Prime variants exist across weapons,
 * pets, and sentinels (Helios Prime, Kavasa Prime collar, etc.) so the
 * cue is universal.
 */

import { memo } from 'react';
import clsx from 'clsx';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import styles from './CodexItemCard.module.css';

interface CodexItemCardProps {
  entry:   TennoplanItem;
  onClick: () => void;
}

function CodexItemCardImpl({ entry, onClick }: CodexItemCardProps) {
  const isPrime = /\bPrime\b/.test(entry.name);
  const initials = entry.name.slice(0, 1).toUpperCase();
  const metaLabel = entry.type ?? entry.subtype ?? entry.category;

  return (
    <button
      type="button"
      className={clsx(styles.root)}
      onClick={onClick}
      aria-label={`Open ${entry.name} in Codex`}
    >
      <div className={styles.iconWrap}>
        {entry.iconUrl
          ? <img
              src={entry.iconUrl}
              alt=""
              className={styles.icon}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          : <div className={styles.iconPlaceholder} aria-hidden="true">{initials}</div>
        }
        {isPrime && <span className={styles.primeRibbon}>Prime</span>}
      </div>

      <h3 className={styles.name}>{entry.name}</h3>

      <div className={styles.metaRow}>
        {entry.masteryRank != null && entry.masteryRank > 0 && (
          <>
            <span className={styles.masteryBadge}>MR&nbsp;{entry.masteryRank}</span>
            <span className={styles.metaDot}>&middot;</span>
          </>
        )}
        <span>{metaLabel}</span>
      </div>
    </button>
  );
}

export const CodexItemCard = memo(CodexItemCardImpl);
