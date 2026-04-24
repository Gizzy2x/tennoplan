import type { CSSProperties } from 'react';
import type { DesignTokens, TypographyRoleName, TypographyRole } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Primary helper — every text element in the app must use this
// ─────────────────────────────────────────────────────────────────────────────

export function getTypographyStyle(
  tokens: DesignTokens,
  role: TypographyRoleName,
  options?: {
    overrides?: Record<string, Partial<TypographyRole>>;
    overrideId?: string;
  }
): CSSProperties {
  const base = tokens.typography.roles[role];
  const scale = tokens.typography.bodyScaleMultiplier;
  const override =
    options?.overrideId && options?.overrides
      ? options.overrides[options.overrideId]
      : undefined;

  const merged: TypographyRole = { ...base, ...override };
  const scaledSize = (parseFloat(merged.size) * scale).toFixed(4);

  const style: CSSProperties = {
    fontFamily:    merged.fontFamily,
    fontSize:      `${scaledSize}rem`,
    fontWeight:    merged.weight,
    letterSpacing: merged.letterSpacing,
    textTransform: merged.textTransform,
  };

  if (merged.lineHeight !== undefined) style.lineHeight  = merged.lineHeight;
  if (merged.wordSpacing !== undefined) style.wordSpacing = merged.wordSpacing;
  if (merged.color)                    style.color       = merged.color;

  if (merged.transforms) {
    const { translateX, translateY, scale: s, rotate } = merged.transforms;
    const parts: string[] = [];
    if (translateX !== 0) parts.push(`translateX(${translateX}px)`);
    if (translateY !== 0) parts.push(`translateY(${translateY}px)`);
    if (s !== 1)          parts.push(`scale(${s})`);
    if (rotate !== 0)     parts.push(`rotate(${rotate}deg)`);
    if (parts.length)     style.transform = parts.join(' ');
  }

  return style;
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy typography factory — maps old call sites to new roles
// (kept for backward compat during page migration)
// ─────────────────────────────────────────────────────────────────────────────

export const typography = (tokens: DesignTokens) => ({
  hero:          (): CSSProperties => getTypographyStyle(tokens, 'hero'),
  tabTitle:      (): CSSProperties => getTypographyStyle(tokens, 'tabTitle'),
  sectionHeader: (): CSSProperties => getTypographyStyle(tokens, 'sectionHeader'),
  emphasis:      (): CSSProperties => getTypographyStyle(tokens, 'emphasis'),
  body:          (): CSSProperties => getTypographyStyle(tokens, 'body'),
  labelSmall:    (): CSSProperties => getTypographyStyle(tokens, 'labelSmall'),
  labelTiny:     (): CSSProperties => getTypographyStyle(tokens, 'labelTiny'),
  // legacy aliases used in existing pages
  labelMedium:   (): CSSProperties => getTypographyStyle(tokens, 'emphasis'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Panel & Layout utilities
// ─────────────────────────────────────────────────────────────────────────────

export const panelStyle = (tokens: DesignTokens, highlight = false): CSSProperties => ({
  background:   tokens.effects.glassBackground,
  border:       highlight ? tokens.borders.panelBorderHighlight : tokens.borders.panelBorderDefault,
  borderRadius: tokens.borders.radiusLarge,
});

export const panelHeaderStyle = (tokens: DesignTokens): CSSProperties => ({
  padding:      `${tokens.spacing.headerPaddingY} ${tokens.spacing.panelPaddingX}`,
  borderBottom: `${tokens.borders.headerBorderWidth} solid ${tokens.borders.headerBorderColor}`,
  display:      'flex',
  alignItems:   'center',
  gap:          parseInt(tokens.spacing.gapSmall),
});

export const panelBodyStyle = (tokens: DesignTokens): CSSProperties => ({
  padding: `${tokens.spacing.bodyPaddingY} ${tokens.spacing.bodyPaddingX}`,
});

export const panelLabelStyle = (tokens: DesignTokens): CSSProperties => ({
  ...getTypographyStyle(tokens, 'sectionHeader'),
  color: 'rgba(227,195,114,0.70)',
});

export const dataRowStyle = (tokens: DesignTokens): CSSProperties => ({
  display:       'flex',
  justifyContent: 'space-between',
  alignItems:    'center',
  padding:       `${tokens.spacing.gapTiny} 0`,
  borderBottom:  '1px solid rgba(255,255,255,0.04)',
});

export const dataRowLabelStyle = (tokens: DesignTokens): CSSProperties => ({
  ...getTypographyStyle(tokens, 'labelSmall'),
  color: 'rgba(198,198,199,0.45)',
});

export const dataRowValueStyle = (
  tokens: DesignTokens,
  accent = false
): CSSProperties => ({
  ...getTypographyStyle(tokens, 'emphasis'),
  color: accent ? tokens.colors.primary : 'rgba(198,198,199,0.70)',
});

export const sectionDividerStyle = (tokens: DesignTokens): CSSProperties => ({
  display:    'flex',
  alignItems: 'center',
  gap:        parseInt(tokens.spacing.gapMedium),
  margin:     `${tokens.spacing.xl} 0 ${tokens.spacing.lg}`,
});

export const sectionDividerLabelStyle = (tokens: DesignTokens): CSSProperties => ({
  ...getTypographyStyle(tokens, 'sectionHeader'),
  color:      'rgba(227,195,114,0.45)',
  whiteSpace: 'nowrap',
});

export const sectionDividerLineStyle = (_tokens: DesignTokens): CSSProperties => ({
  flex:       1,
  height:     1,
  background: 'rgba(227,195,114,0.08)',
});

// ─────────────────────────────────────────────────────────────────────────────
// Effect utilities
// ─────────────────────────────────────────────────────────────────────────────

export const goldGlowStyle = (tokens: DesignTokens): CSSProperties => ({
  boxShadow: tokens.effects.glowMedium,
});

export const goldGlowHeavyStyle = (tokens: DesignTokens): CSSProperties => ({
  boxShadow:   tokens.effects.glowLarge,
  borderColor: 'rgba(227,195,114,0.4)',
});

export const goldTextShadowStyle = (tokens: DesignTokens): CSSProperties => ({
  textShadow: tokens.effects.textShadowGold,
});

export const goldTextShadowHeavyStyle = (tokens: DesignTokens): CSSProperties => ({
  textShadow: tokens.effects.textShadowGoldHeavy,
});

export const ghostBorderStyle = (tokens: DesignTokens): CSSProperties => ({
  border: `${tokens.borders.ghostBorderWidth} solid ${tokens.borders.ghostBorderColor}`,
});

export const ghostBorderTopStyle = (tokens: DesignTokens): CSSProperties => ({
  borderTop: `${tokens.borders.ghostBorderWidth} solid ${tokens.borders.ghostBorderTopColor}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// Loading utilities
// ─────────────────────────────────────────────────────────────────────────────

export const pulseLoaderStyle = (tokens: DesignTokens): CSSProperties => ({
  display:    'flex',
  alignItems: 'center',
  gap:        parseInt(tokens.spacing.gapSmall),
  padding:    tokens.spacing.xl,
  color:      'rgba(198,198,199,0.40)',
});

export const pulseDotStyle = (tokens: DesignTokens): CSSProperties => ({
  width:        6,
  height:       6,
  borderRadius: '50%',
  background:   tokens.colors.primary,
  animation:    tokens.animations.pulseAnimation,
});

// ─────────────────────────────────────────────────────────────────────────────
// Spacer utilities
// ─────────────────────────────────────────────────────────────────────────────

export const spacerXs = (tokens: DesignTokens): CSSProperties => ({ padding: tokens.spacing.xs });
export const spacerSm = (tokens: DesignTokens): CSSProperties => ({ padding: tokens.spacing.sm });
export const spacerMd = (tokens: DesignTokens): CSSProperties => ({ padding: tokens.spacing.md });
export const spacerLg = (tokens: DesignTokens): CSSProperties => ({ padding: tokens.spacing.lg });

// ─────────────────────────────────────────────────────────────────────────────
// Convenience factory
// ─────────────────────────────────────────────────────────────────────────────

export const createTokenUtils = (tokens: DesignTokens) => ({
  typography:              typography(tokens),
  getTypographyStyle:      (role: TypographyRoleName, opts?: Parameters<typeof getTypographyStyle>[2]) =>
                             getTypographyStyle(tokens, role, opts),
  panelStyle:              (highlight?: boolean) => panelStyle(tokens, highlight),
  panelHeaderStyle:        () => panelHeaderStyle(tokens),
  panelBodyStyle:          () => panelBodyStyle(tokens),
  panelLabelStyle:         () => panelLabelStyle(tokens),
  dataRowStyle:            () => dataRowStyle(tokens),
  dataRowLabelStyle:       () => dataRowLabelStyle(tokens),
  dataRowValueStyle:       (accent?: boolean) => dataRowValueStyle(tokens, accent),
  sectionDividerStyle:     () => sectionDividerStyle(tokens),
  sectionDividerLabelStyle:() => sectionDividerLabelStyle(tokens),
  sectionDividerLineStyle: () => sectionDividerLineStyle(tokens),
  goldGlowStyle:           () => goldGlowStyle(tokens),
  goldGlowHeavyStyle:      () => goldGlowHeavyStyle(tokens),
  goldTextShadowStyle:     () => goldTextShadowStyle(tokens),
  goldTextShadowHeavyStyle:() => goldTextShadowHeavyStyle(tokens),
  ghostBorderStyle:        () => ghostBorderStyle(tokens),
  ghostBorderTopStyle:     () => ghostBorderTopStyle(tokens),
  pulseLoaderStyle:        () => pulseLoaderStyle(tokens),
  pulseDotStyle:           () => pulseDotStyle(tokens),
});
