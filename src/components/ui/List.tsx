import type { CSSProperties, ReactNode } from 'react';

const gapMap = {
  xs: 'var(--space-xs)',  // 4px
  sm: 'var(--space-sm)',  // 8px — default
  md: 'var(--space-md)',  // 12px
} as const;

// ─── List ────────────────────────────────────────────────────────────────────

interface ListProps {
  children: ReactNode;
  gap?: keyof typeof gapMap;
  className?: string;
  style?: CSSProperties;
}

export function List({ children, gap = 'sm', className = '', style }: ListProps) {
  return (
    <div
      className={className}
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           gapMap[gap],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── ListItem ────────────────────────────────────────────────────────────────

interface ListItemProps {
  /** Leading icon or symbol node */
  icon?: ReactNode;
  /** Primary label */
  title: string;
  /** Secondary right-aligned or below metadata */
  meta?: string;
  /** Dims all content to indicate completion */
  completed?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function ListItem({
  icon,
  title,
  meta,
  completed = false,
  onClick,
  className = '',
  style,
}: ListItemProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           'var(--space-sm)',
        padding:       'var(--space-xs) 0',
        opacity:       completed ? 0.35 : 1,
        cursor:        onClick ? 'pointer' : undefined,
        transition:    'opacity 0.2s ease-out',
        ...style,
      }}
    >
      {icon && (
        <span
          style={{
            flexShrink: 0,
            color:      'var(--color-accent-gold)',
            opacity:    0.65,
            fontSize:   'var(--font-size-xs)',
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
      )}

      <span
        style={{
          flex:          1,
          fontFamily:    'var(--font-sans)',
          fontSize:      'var(--font-size-sm)',
          fontWeight:    400,
          lineHeight:    'var(--line-height-balanced)',
          color:         'var(--color-text-primary)',
          textDecoration: completed ? 'line-through' : undefined,
        }}
      >
        {title}
      </span>

      {meta && (
        <span
          style={{
            flexShrink:  0,
            fontFamily:  'var(--font-sans)',
            fontSize:    'var(--font-size-xs)',
            fontWeight:  400,
            color:       'var(--color-text-muted)',
            opacity:     0.65,
            whiteSpace:  'nowrap',
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}
