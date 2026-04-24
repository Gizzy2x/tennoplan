// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens — Single source of truth for all UI values
// Phase 3.5: Semantic typography roles + multi-mode support
// ─────────────────────────────────────────────────────────────────────────────

// ── Typography role types ──────────────────────────────────────────────────

export type TypographyRoleName =
  | 'hero'
  | 'tabTitle'
  | 'sectionHeader'
  | 'emphasis'
  | 'body'
  | 'labelSmall'
  | 'labelTiny';

export type CSSTextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export interface TypographyRole {
  fontFamily: string;
  size: string;           // rem value, e.g. '2.6rem'
  weight: number;         // 100–900
  letterSpacing: string;  // em value, e.g. '0.06em'
  textTransform: CSSTextTransform;
  lineHeight?: number;    // unitless, e.g. 1.5
  wordSpacing?: string;   // e.g. '0.05em' or 'normal'
  color?: string;         // optional hex override
  transforms?: {
    translateX: number;   // px
    translateY: number;   // px
    scale: number;        // unitless multiplier, default 1
    rotate: number;       // degrees
  };
}

export type TypographyRoles = Record<TypographyRoleName, TypographyRole>;

export const TYPOGRAPHY_ROLE_MAP: TypographyRoleName[] = [
  'hero',
  'tabTitle',
  'sectionHeader',
  'emphasis',
  'body',
  'labelSmall',
  'labelTiny',
];

export const FONT_FAMILY_OPTIONS: Record<string, string> = {
  'Noto Serif': '"Noto Serif", Georgia, serif',
  'Noto Sans':  '"Noto Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  'Noto Mono':  '"Noto Mono", "Courier New", monospace',
};

// ── 7 canonical semantic roles ────────────────────────────────────────────
export const defaultTypographyRoles: TypographyRoles = {
  hero: {
    fontFamily:    '"Noto Serif", Georgia, serif',
    size:          '2.6rem',
    weight:        700,
    letterSpacing: '0.06em',
    textTransform: 'none',
    lineHeight:    1.1,
  },
  tabTitle: {
    fontFamily:    '"Noto Serif", Georgia, serif',
    size:          '0.92rem',
    weight:        700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    lineHeight:    1.2,
  },
  sectionHeader: {
    fontFamily:    '"Noto Serif", Georgia, serif',
    size:          '0.8125rem',
    weight:        700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    lineHeight:    1.3,
  },
  emphasis: {
    fontFamily:    '"Noto Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    size:          '0.875rem',
    weight:        600,
    letterSpacing: '0.04em',
    textTransform: 'none',
    lineHeight:    1.4,
  },
  body: {
    fontFamily:    '"Noto Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    size:          '0.8125rem',
    weight:        400,
    letterSpacing: '0.00em',
    textTransform: 'none',
    lineHeight:    1.5,
  },
  labelSmall: {
    fontFamily:    '"Noto Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    size:          '0.6875rem',
    weight:        700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    lineHeight:    1.3,
  },
  labelTiny: {
    fontFamily:    '"Noto Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    size:          '0.625rem',
    weight:        700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    lineHeight:    1.3,
  },
};

// ── Design token interface ────────────────────────────────────────────────

export interface DesignTokens {
  colors: {
    // Surfaces
    surfaceDim: string;
    surface: string;
    surfaceBright: string;
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    surfaceVariant: string;
    surfaceTint: string;
    background: string;

    // Primary (Gold)
    primary: string;
    primaryContainer: string;
    primaryFixed: string;
    primaryFixedDim: string;
    inversePrimary: string;
    onPrimary: string;
    onPrimaryContainer: string;
    onPrimaryFixed: string;
    onPrimaryFixedVariant: string;

    // Secondary (Silver)
    secondary: string;
    secondaryContainer: string;
    secondaryFixed: string;
    secondaryFixedDim: string;
    onSecondary: string;
    onSecondaryContainer: string;
    onSecondaryFixed: string;
    onSecondaryFixedVariant: string;

    // Tertiary (Blue)
    tertiary: string;
    tertiaryContainer: string;
    tertiaryFixed: string;
    tertiaryFixedDim: string;
    onTertiary: string;
    onTertiaryContainer: string;
    onTertiaryFixed: string;
    onTertiaryFixedVariant: string;

    // Text
    onSurface: string;
    onSurfaceVariant: string;
    onBackground: string;
    inverseSurface: string;
    inverseOnSurface: string;

    // Error
    error: string;
    errorContainer: string;
    onError: string;
    onErrorContainer: string;

    // Outline
    outline: string;
    outlineVariant: string;

    // Success
    success: string;
  };

