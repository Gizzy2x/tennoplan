// Raw values — use for Tailwind JIT or non-CSS contexts
export const spacingValues = {
  xs:   '4px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  '2xl':'32px',
  '3xl':'48px',
  '4xl':'64px',
} as const;

// CSS variable references — use in React inline styles or component style maps
export const spacing = {
  xs:   'var(--space-xs)',
  sm:   'var(--space-sm)',
  md:   'var(--space-md)',
  lg:   'var(--space-lg)',
  xl:   'var(--space-xl)',
  '2xl':'var(--space-2xl)',
  '3xl':'var(--space-3xl)',
  '4xl':'var(--space-4xl)',
} as const;

export type SpacingKey = keyof typeof spacing;
