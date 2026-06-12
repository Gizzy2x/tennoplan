/**
 * ItemIcon — renders a Warframe item icon.
 *
 * Usage:
 *   <ItemIcon imageName="ash-f2c6f3ab3f.png" name="Ash" size="md" />
 *   <ItemIcon item={warframeItem} size={48} />
 *   <ItemIcon uniqueName="/Lotus/Powersuits/Ninja/Ninja" name="Ash" />
 *
 * Resolution order:
 *   1. item.imageName / imageName / uniqueName → CDN URL
 *   2. iconBlobCache: Cache API hit (instant after first load)
 *   3. iconBlobCache: CDN fetch + persist to Cache API
 *   4. /lotus-placeholder.svg on network failure
 *
 * Icons are fetched once and cached to the Cache API so subsequent renders
 * (and app restarts) serve from local storage — fully offline after first sync.
 */

import { type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { getIconUrl, getIconUrlByItem } from '@/lib/icons/IconResolver';
import { findByUniqueName } from '@/adapters/items/itemsAdapter';
import { getCodexIconUrl } from '@/adapters/items/dropResolverAdapter';
import { SYNTHETIC_ICON_URLS } from '@/lib/icons/syntheticIcons';
import { useIconBlobUrl, PLACEHOLDER } from '@/lib/icons/iconBlobCache';
import type { WarframeItem } from '@/core/domain/items';

// ─── Size presets ────────────────────────────────────────────────────────────
// Presets render as `var(--icon-size-<preset>, <px>px)` so a wrapper can
// re-densify every icon inside it by overriding one token (index.css :root
// holds the defaults). The px values double as the <img> width/height
// attributes (pre-CSS layout hint) and the var() fallback.

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

// ─── CDN URL resolution (sync, from bundled items-map.json) ──────────────────

function resolveCdnUrl(
  props: Pick<ItemIconProps, 'item' | 'imageName' | 'uniqueName'>,
): string {
  if ('item' in props && props.item) {
    const syn = SYNTHETIC_ICON_URLS[props.item.uniqueName];
    if (syn) return syn;
    // Codex carries icons for component parts items-map lacks (e.g. Gara Chassis).
    const codex = getCodexIconUrl(props.item.uniqueName);
    if (codex) return codex;
    return props.item.imageName ? getIconUrlByItem(props.item) : '/lotus-placeholder.svg';
  }
  if ('imageName' in props && props.imageName) {
    return props.imageName.trim() ? getIconUrl(props.imageName) : '/lotus-placeholder.svg';
  }
  if ('uniqueName' in props && props.uniqueName) {
    const syn = SYNTHETIC_ICON_URLS[props.uniqueName];
    if (syn) return syn;
    const codex = getCodexIconUrl(props.uniqueName);
    if (codex) return codex;
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
  const px = typeof size === 'number' ? size : SIZE_MAP[size as SizePreset] ?? 48;
  const cssSize: string | number =
    typeof size === 'string' && size in SIZE_MAP
      ? `var(--icon-size-${size}, ${px}px)`
      : px;

  const cdnUrl = resolveCdnUrl(
    { item, imageName, uniqueName } as Parameters<typeof resolveCdnUrl>[0],
  );

  // Only REMOTE (CDN) URLs go through the blob cache — in Tauri that path uses
  // Rust reqwest (CORS-free), which can't fetch bundled/local asset URLs. Local
  // assets (synthetic currency icons, the placeholder) render directly in the
  // webview <img>, exactly as the codex quick-look does.
  const isRemote = /^https?:\/\//i.test(cdnUrl);

  // Hook must run unconditionally — feed it the placeholder for local assets.
  const blobUrl = useIconBlobUrl(isRemote ? cdnUrl : PLACEHOLDER);
  const src = isRemote ? blobUrl : cdnUrl;

  const isPlaceholder = src === PLACEHOLDER;

  return (
    <img
      src={src}
      alt={name ?? item?.name ?? 'Warframe item'}
      width={px}
      height={px}
      decoding="async"
      className={cn('object-contain shrink-0', className)}
      style={{
        width:  cssSize,
        height: cssSize,
        // In a flex parent, `min-width: auto` could floor a replaced element
        // at an intrinsic minimum and beat a smaller token/100% clamp — pin
        // to 0 so the CSS size is authoritative (shrink-0 still prevents
        // unintended flex compression).
        minWidth:  0,
        minHeight: 0,
        filter: tint && !isPlaceholder ? GOLD_TINT_FILTER : undefined,
        ...styleProp,
      }}
    />
  );
}
