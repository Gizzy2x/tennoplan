// Raw hex values — use for Tailwind JIT, Storybook, or non-CSS contexts
export const colorValues = {
  'bg-primary':     '#0a1117',
  'bg-secondary':   '#161b22',
  'text-primary':   '#e5e2e1',
  'text-muted':     '#a8a5a0',
  'border-default': '#2d333b',
  'accent-gold':    '#e3c372',
  'accent-teal':    '#00d4ff',
} as const;

// CSS variable references — use in React inline styles or component style maps
export const colors = {
  bgPrimary:     'var(--color-bg-primary)',
  bgSecondary:   'var(--color-bg-secondary)',
  textPrimary:   'var(--color-text-primary)',
  textMuted:     'var(--color-text-muted)',
  borderDefault: 'var(--color-border-default)',
  accentGold:    'var(--color-accent-gold)',
  accentTeal:    'var(--color-accent-teal)',
} as const;

export type ColorKey = keyof typeof colors;
