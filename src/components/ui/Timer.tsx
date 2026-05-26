import type { CSSProperties } from 'react';

const sizeMap = {
  sm: 'var(--font-size-sm)',   // 0.875rem — inline, compact
  md: 'var(--font-size-xl)',   // 1.8rem   — card hero
  lg: 'var(--font-size-2xl)',  // 2.4rem   — page display
  xl: 'var(--font-size-3xl)',  // 3.2rem   — cinematic
} as const;

interface TimerProps {
  /** Formatted time string — caller handles formatting (e.g. "14M", "1H 23M") */
  value: string;
  /** Optional supporting label rendered below the value */
  label?: string;
  size?: keyof typeof sizeMap;
  /** Color for value text — defaults to accent-gold */
  color?: string;
  /** Adds pulsing glow — use when time is critically low */
  urgent?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Timer({
  value,
  label,
  size = 'md',
  color = 'var(--color-accent-gold)',
  urgent = false,
  className = '',
  style,
}: TimerProps) {
  return (
    <div
      className={className}
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           '2px',
        ...style,
      }}
    >
      <span
        className={urgent ? 'orokin-countdown-glow' : undefined}
        style={{
          fontFamily:         'var(--font-sans)',
          fontSize:           sizeMap[size],
          fontWeight:         900,
          lineHeight:         1,
          letterSpacing:      '-0.01em',
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      {label && (
        <span
          style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      'var(--font-size-xs)',
            fontWeight:    700,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color:         'var(--color-text-muted)',
            opacity:       0.65,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
