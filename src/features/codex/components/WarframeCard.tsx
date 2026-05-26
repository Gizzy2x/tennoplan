/**
 * WarframeCard — single card in the Codex warframes browser.
 *
 * Purely presentational. Click is bubbled via onClick — the Codex page
 * owns navigation state and decides what to render in response.
 *
 * Visual hierarchy: icon dominates, name centered below, mastery + Prime
 * status as muted meta. Vaulted Prime warframes are not flagged here
 * because vaulting applies to relic-acquired parts, not the assembled
 * warframe itself; that nuance lives in the entry detail view.
 */

import { memo } from 'react';
import clsx from 'clsx';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import { isPrimeWarframe } from '@/lib/warframes/codexWarframesAdapter';
import styles from './WarframeCard.module.css';

interface WarframeCardProps {
  warframe: TennoplanItem;
  onClick:  () => void;
}

function WarframeCardImpl({ warframe, onClick }: WarframeCardProps) {
  const isPrime = isPrimeWarframe(warframe);
  const initials = warframe.name.slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      className={clsx(styles.root)}
      onClick={onClick}
      aria-label={`Open ${warframe.name} in Codex`}
    >
      <div className={styles.iconWrap}>
        {warframe.iconUrl
          ? <img
              src={warframe.iconUrl}
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

      <h3 className={styles.name}>{warframe.name}</h3>

      <div className={styles.metaRow}>
        {warframe.masteryRank != null && warframe.masteryRank > 0 && (
          <>
            <span className={styles.masteryBadge}>MR&nbsp;{warframe.masteryRank}</span>
            <span className={styles.metaDot}>&middot;</span>
          </>
        )}
        <span>{isPrime ? 'Prime Warframe' : 'Warframe'}</span>
      </div>
    </button>
  );
}

export const WarframeCard = memo(WarframeCardImpl);
