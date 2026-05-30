// Raw hex values — use for Tailwind JIT, Storybook, or non-CSS contexts.
// Mutalist Glow theme (brand pivot 2026-05-29): swung from bone trial
// (#e7e1d3 + Lotus #0a1117) to deep green-black + bioluminescent jade,
// pushing the brand surface away from the Warframe-community-app
// cyan/bone default into "infested dangerous" territory.
export const colorValues = {
  'bg-primary':     '#080a08',
  'bg-secondary':   '#13180f',
  'text-primary':   '#e3e8de',
  'text-muted':     '#959e8a',
  'border-default': '#252e23',
  'accent-gold':    '#dbb058',
  // Token name kept as 'accent-teal' through this trial period (was
  // Lotus cyan #00d4ff → bone #e7e1d3 → now jade #58e88a). Rename to
  // 'accent-jade' once the direction is locked.
  'accent-teal':    '#58e88a',
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
