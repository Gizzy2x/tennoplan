import type { CSSProperties } from 'react';
import clsx from 'clsx';
import { useIconBlobUrl } from '@/lib/icons/iconBlobCache';
import { getIconUrl } from '@/lib/icons/IconResolver';
import type { ModEntry } from '@/lib/mods/modsAdapter';
import {
  detectModFrameType,
  getFrameAssets,
  getFrameAssetsV2,
  getArchonFullCard,
  getPolarityIcon,
  POLARITY_LABEL,
  FRAME_GLOW,
  type ModFrameType,
  type FrameAssetSetV2,
} from './modFrameAssets';
import styles from './ModCard.module.css';

function cleanStat(raw: string): string {
  return raw.replace(/<[A-Z0-9_]+>/g, '').replace(/\\n/g, ' · ').trim();
}

interface ModCardProps {
  mod: ModEntry;
  rank?: number;
  onClick?: () => void;
  size?: 'browse' | 'grid' | 'detail';
}

export function ModCard({ mod, rank, onClick, size = 'browse' }: ModCardProps) {
  const frameType = detectModFrameType(mod);
  const archonCard = frameType === 'archon' ? getArchonFullCard(mod.name) : null;

  const displayRank = rank ?? mod.levelStats.length - 1;
  const maxRank = Math.max(0, mod.levelStats.length - 1);
  const displayDrain = mod.drain > 0 ? mod.drain + displayRank : displayRank + 4;

  if (archonCard) {
    return (
      <div
        className={clsx(
          styles['wf-mod-card'],
          styles[`wf-mod-card--${size}`],
          styles['wf-mod-card--archon'],
        )}
        style={{ '--wf-glow': FRAME_GLOW.archon } as CSSProperties}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
        aria-label={`${mod.name} Rank ${displayRank}`}
      >
        <img src={archonCard} alt={mod.name} className={styles['wf-archon-full']} draggable={false} />
      </div>
    );
  }

  // V2 consolidated render path (rare + legendary so far). All layers share the
  // 254×373 canvas, so they align pixel-perfect when the card scales.
  const v2 = getFrameAssetsV2(frameType);
  if (v2) {
    return (
      <LayeredCardV2
        mod={mod}
        frameType={frameType}
        assets={v2}
        displayRank={displayRank}
        maxRank={maxRank}
        displayDrain={displayDrain}
        onClick={onClick}
        size={size}
      />
    );
  }

  return (
    <LayeredCard
      mod={mod}
      frameType={frameType}
      displayRank={displayRank}
      maxRank={maxRank}
      displayDrain={displayDrain}
      onClick={onClick}
      size={size}
    />
  );
}

interface LayeredCardV2Props {
  mod: ModEntry;
  frameType: ModFrameType;
  assets: FrameAssetSetV2;
  displayRank: number;
  maxRank: number;
  displayDrain: number;
  onClick?: () => void;
  size: 'browse' | 'grid' | 'detail';
}

