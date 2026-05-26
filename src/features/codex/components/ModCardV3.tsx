/* ModCardV3 — multi-piece layered card.
 *
 * Architecture: container is sized by the background's content box (242×338
 * aspect ratio). Every other piece — frame top, frame bottom, side lights,
 * corner lights, backer, lower tab, rank pips — is an absolutely-positioned
 * <img> with placement expressed as % of the container.
 *
 * Layer order (z-index, bottom→top):
 *   0  Background        — card texture
 *   1  Art (masked)      — mod icon, clipped to bg silhouette
 *   2  Side lights       — vertical accents at L/R edges (mirrored)
 *   3  Top-right backer  — drain + polarity notch backer plate
 *   4  Frame top/bottom  — chrome ornaments (overhang permitted)
 *   5  Corner lights     — bottom corner flares (null on Archon)
 *   6  Lower tab         — compat name tab
 *   7  Rank slots / line — pip row + maxed indicator
 *   8  Text              — drain, mod name, stats, compat label
 *
 * Two states: 'expanded' shows full content (name + stats + tab + pips);
 * 'collapsed' shows just art + name + drain. Designed for future animation
 * between the two.
 */

import { type CSSProperties } from 'react';
import clsx from 'clsx';
import { useIconBlobUrl } from '@/lib/icons/iconBlobCache';
import { getIconUrl } from '@/lib/icons/IconResolver';
import type { ModEntry } from '@/lib/mods/codexModsAdapter';
import {
  detectTierV3, getFrameAssetsV3, TIER_TEXT_COLOR, TIER_GLOW,
} from './modFrameAssetsV3';
import { getPolarityIcon, POLARITY_LABEL } from './modFrameAssetsV3';
import { StatLine } from '@/lib/tennoicons/StatLine';
import styles from './ModCardV3.module.css';

export type V3CardState = 'expanded' | 'collapsed';
export type V3CardSize  = 'grid' | 'browse' | 'detail';

interface ModCardV3Props {
  mod:     ModEntry;
  rank?:   number;
  state?:  V3CardState;
  size?:   V3CardSize;
  onClick?: () => void;
  /** Inline style override — used by dev tools to scrub --card-w, etc. */
  style?:  CSSProperties;
}

