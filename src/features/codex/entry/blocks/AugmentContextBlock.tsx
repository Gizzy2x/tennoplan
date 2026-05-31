/**
 * AugmentContextBlock — surfaces the warframe a Warframe Augment mod is for.
 *
 * Most augments carry their host frame in `compatName` (uppercased), e.g.
 * "ASH" / "INAROS" / "VOLT". Some augments target categories instead
 * ("WARFRAME", "MELEE", "SHOTGUN", "FOCUS WAY") — those don't match a
 * specific warframe and we render nothing.
 *
 * Resolution strategy:
 *   1. Bail unless the mod is flagged `isAugment` and has a compatName.
 *   2. Case-insensitive name match against Dexie warframes — same pattern
 *      as ComponentsBlock (single toArray() pass, ~ms on ~8k rows).
 *   3. Memoised by compatName via useLiveQuery, so re-renders are cheap.
 *
 * Render shape: a compact context card with portrait + frame name +
 * "Augments [Frame]" label. When `onSelectWarframe` is provided (e.g.
 * from a future entry-shell mod view), the card is clickable; from the
 * current ModDetailModal it's non-interactive — the modal has no
 * navigation hookup yet, and fake clickability is worse than informative
 * stillness.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import styles from './AugmentContextBlock.module.css';

interface AugmentContextBlockProps {
  isAugment:        boolean;
  compatName?:      string | null;
  /** Optional — when present, the card becomes a button that opens the
   *  warframe entry. Without it, the card is purely informational. */
  onSelectWarframe?: (warframe: TennoplanItem) => void;
}

export function AugmentContextBlock({
  isAugment,
  compatName,
  onSelectWarframe,
}: AugmentContextBlockProps) {
  // Cheap bail before we touch Dexie — most mods aren't augments.
  const compatKey = isAugment && compatName ? compatName.toLowerCase().trim() : null;

  const warframe = useLiveQuery(
    async () => {
      if (!compatKey) return null;
      // The category index in tennoplanItems lets us scope the scan to
      // ~120 warframe rows rather than the full ~8k catalogue.
      const candidates = await db.tennoplanItems
        .where('category')
        .equals('Warframe')
        .toArray();
      const match = candidates.find((wf) => wf.name.toLowerCase() === compatKey);
      return match ?? null;
    },
    [compatKey],
  );

  // No augment flag, generic-category compatName, or codex not yet
  // synced → render nothing. The shell drops the empty block silently.
  if (!warframe) return null;

  const interactive = typeof onSelectWarframe === 'function';
  const Tag = interactive ? 'button' : 'div';

  return (
    <section
      className={styles.root}
      aria-labelledby="codex-augment-context-label"
    >
      <h2 id="codex-augment-context-label" className={styles.label}>
        Warframe Augment
      </h2>

      <Tag
        type={interactive ? 'button' : undefined}
        className={clsx(styles.card, interactive && styles.cardInteractive)}
        onClick={interactive ? () => onSelectWarframe!(warframe) : undefined}
        aria-label={
          interactive
            ? `Open ${warframe.name} in codex`
            : undefined
        }
      >
        {warframe.iconUrl && (
          <img
            src={warframe.thumbUrl ?? warframe.iconUrl}
            alt=""
            className={styles.portrait}
            draggable={false}
            decoding="async"
          />
        )}
        <div className={styles.copy}>
          <span className={styles.augmentsLabel}>Augments</span>
          <span className={styles.warframeName}>{warframe.name}</span>
        </div>
      </Tag>
    </section>
  );
}