function LayeredCardV2({
  mod, frameType, assets, displayRank, maxRank, displayDrain, onClick, size,
}: LayeredCardV2Props) {
  const stats = mod.levelStats[displayRank] ?? [];
  const polarityIcon = mod.polarity ? getPolarityIcon(mod.polarity) : null;
  const polarityText = mod.polarity ? (POLARITY_LABEL[mod.polarity] ?? '') : '';
  const cdnUrl = mod.imageName ? getIconUrl(mod.imageName) : '/lotus-placeholder.svg';
  const iconSrc = useIconBlobUrl(cdnUrl);

  const isMaxed = maxRank > 0 && displayRank === maxRank;
  const showStats = size !== 'grid' || stats.length > 0;
  const statLines = size === 'browse' ? stats.slice(0, 1) : stats;

  return (
    <div
      className={clsx(
        styles['wf-mod-card'],
        styles['wf-mod-card--v2'],
        styles[`wf-mod-card--${size}`],
        styles[`wf-mod-card--${frameType}-v2`],
      )}
      style={{
        '--wf-glow': FRAME_GLOW[frameType],
        '--wf-bg-url': `url(${assets.background})`,
      } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      aria-label={`${mod.name} Rank ${displayRank}`}
    >
      {/* L0: Background (rarity texture) */}
      <img src={assets.background} alt="" className={clsx(styles['wf-l'], styles['wf-v2-bg'])} draggable={false} />

      {/* L1: Mod art — square, clipped to art region inside background bounds */}
      <div className={clsx(styles['wf-l'], styles['wf-v2-art'])}>
        <img src={iconSrc} alt="" className={styles['wf-v2-art-img']} loading="lazy" decoding="async" draggable={false} />
      </div>

      {/* L2: Frame overlay — full canvas decorative border (notch baked in) */}
      <img src={assets.fullFrame} alt="" className={clsx(styles['wf-l'], styles['wf-v2-frame'])} draggable={false} />

      {/* L4: Maxed-rank line (only when displayRank === maxRank) */}
      {isMaxed && (
        <img src={assets.rankCompleteLine} alt="" className={clsx(styles['wf-l'], styles['wf-v2-rank-line'])} draggable={false} />
      )}

      {/* L5: Drain number — sits inside the polarity slot */}
      <span className={clsx(styles['wf-l'], styles['wf-v2-drain'])}>{displayDrain}</span>

      {/* L5: Polarity SVG — fixed slot in the top-right notch */}
      {polarityIcon ? (
        <span className={clsx(styles['wf-l'], styles['wf-v2-polarity'])} aria-label={mod.polarity ?? ''} dangerouslySetInnerHTML={{ __html: polarityIcon }} />
      ) : polarityText ? (
        <span className={clsx(styles['wf-l'], styles['wf-v2-polarity-text'])}>{polarityText}</span>
      ) : null}

      {/* L6–L7: Name + Description group */}
      <div className={clsx(styles['wf-l'], styles['wf-v2-content'])}>
        {/* L6: Mod name */}
        <h3 className={styles['wf-v2-name']}>{mod.name}</h3>

        {/* L7: Stats */}
        {showStats && statLines.length > 0 && (
          <div className={styles['wf-v2-stats']}>
            {statLines.map((l, i) => (
              <span key={i} className={styles['wf-v2-stat']}>{cleanStat(l)}</span>
            ))}
          </div>
        )}
      </div>

      {/* L8: Category label (WARFRAME / RIFLE / etc.) */}
      <div className={clsx(styles['wf-l'], styles['wf-v2-category'])}>{mod.compatName}</div>

      {/* L9: Rank stars — fill left-to-right */}
      {maxRank > 0 && (
        <div className={clsx(styles['wf-l'], styles['wf-v2-stars'])}>
          {Array.from({ length: maxRank }, (_, i) => (
            <img
              key={i}
              src={assets.rankPip}
              alt=""
              className={clsx(styles['wf-v2-star'], i < displayRank && styles['wf-v2-star--on'])}
              draggable={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LayeredCardProps {
  mod: ModEntry;
  frameType: ModFrameType;
  displayRank: number;
  maxRank: number;
  displayDrain: number;
  onClick?: () => void;
  size: 'browse' | 'grid' | 'detail';
}

function LayeredCard({
  mod, frameType, displayRank, maxRank, displayDrain, onClick, size,
}: LayeredCardProps) {
  const assets = getFrameAssets(frameType);
  const stats = mod.levelStats[displayRank] ?? [];
  const polarityIcon = mod.polarity ? getPolarityIcon(mod.polarity) : null;
  const polarityText = mod.polarity ? (POLARITY_LABEL[mod.polarity] ?? '') : '';
  const cdnUrl = mod.imageName ? getIconUrl(mod.imageName) : '/lotus-placeholder.svg';
  const iconSrc = useIconBlobUrl(cdnUrl);

  const showStats = size !== 'grid' || stats.length > 0;
  const statLines = size === 'browse' ? stats.slice(0, 1) : stats;

  return (
    <div
      className={clsx(
        styles['wf-mod-card'],
        styles[`wf-mod-card--${size}`],
        styles[`wf-mod-card--${frameType}`],
      )}
      style={{ '--wf-glow': FRAME_GLOW[frameType] } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      aria-label={`${mod.name} Rank ${displayRank}`}
    >
      {/* L0: Background fill (rarity texture) */}
      <img src={assets.background} alt="" className={clsx(styles['wf-l'], styles['wf-l-bg'])} draggable={false} />

      {/* L1: Mod icon / art (dominates upper card area) */}
      <div className={clsx(styles['wf-l'], styles['wf-l-icon-wrap'])}>
        <img src={iconSrc} alt="" className={styles['wf-l-icon']} loading="lazy" decoding="async" draggable={false} />
      </div>

      {/* L2: Bottom dark gradient panel (for text readability) */}
      <div className={clsx(styles['wf-l'], styles['wf-l-panel'])} />

      {/* L3: Side lights (subtle vertical accents) */}
      <img src={assets.sideLight} alt="" className={clsx(styles['wf-l'], styles['wf-l-side'], styles['wf-l-side--l'])} draggable={false} />
      <img src={assets.sideLight} alt="" className={clsx(styles['wf-l'], styles['wf-l-side'], styles['wf-l-side--r'])} draggable={false} />

      {/* L4: Frame top (small ornament at top edge) */}
      <img src={assets.frameTop} alt="" className={clsx(styles['wf-l'], styles['wf-l-ftop'])} draggable={false} />

      {/* L5: Frame bottom (curved border at bottom edge) */}
      <img src={assets.frameBottom} alt="" className={clsx(styles['wf-l'], styles['wf-l-fbtm'])} draggable={false} />

      {/* L6: Corner lights (small accent flames at bottom corners) */}
      <img src={assets.cornerLight} alt="" className={clsx(styles['wf-l'], styles['wf-l-corner'], styles['wf-l-corner--l'])} draggable={false} />
      <img src={assets.cornerLight} alt="" className={clsx(styles['wf-l'], styles['wf-l-corner'], styles['wf-l-corner--r'])} draggable={false} />

      {/* L6: Drain badge (top-right backer + number + polarity) */}
      <div className={clsx(styles['wf-l'], styles['wf-drain-badge'])}>
        <img src={assets.topRightBacker} alt="" className={styles['wf-drain-backer']} draggable={false} />
        <span className={styles['wf-drain-num']}>{displayDrain}</span>
        {polarityIcon ? (
          <span className={styles['wf-polarity-icon']} aria-label={mod.polarity ?? ''} dangerouslySetInnerHTML={{ __html: polarityIcon }} />
        ) : polarityText ? (
          <span className={styles['wf-polarity-text']}>{polarityText}</span>
        ) : null}
      </div>

      {/* L7: Mod name */}
      <h3 className={clsx(styles['wf-l'], styles['wf-mod-name'])}>{mod.name}</h3>

      {/* L8: Stats */}
      {showStats && statLines.length > 0 && (
        <div className={clsx(styles['wf-l'], styles['wf-mod-stats'])}>
          {statLines.map((l, i) => (
            <span key={i} className={styles['wf-mod-stat']}>{cleanStat(l)}</span>
          ))}
        </div>
      )}

      {/* L9: Type tab (lower tab + compat text) */}
      <div className={clsx(styles['wf-l'], styles['wf-type-tab'])}>
        <img src={assets.lowerTab} alt="" className={styles['wf-tab-img']} draggable={false} />
        <span className={styles['wf-tab-text']}>{mod.compatName}</span>
      </div>

      {/* L10: Rank pips */}
      {maxRank > 0 && (
        <div className={clsx(styles['wf-l'], styles['wf-rank-pips'])}>
          {Array.from({ length: maxRank }, (_, i) => (
            <img
              key={i}
              src={assets.rankPip}
              alt=""
              className={clsx(styles['wf-pip'], i < displayRank && styles['wf-pip--on'])}
              draggable={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
