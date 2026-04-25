import type { CSSProperties } from 'react';

const statusConfig = {
  live: {
    color:     '#4ade80',
    label:     'Live',
    animation: undefined,
  },
  syncing: {
    color:     'var(--color-accent-gold)',
    label:     'Syncing',
    animation: 'heartbeatPulse 0.8s ease-in-out infinite',
  },
  offline: {
    color:     'var(--color-text-muted)',
    label:     'Offline',
    animation: undefined,
  },
  error: {
    color:     '#f87171',
    label:     'Error',
    animation: undefined,
  },
} as const;

const sizeMap = {
  xs: { dot: 5, fontSize: 'var(--font-size-xs)' },
  sm: { dot: 7, fontSize: 'var(--font-size-sm)' },
} as const;

type Status = keyof typeof statusConfig;

interface StatusIndicatorProps {
  status: Status;
  /** Overrides the default label for this status */
  label?: string;
  size?: keyof typeof sizeMap;
  className?: string;
  style?: CSSProperties;
}

export function StatusIndicator({
  status,
  label,
  size = 'xs',
  className = '',
  style,
}: StatusIndicatorProps) {
  const cfg  = statusConfig[status];
  const dims = sizeMap[size];

  return (
    <div
      className={className}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        'var(--space-xs)',
        ...style,
      }}
    >
      <span
        style={{
          display:     'inline-block',
          width:       dims.dot,
          height:      dims.dot,
          borderRadius:'50%',
          background:  cfg.color,
          flexShrink:  0,
          animation:   cfg.animation,
        }}
      />
      {(label ?? cfg.label) && (
        <span
          style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      dims.fontSize,
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         cfg.color,
            opacity:       0.75,
          }}
        >
          {label ?? cfg.label}
        </span>
      )}
    </div>
  );
}
