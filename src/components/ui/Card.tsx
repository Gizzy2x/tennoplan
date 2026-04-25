import type { CSSProperties, ReactNode } from 'react';

const paddingMap = {
  sm: 'var(--space-sm)',   //  8px — dense / icon-heavy cards
  md: 'var(--space-lg)',   // 16px — default
  lg: 'var(--space-xl)',   // 24px — spacious
} as const;

const borderMap = {
  default: '1px solid var(--color-border-default)',
  gold:    '1px solid rgba(227, 195, 114, 0.25)',
} as const;

interface CardProps {
  children: ReactNode;
  /** Internal padding */
  size?: keyof typeof paddingMap;
  /** Border style */
  variant?: keyof typeof borderMap;
  /** Adds hover border-brighten + shadow lift */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Card({
  children,
  size = 'md',
  variant = 'default',
  interactive = false,
  className = '',
  style,
}: CardProps) {
  return (
    <div
      className={className}
      data-interactive={interactive || undefined}
      style={{
        background:   'var(--color-bg-secondary)',
        border:       borderMap[variant],
        borderRadius: 'var(--radius-card)',
        boxShadow:    'var(--shadow-sm)',
        padding:      paddingMap[size],
        transition:   interactive ? 'border-color 150ms ease-out, box-shadow 150ms ease-out' : undefined,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(227, 195, 114, 0.35)';
        el.style.boxShadow   = 'var(--shadow-md)';
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '';
        el.style.boxShadow   = 'var(--shadow-sm)';
      } : undefined}
    >
      {children}
    </div>
  );
}
