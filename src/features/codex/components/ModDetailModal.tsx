import { useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { ModCardV3 } from './ModCardV3';
import { ModStatsBlock, computeDisplayDrain } from '@/features/codex/entry/blocks/ModStatsBlock';
import type { ModEntry } from '@/lib/mods/codexModsAdapter';
import styles from './ModDetailModal.module.css';

const POLARITY_DISPLAY: Record<string, string> = {
  madurai: 'Madurai (V)', vazarin: 'Vazarin (D)', naramon: 'Naramon (—)',
  zenurik: 'Zenurik (Z)', unairu: 'Unairu (U)', penjaga: 'Penjaga (P)',
  umbra: 'Umbra (Ω)', aura: 'Aura', universal: 'Universal',
};

interface ModDetailModalProps {
  mod: ModEntry;
  onClose: () => void;
}

export function ModDetailModal({ mod, onClose }: ModDetailModalProps) {
  const maxRank = Math.max(0, mod.levelStats.length - 1);
  const [rank, setRank] = useState(maxRank);
  const displayDrain = computeDisplayDrain(mod.drain, rank);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlay = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    [onClose],
  );

  return (
    <div className={styles['wf-modal-overlay']} onClick={handleOverlay}>
      <div className={styles['wf-modal']} role="dialog" aria-label={mod.name}>
        <button className={styles['wf-modal-close']} onClick={onClose} aria-label="Close">&times;</button>

        <div className={styles['wf-modal-layout']}>
          {/* Card preview */}
          <div className={styles['wf-modal-card-col']}>
            <ModCardV3 mod={mod} rank={rank} size="detail" />
          </div>

          {/* Info panel */}
          <div className={styles['wf-modal-info']}>
            <h2 className={styles['wf-modal-title']}>{mod.name}</h2>
            <div className={styles['wf-modal-subtitle']}>
              <span>{mod.type}</span>
              <span className={styles['wf-modal-dot']}>&middot;</span>
              <span className={clsx(styles['wf-modal-rarity'], styles[`wf-modal-rarity--${mod.rarity.toLowerCase()}`])}>{mod.rarity}</span>
              <span className={styles['wf-modal-dot']}>&middot;</span>
              <span>{mod.compatName}</span>
            </div>

            <div className={styles['wf-modal-divider']} />

            <ModStatsBlock
              levelStats={mod.levelStats}
              baseDrain={mod.drain}
              rank={rank}
              onRankChange={setRank}
            />

            {/* Description */}
            {mod.description && (
              <>
                <div className={styles['wf-modal-divider']} />
                <p className={styles['wf-modal-desc']}>
                  {mod.description.replace(/<[A-Z0-9_]+>/g, '').replace(/\\n/g, ' ')}
                </p>
              </>
            )}

            {/* Metadata */}
            <div className={styles['wf-modal-meta']}>
              <div className={styles['wf-modal-meta-row']}>
                <span className={styles['wf-modal-meta-label']}>Drain</span>
                <span className={styles['wf-modal-meta-value']}>{displayDrain}</span>
              </div>
              {mod.polarity && (
                <div className={styles['wf-modal-meta-row']}>
                  <span className={styles['wf-modal-meta-label']}>Polarity</span>
                  <span className={styles['wf-modal-meta-value']}>{POLARITY_DISPLAY[mod.polarity] ?? mod.polarity}</span>
                </div>
              )}
              <div className={styles['wf-modal-meta-row']}>
                <span className={styles['wf-modal-meta-label']}>Tradeable</span>
                <span className={styles['wf-modal-meta-value']}>{mod.tradeable ? 'Yes' : 'No'}</span>
              </div>
              <div className={styles['wf-modal-meta-row']}>
                <span className={styles['wf-modal-meta-label']}>Max Rank</span>
                <span className={styles['wf-modal-meta-value']}>{maxRank}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