export function ModCardV3({
  mod, rank, state = 'expanded', size = 'browse', onClick, style,
}: ModCardV3Props) {
  const tier   = detectTierV3(mod);
  const assets = getFrameAssetsV3(tier);

  const displayRank  = rank ?? mod.levelStats.length - 1;
  const maxRank      = Math.max(0, mod.levelStats.length - 1);
  const displayDrain = mod.drain + displayRank;
  const isMaxed      = maxRank > 0 && displayRank === maxRank;
  const stats        = mod.levelStats[displayRank] ?? [];

  // 2-digit drains use the wider backer art (58×26 vs 45×26 native), which
  // extends the backer leftward while keeping the right edge pinned — matches
  // Warframe's in-game behavior so safety gaps around drain + polarity stay
  // consistent regardless of digit count.
  const useExtendedBacker = String(displayDrain).length >= 2;
  const backerSrc = useExtendedBacker ? assets.topRightBackerExtended : assets.topRightBacker;

  const polarityIcon = mod.polarity ? getPolarityIcon(mod.polarity) : null;
  const polarityText = mod.polarity ? (POLARITY_LABEL[mod.polarity] ?? '') : '';

  const cdnUrl  = mod.imageName ? getIconUrl(mod.imageName) : '/lotus-placeholder.svg';
  const iconSrc = useIconBlobUrl(cdnUrl);

  const cssVars = {
    '--tier-text-color': TIER_TEXT_COLOR[tier],
    '--tier-glow':       TIER_GLOW[tier],
    '--bg-url':          `url(${assets.background})`,
    ...style,  // dev overrides (e.g. --card-w from preview strip slider)
  } as CSSProperties;

  return (
    <div
      className={clsx(
        styles.card,
        styles[`tier-${tier.toLowerCase()}` as keyof typeof styles],
        styles[`size-${size}`],
        styles[`state-${state}`],
      )}
      style={cssVars}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      aria-label={`${mod.name} Rank ${displayRank}`}
    >
      {/* L0: Background — defines the card shape and container fill */}
      <img src={assets.background} alt="" className={styles.background} draggable={false} />

      {/* L1: Art — grid row 1, masked to background silhouette */}
      <div className={styles.artWrap}>
        <img
          src={iconSrc}
          alt=""
          className={styles.art}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <div className={styles.artCorners} aria-hidden="true" />
      </div>

      {/* L2: Side lights — mirrored pair */}
      {assets.showSideLight && (
        <>
          <img src={assets.sideLight} alt="" className={clsx(styles.sideLight, styles.sideLightLeft)}  draggable={false} />
          <img src={assets.sideLight} alt="" className={clsx(styles.sideLight, styles.sideLightRight)} draggable={false} />
        </>
      )}

      {/* L3: Backer plate (drain + polarity).
          Hidden entirely on tiers with no capacity cost (showDrain: false).
          When the drain is 2+ digits we swap to the wider backer art (58×26 vs
          45×26 native) so the right edge stays pinned while it extends left. */}
      {assets.showDrain && (
        <>
          <img
            src={backerSrc}
            alt=""
            className={clsx(styles.backer, useExtendedBacker && styles.backerExtended)}
            draggable={false}
          />
          <div
            className={clsx(styles.backerContent, useExtendedBacker && styles.backerContentExtended)}
            aria-hidden="true"
          >
            <span className={styles.drain}>{displayDrain}</span>
            {assets.showPolarity && (polarityIcon ? (
              <span
                className={styles.polarity}
                data-polarity={mod.polarity}
                dangerouslySetInnerHTML={{ __html: polarityIcon }}
              />
            ) : polarityText ? (
              <span className={styles.polarityText} data-polarity={mod.polarity}>
                {polarityText}
              </span>
            ) : null)}
          </div>
        </>
      )}

      {/* L4a: Frame top */}
      <img src={assets.frameTop} alt="" className={styles.frameTop} draggable={false} />

      {/* L4b: Frame bottom */}
      <img src={assets.frameBottom} alt="" className={styles.frameBottom} draggable={false} />

      {/* L5: Corner lights (Archon has none) */}
      {assets.cornerLights && (
        <>
          <img src={assets.cornerLights} alt="" className={clsx(styles.cornerLight, styles.cornerLightLeft)}  draggable={false} />
          <img src={assets.cornerLights} alt="" className={clsx(styles.cornerLight, styles.cornerLightRight)} draggable={false} />
        </>
      )}

      {/* L6: Lower tab (compat name) — expanded only, hidden on tiers without one */}
      {state === 'expanded' && assets.showLowerTab && (
        <>
          <img src={assets.lowerTab} alt="" className={styles.lowerTab} draggable={false} />
          <div className={styles.lowerTabText}>{mod.compatName}</div>
        </>
      )}

      {/* L7: Rank slots + complete line */}
      {state === 'expanded' && assets.showRankPips && maxRank > 0 && (
        <div className={styles.rankSlots} aria-label={`Rank ${displayRank} of ${maxRank}`}>
          {Array.from({ length: maxRank }, (_, i) => (
            <img
              key={i}
              src={assets.rankSlotActive}
              alt=""
              className={clsx(styles.rankSlot, i < displayRank && styles.rankSlotOn)}
              draggable={false}
            />
          ))}
        </div>
      )}
      {state === 'expanded' && assets.showRankLine && isMaxed && (
        <img src={assets.rankCompleteLine} alt="" className={styles.rankCompleteLine} draggable={false} />
      )}

      {/* L8: Mod name + stats (grid row 2) */}
      {state === 'expanded' && (
        <div className={styles.content}>
          <h3 className={styles.modName}>{mod.name}</h3>
          {stats.length > 0 && (
            <div className={styles.stats}>
              {stats.map((line, i) => (
                <StatLine key={i} text={line} className={styles.stat} />
              ))}
            </div>
          )}
        </div>
      )}
      {state === 'collapsed' && (
        <h3 className={clsx(styles.modName, styles.modNameCollapsed)}>{mod.name}</h3>
      )}

      {/* Grid row 3 — reserves bottom zone for tab + rank layers */}
      {state === 'expanded' && <div className={styles.bottomSpacer} />}
    </div>
  );
}
