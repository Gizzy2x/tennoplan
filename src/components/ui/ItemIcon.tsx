/**
 * ItemIcon — renders a Warframe item icon from the WFCD CDN.
 *
 * Usage:
 *   <ItemIcon imageName="ash-f2c6f3ab3f.png" name="Ash" size="md" />
 *   <ItemIcon item={warframeItem} size={48} />
 *   <ItemIcon uniqueName="/Lotus/Powersuits/Ninja/Ninja" name="Ash" />
 *
 * Resolution order (sync, no Dexie):
 *   1. item.imageName   → CDN URL
 *   2. imageName (guard against empty string → placeholder)
 *   3. uniqueName       → itemsAdapter.findByUniqueName → CDN URL
 *   4. /lotus-placeholder.svg
 *
 * For Dexie-backed pre-resolved iconUrls, use LazyItemIcon with uniqueName.
 */

import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { getIconUrl, getIconUrlByItem } from '@/lib/icons/IconResolver';
import { findByUniqueName } from '@/adapters/items/itemsAdapter';
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
  | { imageName: string;  item?: never;      uniqueName?: never }
  | { uniqueName: string; imageName?: never; item?: never };

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

const GOLD_TINT_FILTER = 'sepia(1) saturate(3) hue-rotate(5deg) brightness(1.05)';

// ─── URL resolution (sync) ───────────────────────────────────────────────────

function resolveSrc(
  props: Pick<ItemIconProps, 'item' | 'imageName' | 'uniqueName'>,
): string {
  if ('item' in props && props.item) {
    return props.item.imageName ? getIconUrlByItem(props.item) : '/lotus-placeholder.svg';
  }
  if ('imageName' in props && props.imageName) {
    // Guard: empty imageName would produce a broken CDN URL ending in '/'
    return props.imageName.trim() ? getIconUrl(props.imageName) : '/lotus-placeholder.svg';
  }
  if ('uniqueName' in props && props.uniqueName) {
    const entry = findByUniqueName(props.uniqueName);
    return entry?.imageName ? getIconUrl(entry.imageName) : '/lotus-placeholder.svg';
  }
  return '/lotus-placeholder.svg';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ItemIcon({
  item,
  imageName,
  uniqueName,
  name,
  size = 'md',
  tint = false,
  className,
  style: styleProp,
}: ItemIconProps & { item?: WarframeItem; imageName?: string; uniqueName?: string }) {
  const [errored, setErrored] = useState(false);

  const px = typeof size === 'number' ? size : SIZE_MAP[size as SizePreset] ?? 48;

  const src = errored
    ? '/lotus-placeholder.svg'
    : resolveSrc({ item, imageName, uniqueName } as Parameters<typeof resolveSrc>[0]);

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
        width:  px,
        height: px,
        filter: tint && !errored ? GOLD_TINT_FILTER : undefined,
        ...styleProp,
      }}
    />
  );
}
