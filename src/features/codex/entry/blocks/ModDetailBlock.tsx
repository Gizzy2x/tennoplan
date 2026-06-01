/**
 * ModDetailBlock — the mod's signature composition as a full-page block.
 *
 * Replaces the old ModDetailModal: instead of a floating overlay, a mod now
 * renders as a normal codex detail page (Header + this block + Description +
 * Drops + …), so it flows through the same breadcrumb / "← Back to {page}"
 * navigation as every other entry — no more dead-end overlay.
 *
 * Composition (impeccable §3): the ModCardV3 is the anchor on the left; the
 * stat ladder and metadata radiate to the right. Card and stats share one
 * `rank` so the slider drives both at once. ModCardV3 itself is untouched
 * (frozen) — only its container changed from a modal to this page section.
 */

import { useState } from 'react';
import clsx from 'clsx';
import { ModCardV3 } from '../../components/ModCardV3';
import { ModStatsBlock, computeDisplayDrain } from './ModStatsBlock';
import { projectMod } from '@/lib/mods/codexModsAdapter';
import type { CodexEntry } from '../../types';
import styles from './ModDetailBlock.module.css';

const POLARITY_DISPLAY: Record<string, string> = {
  madurai: 'Madurai (V)', vazarin: 'Vazarin (D)', naramon: 'Naramon (—)',
  zenurik: 'Zenurik (Z)', unairu: 'Unairu (U)', penjaga: 'Penjaga (P)',
  umbra: 'Umbra (Ω)', aura: 'Aura', universal: 'Universal',
};

export function ModDetailBlock({ entry }: { entry: CodexEntry }) {
  if (entry.category !== 'Mod') return null;

  const mod          = projectMod(entry);
  const maxRank      = Math.max(0, mod.levelStats.length - 1);
  const [rank, setRank] = useState(maxRank);
  const displayDrain = computeDisplayDrain(mod.drain, rank);

  return (
    <section className={styles.root} aria-label={`${mod.name} mod`}>
      <div className={styles.cardCol}>
        <ModCardV3 mod={mod} rank={rank} size="detail" />
      </div>

      <div className={styles.info}>
        <div className={styles.subtitle}>
          <span>{mod.type}</span>
          <span className={styles.dot}>·</span>
          <span className={clsx(styles.rarity, styles[`rarity--${mod.rarity.toLowerCase()}`])}>
            {mod.rarity}
          </span>
          <span className={styles.dot}>·</span>
          <span>{mod.compatName}</span>
        </div>

        {mod.levelStats.length > 0 && (
          <ModStatsBlock
            levelStats={mod.levelStats}
            baseDrain={mod.drain}
            rank={rank}
            onRankChange={setRank}
          />
        )}

        <dl className={styles.meta}>
          <Meta label="Drain" value={String(displayDrain)} />
          {mod.polarity && <Meta label="Polarity" value={POLARITY_DISPLAY[mod.polarity] ?? mod.polarity} />}
          <Meta label="Tradeable" value={mod.tradeable ? 'Yes' : 'No'} />
          <Meta label="Max Rank" value={String(maxRank)} />
        </dl>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaRow}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={styles.metaValue}>{value}</dd>
    </div>
  );
}