  typography: {
    roles: TypographyRoles;
    roleMap: TypographyRoleName[];
    bodyScaleMultiplier: number;      // 0.5–2.0, default 1.0
    fontFamilyOptions: Record<string, string>;
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;

    panelPaddingX: string;
    panelPaddingY: string;
    headerPaddingY: string;
    bodyPaddingX: string;
    bodyPaddingY: string;

    gapTiny: string;
    gapSmall: string;
    gapMedium: string;
    gapLarge: string;
  };

  borders: {
    radiusTiny: string;
    radiusSmall: string;
    radiusMedium: string;
    radiusLarge: string;

    panelBorderWidth: string;
    panelBorderDefault: string;
    panelBorderHighlight: string;
    headerBorderWidth: string;
    headerBorderColor: string;

    ghostBorderWidth: string;
    ghostBorderColor: string;
    ghostBorderTopColor: string;
  };

  effects: {
    shadowSmall: string;
    shadowMedium: string;
    shadowLarge: string;
    shadowVignette: string;
    shadowPanel: string;

    textShadowGold: string;
    textShadowGoldHeavy: string;

    glowSmall: string;
    glowMedium: string;
    glowLarge: string;

    glassBackground: string;
    glassBackgroundDark: string;
    glassBackgroundAlternate: string;
  };

  animations: {
    transitionFast: string;
    transitionNormal: string;
    transitionSlow: string;
    pulseAnimation: string;
    rippleAnimation: string;
  };
}

// ── Default tokens (Orokin Default mode) ─────────────────────────────────

