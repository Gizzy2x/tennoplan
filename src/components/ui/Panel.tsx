import type { CSSProperties, ReactNode } from 'react';
import { useThemeStore } from '@/store/theme';
import {
  panelStyle,
  panelHeaderStyle,
  panelLabelStyle,
  panelBodyStyle,
  dataRowStyle,
  dataRowLabelStyle,
  dataRowValueStyle,
  sectionDividerStyle,
  sectionDividerLabelStyle,
  sectionDividerLineStyle,
} from '@/tokens/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Shared panel primitives — use these across the whole app for consistent
// dark panels with gold Orokin borders. All styles now driven by design tokens.
// ─────────────────────────────────────────────────────────────────────────────

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  highlight?: boolean;
}

export function Panel({ children, style, className = '', highlight = false }: PanelProps) {
  const { tokens } = useThemeStore();

  return (
    <div
      className={className}
      style={{
        ...panelStyle(tokens, highlight),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PanelHeader({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { tokens } = useThemeStore();

  return (
    <div
      style={{
        ...panelHeaderStyle(tokens),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PanelLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { tokens } = useThemeStore();

  return (
    <span
      style={{
        ...panelLabelStyle(tokens),
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function PanelBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { tokens } = useThemeStore();

  return (
    <div
      style={{
        ...panelBodyStyle(tokens),
        ...style,
      }}
    >
      {children}
    </div>
  );
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
  const { tokens } = useThemeStore();

  return (
    <div style={dataRowStyle(tokens)}>
      <span style={dataRowLabelStyle(tokens)}>
        {label}
      </span>
      <span style={dataRowValueStyle(tokens, accent)}>
        {value}
      </span>
    </div>
  );
}

export function SectionDivider({ label }: { label: string }) {
  const { tokens } = useThemeStore();

  return (
    <div style={sectionDividerStyle(tokens)}>
      <span style={sectionDividerLabelStyle(tokens)}>
        {label}
      </span>
      <div style={sectionDividerLineStyle(tokens)} />
    </div>
  );
}
