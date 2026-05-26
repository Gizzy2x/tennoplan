// Font families
export const fontFamily = {
  serif: 'var(--font-serif)',
  sans:  'var(--font-sans)',
} as const;

// Mechanical size tokens — separated so components can mix/match
export const fontSize = {
  '3xl': 'var(--font-size-3xl)', // 3.2rem  — h1 / display
  '2xl': 'var(--font-size-2xl)', // 2.4rem  — h2
  xl:    'var(--font-size-xl)',   // 1.8rem  — h3
  lg:    'var(--font-size-lg)',   // 1.4rem  — h4
  md:    'var(--font-size-md)',   // 1rem    — body
  sm:    'var(--font-size-sm)',   // 0.875rem — label
  xs:    'var(--font-size-xs)',   // 0.75rem  — caption
} as const;

export const fontWeight = {
  light:   'var(--font-weight-light)',   // 300
  regular: 'var(--font-weight-regular)', // 400
  bold:    'var(--font-weight-bold)',    // 700
} as const;

export const lineHeight = {
  tight:    'var(--line-height-tight)',    // 1.2 — large headings
  balanced: 'var(--line-height-balanced)', // 1.5 — body
  relaxed:  'var(--line-height-relaxed)',  // 1.4 — small labels
} as const;

// Composed role tokens — convenience objects for common type patterns.
// Components can spread these directly: style={{ ...fontRoles.h2 }}
export const fontRoles = {
  h1: {
    fontFamily:  'var(--font-serif)',
    fontSize:    'var(--font-size-3xl)',
    fontWeight:  700,
    lineHeight:  1.2,
  },
  h2: {
    fontFamily:  'var(--font-serif)',
    fontSize:    'var(--font-size-2xl)',
    fontWeight:  700,
    lineHeight:  1.2,
  },
  h3: {
    fontFamily:  'var(--font-serif)',
    fontSize:    'var(--font-size-xl)',
    fontWeight:  700,
    lineHeight:  1.5,
  },
  h4: {
    fontFamily:  'var(--font-sans)',
    fontSize:    'var(--font-size-lg)',
    fontWeight:  700,
    lineHeight:  1.5,
  },
  body: {
    fontFamily:  'var(--font-sans)',
    fontSize:    'var(--font-size-md)',
    fontWeight:  400,
    lineHeight:  1.5,
  },
  label: {
    fontFamily:  'var(--font-sans)',
    fontSize:    'var(--font-size-sm)',
    fontWeight:  400,
    lineHeight:  1.4,
  },
  caption: {
    fontFamily:  'var(--font-sans)',
    fontSize:    'var(--font-size-xs)',
    fontWeight:  400,
    lineHeight:  1.4,
  },
} as const;

export type FontRoleKey = keyof typeof fontRoles;
