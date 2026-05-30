import type { CSSProperties } from 'react';

interface DividerProps {
  /** Optional centered label */
  label?: string;
  /** 'gold' = fading gold gradient line; 'subtle' = solid border-default */
  variant?: 'gold' | 'subtle';
  className?: string;
  style?: CSSProperties;
}

export function Divider({ label, variant = 'gold', className = '', style }: DividerProps) {
  const lineStyle: CSSProperties =
    variant === 'gold'
      ? {
          flex:       1,
          height:     '1px',
          background: 'linear-gradient(90deg, transparent, rgba(219, 176, 88,0.25), transparent)',
        }
      : {
          flex:       1,
          height:     '1px',
          background: 'var(--color-border-default)',
        };

  return (
    <div
      className={className}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        'var(--space-md)',
        ...style,
      }}
    >
      <div style={lineStyle} />
      {label && (
        <>
          <span
            style={{
              fontFamily:    'var(--font-sans)',
              fontSize:      'var(--font-size-xs)',
              fontWeight:    700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color:         variant === 'gold'
                ? 'rgba(219, 176, 88, 0.45)'
                : 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
          <div style={lineStyle} />
        </>
      )}
    </div>
  );
}
