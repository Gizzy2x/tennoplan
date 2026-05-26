import type { CSSProperties, ReactNode } from 'react';

const gapMap = {
  sm: 'var(--space-sm)',   //  8px
  md: 'var(--space-lg)',   // 16px — default
  lg: 'var(--space-xl)',   // 24px
} as const;

interface GridProps {
  children: ReactNode;
  /** Minimum card width before wrapping — default 280px */
  minWidth?: number;
  /** Gap between grid cells */
  gap?: keyof typeof gapMap;
  className?: string;
  style?: CSSProperties;
}

export function Grid({
  children,
  minWidth = 280,
  gap = 'md',
  className = '',
  style,
}: GridProps) {
  return (
    <div
      className={className}
      style={{
        display:             'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
        gap:                 gapMap[gap],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
