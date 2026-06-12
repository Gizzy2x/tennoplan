/**
 * ItemTile — the app's UNIFORM item/resource holder.
 *
 * THE RULE (per design direction): every item or resource rendered outside a
 * header / badge / art-image / persistent-header uses THIS component. One holder,
 * one place to restyle — change it here and every item display in the app changes
 * (bounty rewards, vendor wares, Cred shop, drop rows, …). Patterns over one-offs,
 * so skins later are trivial.
 *
 * - Large, image-forward icon in a uniform box (the box holds the image ONLY).
 * - Tags (rotation A/B/C, cycle day/night, …) sit OUTSIDE the box, above it.
 * - Click opens the app-wide "more info" window — the existing quick-look sheet
 *   (description · what it's part of · drop rates · "Open full entry → codex").
 *
 * Percentages/standing/cost are intentionally NOT shown on the tile — they live
 * in the info window, which is the single detail surface across the app.
 */

import { memo, useMemo } from 'react';
import { ItemIcon } from './ItemIcon';
import { findByName } from '@/adapters/items/itemsAdapter';
import { useQuickLook, type QuickLookContext } from '@/store/quickLook';
import styles from './ItemTile.module.css';

export type ItemTileTone = 'A' | 'B' | 'C' | 'day' | 'night' | 'warm' | 'cold' | 'rare' | 'muted';
export interface ItemTag {
  label: string;
  tone?: ItemTileTone;
}

export interface ItemTileProps {
  /** Display name (also the icon alt + info-window resolution fallback). */
  name: string;
  /** Codex identity — preferred icon source and what the info window opens. */
  uniqueName?: string;
  /** Explicit image fallback when there's no resolved uniqueName. */
  imageName?: string;
  /** Tags rendered OUTSIDE the box (e.g. rotation A/B/C, cycle day/night). */
  tags?: ItemTag[];
  /** Explicit icon px size. When omitted (preferred), the icon reads the
   *  global `--item-tile-icon` token (64px), clamped to the tile box, so a
   *  wrapper can re-densify every tile by overriding one CSS variable. */
  size?: number;
  /** Optional rarity tint on the box border. */
  rarity?: 'rare' | 'uncommon' | 'common' | 'unknown';
  /** Source-specific drop context surfaced in the info window (e.g. this
   *  bounty's per-stage %). Passed straight to the quick-look. */
  context?: QuickLookContext;
  /** Override the click. Default opens the app-wide quick-look info window. */
  onOpen?: () => void;
}

export const ItemTile = memo(function ItemTile({
  name, uniqueName, imageName, tags, size, rarity, context, onOpen,
}: ItemTileProps) {
  const openQuickLook = useQuickLook((s) => s.open);

  // Default path: token-driven, never larger than the (fluid) tile box.
  // An explicit numeric `size` prop opts out and pins literal px.
  const iconCss = size ?? 'min(var(--item-tile-icon, 64px), 100%)';
  const iconStyle = typeof iconCss === 'string'
    ? { width: iconCss, height: iconCss }
    : undefined;

  // Resolve an icon source: uniqueName preferred, then explicit imageName, then
  // a name lookup (covers currencies/components the name-only map missed).
  const nameFallback = useMemo(
    () => (uniqueName || imageName ? undefined : findByName(name)),
    [uniqueName, imageName, name],
  );

  const linkable = Boolean(uniqueName) || Boolean(onOpen);
  const handle = () => {
    if (onOpen) { onOpen(); return; }
    if (uniqueName) openQuickLook(uniqueName, name, context);
  };

  return (
    <div className={styles.wrap}>
      {tags && tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((t, i) => (
            <span key={`${t.label}-${i}`} className={styles.tag} data-tone={t.tone ?? 'muted'}>{t.label}</span>
          ))}
        </div>
      )}

      <button
        type="button"
        className={styles.box}
        data-link={linkable || undefined}
        data-rarity={rarity}
        title={name}
        aria-label={linkable ? `${name} — more info` : name}
        onClick={handle}
        disabled={!linkable}
      >
        {uniqueName ? (
          <ItemIcon uniqueName={uniqueName} name={name} size={size ?? 64} style={iconStyle} />
        ) : imageName ? (
          <ItemIcon imageName={imageName} name={name} size={size ?? 64} style={iconStyle} />
        ) : nameFallback?.imageName ? (
          <ItemIcon imageName={nameFallback.imageName} name={name} size={size ?? 64} style={iconStyle} />
        ) : (
          <span className={styles.placeholder} style={{ width: iconCss, height: iconCss }} />
        )}
      </button>

      <span className={styles.name}>{name}</span>
    </div>
  );
});
