// Minimal depth shadows only — no decorative glow
export const shadows = {
  sm: 'var(--shadow-sm)', // 0 2px 4px  rgba(0,0,0,0.4) — cards, panels
  md: 'var(--shadow-md)', // 0 8px 16px rgba(0,0,0,0.6) — modals, emphasis
} as const;

export type ShadowKey = keyof typeof shadows;
