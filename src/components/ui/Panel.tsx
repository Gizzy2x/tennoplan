import type { CSSProperties, ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  highlight?: boolean;
}

export function Panel({ children, style, className = '', highlight = false }: PanelProps) {
  return (
    <div
      className={`panel ${highlight ? 'panel-highlight' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}

export function PanelHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="panel-header" style={style}>{children}</div>;
}

export function PanelLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span className="panel-label" style={style}>{children}</span>;
}

export function PanelBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="panel-body" style={style}>{children}</div>;
}

export function DataRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="data-row">
      <span className="data-row-label">{label}</span>
      <span className={`data-row-value ${accent ? 'data-row-value-accent' : ''}`.trim()}>{value}</span>
    </div>
  );
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="section-divider">
      <span className="section-divider-label">{label}</span>
      <div className="section-divider-line" />
    </div>
  );
}
