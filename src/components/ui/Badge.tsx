import type { CSSProperties, ReactNode } from 'react';

const sizeMap = {
  xs: { fontSize: '0.5rem',   padding: '2px 6px',  letterSpacing: '0.12em' },
  sm: { fontSize: '0.625rem', padding: '3px 8px',  letterSpacing: '0.14em' },
  md: { fontSize: '0.75rem',  padding: '4px 10px', letterSpacing: '0.10em' },
} as const;

interface BadgeProps {
  children: ReactNode;
  /** Border + text color */
  color?: string;
  /** 'outline' = transparent bg; 'tint' = semi-transparent bg fill */
  variant?: 'outline' | 'tint';
  size?: keyof typeof sizeMap;
  className?: string;
  style?: CSSProperties;
}

export function Badge({
  children,
  color = 'var(--color-accent-gold)',
  variant = 'outline',
  size = 'sm',
  className = '',
  style,
}: BadgeProps) {
  const { fontSize, padding, letterSpacing } = sizeMap[size];

  return (
    <span
      className={className}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '4px',
        fontFamily:     'var(--font-sans)',
        fontSize,
        fontWeight:     700,
        letterSpacing,
        textTransform:  'uppercase',
        lineHeight:     1,
        padding,
        color,
        border:         `1px solid ${color}45`,
        background:     variant === 'tint' ? `${color}12` : 'transparent',
        whiteSpace:     'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
