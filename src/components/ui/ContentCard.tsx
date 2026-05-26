import type { ReactNode, CSSProperties } from 'react';

interface ContentCardProps {
  children: ReactNode;
  /** Extra Tailwind / class names */
  className?: string;
  style?: CSSProperties;
  /** Enable hover lift + border glow */
  interactive?: boolean;
  /** Optional top accent line color (e.g. faction or tier color) */
  accent?: string;
  /** Padding shorthand — Tailwind padding class(es), e.g. "p-4" */
  padding?: string;
}

/**
 * Standard dark card with thin gold border.
 * Replaces ad-hoc glass-panel usage inside content grids.
 */
export function ContentCard({
  children,
  className = '',
  style,
  interactive = false,
  accent,
  padding = 'p-4',
}: ContentCardProps) {
  const classes = [
    'content-card',
    interactive ? 'content-card-interactive' : '',
    padding,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={style}>
      {accent && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
