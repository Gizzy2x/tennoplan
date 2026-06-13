/**
 * ResourceTag — universal clickable Warframe resource/item component.
 *
 * Used everywhere resources, items, mods, or warframe entities appear.
 * Hover reveals a "View" hint. Click opens a Codex tooltip (wiki integration
 * is a future feature — placeholder shows until Tenno Codex is built).
 *
 * Icon resolution: looks up the item by name in the build-time items-map,
 * falls back to a placeholder glyph if not found.
 *
 * Sizes:
 *   'md' — card-style: stacked icon + name + source (hero, resource panels)
 *   'sm' — inline: small icon + name in a row (bounty reward lists)
 */

import { useState, useEffect, useRef } from 'react';
import { ItemIcon } from './ItemIcon';
import { findByName } from '@/adapters/items/codexCatalog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResourceTagProps {
  /** Display name — also used for icon lookup */
  name: string;
  /** Override imageName if already known (skips adapter lookup) */
  imageName?: string;
  /** Where this resource is obtained */
  source?: string;
  /** Drop chance as 0–100 percentage */
  chance?: number;
  /** Rarity tier string from drop data */
  rarity?: string;
  /** 'md' = card layout, 'sm' = compact inline row */
  size?: 'sm' | 'md';
  /** Whether clicking opens the Codex tooltip. Default: true */
  interactive?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'rare':      return 'rgba(219, 176, 88, 0.90)';
    case 'uncommon':  return 'rgba(186, 195, 254, 0.80)';
    case 'common':    return 'rgba(168, 165, 160, 0.65)';
    default:          return 'rgba(168, 165, 160, 0.45)';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResourceTag({
  name,
  imageName: imageNameProp,
  source,
  chance,
  rarity,
  size = 'md',
  interactive = true,
}: ResourceTagProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Resolve icon: explicit imageName prop → codex/items-map by name → placeholder.
  // Render by uniqueName so ItemIcon runs its own codex→items-map→placeholder chain.
  const codexItem  = imageNameProp ? undefined : findByName(name);
  const iconUnique = codexItem?.uniqueName;
  const iconPx     = size === 'sm' ? 20 : 32;

  const renderIcon = (px: number, style?: React.CSSProperties) =>
    imageNameProp ? <ItemIcon imageName={imageNameProp} name={name} size={px} style={style} />
    : iconUnique  ? <ItemIcon uniqueName={iconUnique} name={name} size={px} style={style} />
    : null;

  // Close tooltip on click outside
  useEffect(() => {
    if (!tooltipOpen) return;
    function onOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [tooltipOpen]);

  const handleClick = interactive
    ? (e: React.MouseEvent) => { e.stopPropagation(); setTooltipOpen(v => !v); }
    : undefined;

  return (
    <div
      ref={wrapperRef}
      className="resource-tag"
      data-interactive={interactive || undefined}
      onClick={handleClick}
    >
      {/* ── Icon ────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {renderIcon(iconPx, { opacity: 0.90 }) ?? (
          <div style={{
            width:          iconPx,
            height:         iconPx,
            background:     'rgba(219, 176, 88, 0.06)',
            border:         '1px solid rgba(219, 176, 88, 0.14)',
            borderRadius:   'var(--radius-sm)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       size === 'sm' ? '0.65rem' : '0.85rem',
            color:          'rgba(219, 176, 88, 0.35)',
            flexShrink:     0,
          }}>
            ◆
          </div>
        )}

        {/* ── Codex Tooltip ─────────────────────────────────────────────── */}
        {interactive && tooltipOpen && (
          <div className="resource-tag-tooltip">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {renderIcon(28)}
              <div>
                <div style={{
                  fontFamily:    'var(--font-sans)',
                  fontSize:      '0.75rem',
                  fontWeight:    700,
                  color:         'var(--color-text-primary)',
                  lineHeight:    1.2,
                }}>
                  {name}
                </div>
                {rarity && (
                  <div style={{
                    fontFamily:    'var(--font-sans)',
                    fontSize:      '0.48rem',
                    fontWeight:    700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         rarityColor(rarity),
                    marginTop:     2,
                  }}>
                    {rarity}
                  </div>
                )}
              </div>
            </div>

            {/* Source */}
            {source && (
              <div style={{
                fontFamily:  'var(--font-sans)',
                fontSize:    '0.58rem',
                color:       'var(--color-text-muted)',
                marginBottom: 4,
              }}>
                {source}
              </div>
            )}

            {/* Drop chance */}
            {chance !== undefined && (
              <div style={{
                fontFamily:    'var(--font-sans)',
                fontSize:      '0.58rem',
                fontWeight:    700,
                color:         chance >= 20
                  ? 'var(--color-accent-gold)'
                  : 'rgba(219, 176, 88, 0.55)',
                marginBottom:  4,
              }}>
                {chance.toFixed(2)}% drop chance
              </div>
            )}

            {/* Wiki placeholder */}
            <div style={{
              fontFamily:   'var(--font-sans)',
              fontSize:     '0.52rem',
              color:        'rgba(168, 165, 160, 0.40)',
              fontStyle:    'italic',
              borderTop:    '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop:   8,
              marginTop:    8,
              lineHeight:   1.55,
            }}>
              Tenno Codex integration coming soon.
            </div>

            <button className="resource-tag-codex-btn" disabled>
              OPEN CODEX →
            </button>
          </div>
        )}
      </div>

      {/* ── Label area ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div style={{
          fontFamily:   'var(--font-sans)',
          fontSize:     size === 'sm' ? '0.58rem' : '0.65rem',
          fontWeight:   600,
          color:        'var(--color-text-primary)',
          letterSpacing: '0.02em',
          lineHeight:   1.2,
          whiteSpace:   size === 'sm' ? 'nowrap' : undefined,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {name}
        </div>

        {/* Source — only in md (card) mode */}
        {source && size === 'md' && (
          <div style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      '0.48rem',
            fontWeight:    700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color:         'var(--color-text-muted)',
            opacity:       0.60,
            lineHeight:    1.3,
          }}>
            {source}
          </div>
        )}

        {/* Drop chance — only in sm (inline) mode */}
        {chance !== undefined && size === 'sm' && (
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize:   '0.48rem',
            fontWeight: 700,
            color:      chance >= 20
              ? 'var(--color-accent-gold)'
              : 'rgba(219, 176, 88, 0.48)',
            lineHeight: 1,
          }}>
            {chance.toFixed(1)}%
          </div>
        )}
      </div>

      {/* ── Hover hint ──────────────────────────────────────────────────── */}
      {interactive && (
        <span className="resource-tag-hint">View</span>
      )}
    </div>
  );
}
