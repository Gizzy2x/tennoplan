import type { CSSProperties, ReactNode } from 'react';

const gapMap = {
  sm: 'var(--space-lg)',   // 16px
  md: 'var(--space-xl)',   // 24px — default
  lg: 'var(--space-2xl)',  // 32px
} as const;

interface SectionProps {
  /** Serif h2 title — gold */
  title?: string;
  /** Muted subtitle below title */
  subtitle?: string;
  children: ReactNode;
  /** Gap between title block and children */
  gap?: keyof typeof gapMap;
  className?: string;
  style?: CSSProperties;
}

export function Section({
  title,
  subtitle,
  children,
  gap = 'md',
  className = '',
  style,
}: SectionProps) {
  return (
    <section
      className={className}
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           gapMap[gap],
        ...style,
      }}
    >
      {(title || subtitle) && (
        <div>
          {title && (
            <h2
              style={{
                fontFamily:  'var(--font-serif)',
                fontSize:    'var(--font-size-2xl)',
                fontWeight:  700,
                lineHeight:  1.2,
                color:       'var(--color-accent-gold)',
                margin:      0,
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize:   'var(--font-size-sm)',
                fontWeight: 400,
                lineHeight: 1.5,
                color:      'var(--color-text-muted)',
                margin:     'var(--space-xs) 0 0',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
