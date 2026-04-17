/**
 * ItemIcon — renders a Warframe item icon from the WFCD CDN.
 *
 * Usage:
 *   <ItemIcon imageName="ash-f2c6f3ab3f.png" name="Ash" size="md" />
 *   <ItemIcon item={warframeItem} size={48} />
 *
 * Falls back to lotus-placeholder.svg on load error.
 * Tinting applies a gold CSS filter matching the Orokin design system.
 */

import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { getIconUrl, getIconUrlByItem } from '@/lib/icons/IconResolver';
import type { WarframeItem } from '@/core/domain/items';

// ─── Size presets (px) ───────────────────────────────────────────────────────

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
} as const;

type SizePreset = keyof typeof SIZE_MAP;

// ─── Props ───────────────────────────────────────────────────────────────────

type ItemIconSource =
  | { item: WarframeItem; imageName?: never; uniqueName?: never }
  | { imageName: string; item?: never; uniqueName?: never }
  | { uniqueName?: string; imageName?: never; item?: never };

export type ItemIconProps = ItemIconSource & {
  /** Display name used as alt text. Defaults to "Warframe item". */
  name?: string;
  /** Pixel size or preset. Defaults to "md" (48px). */
  size?: number | SizePreset;
  /** Apply gold tint filter (Orokin primary color). */
  tint?: boolean;
  /** Additional class names. */
  className?: string;
  /** Inline style — merged with internal sizing + filter styles. */
  style?: CSSProperties;
};

// ─── Gold tint filter ────────────────────────────────────────────────────────
// Approximates --color-primary (#E3C372) as a CSS filter overlay.
// sepia → saturate → hue-rotate shift gold hue.
const GOLD_TINT_FILTER =
  'sepia(1) saturate(3) hue-rotate(5deg) brightness(1.05)';

// ─── Component ───────────────────────────────────────────────────────────────

export function ItemIcon({
  item,
  imageName,
  name,
  size = 'md',
  tint = false,
  className,
  style: styleProp,
}: ItemIconProps) {
  const [errored, setErrored] = useState(false);

  const px = typeof size === 'number' ? size : SIZE_MAP[size];

  // Resolve the source URL from whatever identifier was provided.
  let src: string;
  if (errored) {
    src = '/lotus-placeholder.svg';
  } else if (item) {
    src = getIconUrlByItem(item);
  } else if (imageName) {
    src = getIconUrl(imageName);
  } else {
    src = '/lotus-placeholder.svg';
  }

  return (
    <img
      src={src}
      alt={name ?? item?.name ?? 'Warframe item'}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={cn('object-contain shrink-0', className)}
      style={{
        width: px,
        height: px,
        filter: tint && !errored ? GOLD_TINT_FILTER : undefined,
        ...styleProp,
      }}
    />
  );
}
