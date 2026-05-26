import type { ComponentType } from 'react';

interface SectionHeaderProps {
  /** Lucide icon component */
  icon?: ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  /** Section label — rendered uppercase */
  label: string;
  /** Optional item count badge */
  count?: number;
  /** Accent color — defaults to Orokin gold */
  color?: string;
  className?: string;
}

/**
 * Shared section header: icon + uppercase label + count badge + horizontal rule.
 * Replaces all per-page SectionHeader implementations.
 */
export function SectionHeader({
  icon: Icon,
  label,
  count,
  color = '#E3C372',
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-3 mb-5 ${className}`}>
      {Icon && (
        <Icon
          size={15}
          strokeWidth={1.5}
          style={{ color, opacity: 0.65, flexShrink: 0 }}
        />
      )}

      <span
        className="font-label font-bold uppercase tracking-[0.22em] shrink-0"
        style={{ fontSize: '0.6875rem', color }}
      >
        {label}
      </span>

      {count != null && (
        <span
          className="font-label font-bold tabular-nums px-1.5 py-px shrink-0"
          style={{
            fontSize:        '0.5625rem',
            color,
            border:          `1px solid ${color}40`,
            backgroundColor: `${color}12`,
          }}
        >
          {count}
        </span>
      )}

      <div className="section-header-line" style={{ background: `${color}1A` }} />
    </div>
  );
}
