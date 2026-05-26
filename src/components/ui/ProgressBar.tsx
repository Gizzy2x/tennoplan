import type { CSSProperties } from 'react';

const heightMap = {
  xs: '1px',
  sm: '2px',
  md: '4px',
} as const;

interface ProgressBarProps {
  /** 0–1 fraction of completion */
  value: number;
  /** Fill color — defaults to accent-gold */
  color?: string;
  /** Adds a glow shadow behind the fill */
  glow?: boolean;
  height?: keyof typeof heightMap;
  className?: string;
  style?: CSSProperties;
}

export function ProgressBar({
  value,
  color = 'var(--color-accent-gold)',
  glow = false,
  height = 'sm',
  className = '',
  style,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      className={className}
      style={{
        width:        '100%',
        height:       heightMap[height],
        background:   'rgba(255, 255, 255, 0.06)',
        overflow:     'hidden',
        position:     'relative',
        ...style,
      }}
    >
      <div
        style={{
          position:        'absolute',
          inset:           '0 auto 0 0',
          width:           `${clamped * 100}%`,
          background:      color,
          boxShadow:       glow ? `0 0 6px ${color}80, 0 0 12px ${color}40` : undefined,
          transition:      'width 1s linear',
        }}
      />
    </div>
  );
}