export const defaultTokens: DesignTokens = {
  colors: {
    surfaceDim:               '#131313',
    surface:                  '#131313',
    surfaceBright:            '#3a3939',
    surfaceContainerLowest:   '#0e0e0e',
    surfaceContainerLow:      '#1c1b1b',
    surfaceContainer:         '#201f1f',
    surfaceContainerHigh:     '#2a2a2a',
    surfaceContainerHighest:  '#353534',
    surfaceVariant:           '#353534',
    surfaceTint:              '#e3c372',
    background:               '#131313',

    primary:                  '#e3c372',
    primaryContainer:         '#c1a355',
    primaryFixed:             '#ffdf92',
    primaryFixedDim:          '#e3c372',
    inversePrimary:           '#735b13',
    onPrimary:                '#3e2e00',
    onPrimaryContainer:       '#4b3900',
    onPrimaryFixed:           '#241a00',
    onPrimaryFixedVariant:    '#594400',

    secondary:                '#c6c6c7',
    secondaryContainer:       '#454747',
    secondaryFixed:           '#e2e2e2',
    secondaryFixedDim:        '#c6c6c7',
    onSecondary:              '#2f3131',
    onSecondaryContainer:     '#b4b5b5',
    onSecondaryFixed:         '#1a1c1c',
    onSecondaryFixedVariant:  '#454747',

    tertiary:                 '#bac3fe',
    tertiaryContainer:        '#9aa3dc',
    tertiaryFixed:            '#dee0ff',
    tertiaryFixedDim:         '#bac3fe',
    onTertiary:               '#232c5e',
    onTertiaryContainer:      '#2f386a',
    onTertiaryFixed:          '#0c1648',
    onTertiaryFixedVariant:   '#3a4376',

    onSurface:                '#e5e2e1',
    onSurfaceVariant:         '#cfc5b3',
    onBackground:             '#e5e2e1',
    inverseSurface:           '#e5e2e1',
    inverseOnSurface:         '#313030',

    error:                    '#ffb4ab',
    errorContainer:           '#93000a',
    onError:                  '#690005',
    onErrorContainer:         '#ffdad6',

    outline:                  '#98907f',
    outlineVariant:           '#4d4638',

    success:                  '#4ade80',
  },

  typography: {
    roles:               defaultTypographyRoles,
    roleMap:             TYPOGRAPHY_ROLE_MAP,
    bodyScaleMultiplier: 1.0,
    fontFamilyOptions:   FONT_FAMILY_OPTIONS,
  },

  spacing: {
    xs:  '4px',
    sm:  '8px',
    md:  '12px',
    lg:  '16px',
    xl:  '24px',
    xxl: '32px',

    panelPaddingX:  '12px',
    panelPaddingY:  '6px',
    headerPaddingY: '6px',
    bodyPaddingX:   '12px',
    bodyPaddingY:   '10px',

    gapTiny:   '6px',
    gapSmall:  '10px',
    gapMedium: '12px',
    gapLarge:  '16px',
  },

  borders: {
    radiusTiny:   '1px',
    radiusSmall:  '2px',
    radiusMedium: '3px',
    radiusLarge:  '4px',

    panelBorderWidth:     '1px',
    panelBorderDefault:   '1px solid rgba(227,195,114,0.15)',
    panelBorderHighlight: '1px solid rgba(227,195,114,0.35)',
    headerBorderWidth:    '1px',
    headerBorderColor:    'rgba(227,195,114,0.15)',

    ghostBorderWidth:    '1px',
    ghostBorderColor:    'rgba(77,70,56,0.2)',
    ghostBorderTopColor: 'rgba(77,70,56,0.2)',
  },

  effects: {
    shadowSmall:   '0 2px 6px rgba(0,0,0,0.35)',
    shadowMedium:  '0 0 20px rgba(227,195,114,0.1)',
    shadowLarge:   '0 8px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.3)',
    shadowVignette: '0 0 40px rgba(0,0,0,0.5)',
    shadowPanel:   '0 -2px 6px rgba(0,0,0,0.35)',

    textShadowGold:      '0 0 4px rgba(227,195,114,0.5), 0 2px 3px rgba(0,0,0,0.8)',
    textShadowGoldHeavy: '0 0 8px rgba(227,195,114,0.6), 0 0 16px rgba(227,195,114,0.3)',

    glowSmall:  '0 0 20px rgba(227,195,114,0.1)',
    glowMedium: '0 0 30px rgba(227,195,114,0.2)',
    glowLarge:  '0 0 40px rgba(227,195,114,0.25)',

    glassBackground:          'rgba(28,27,27,0.6)',
    glassBackgroundDark:      'rgba(10,20,26,0.97)',
    glassBackgroundAlternate: 'rgba(227,195,114,0.3)',
  },

  animations: {
    transitionFast:   '0.15s',
    transitionNormal: '0.3s',
    transitionSlow:   '0.5s',
    pulseAnimation:   'pulse 1.5s ease-in-out infinite',
    rippleAnimation:  'ripple 2s infinite',
  },
};

// ── Compact preset mode ───────────────────────────────────────────────────

export const compactTokens: DesignTokens = {
  ...defaultTokens,
  typography: {
    ...defaultTokens.typography,
    bodyScaleMultiplier: 0.85,
  },
  spacing: {
    xs:  '3px',
    sm:  '6px',
    md:  '9px',
    lg:  '12px',
    xl:  '18px',
    xxl: '24px',

    panelPaddingX:  '10px',
    panelPaddingY:  '5px',
    headerPaddingY: '5px',
    bodyPaddingX:   '10px',
    bodyPaddingY:   '9px',

    gapTiny:   '4px',
    gapSmall:  '7px',
    gapMedium: '9px',
    gapLarge:  '12px',
  },
};
