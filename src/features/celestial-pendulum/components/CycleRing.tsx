/**
 * CycleRing — an SVG ring that wraps a planet thumb and drains as the
 * current phase runs out. The colored arc length == remaining fraction,
 * so the time is *visible*: a full ring means the phase just started, a
 * sliver means it's about to flip.
 *
 * The planet art is rendered inside the ring via children, so the artwork
 * and the time data are one composed object — not a box beside a box.
 */

import { memo, type ReactNode } from 'react';

interface CycleRingProps {
  /** 0–1 elapsed fraction of the current phase (from CycleStatus.progress). */
  progress: number;
  /** Diameter of the ring in px. */
  size:     number;
  /** Ring stroke width in px. */
  stroke:   number;
  /** Arc color (world accent). */
  color:    string;
  /** Planet thumb / fallback rendered inside the ring. */
  children: ReactNode;
  /** Adds a subtle pulse to signal an imminent prime window. */
  pulse?:   boolean;
}

export const CycleRing = memo(function CycleRing({
  progress,
  size,
  stroke,
  color,
  children,
  pulse = false,
}: CycleRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const remaining = Math.max(0, Math.min(1, 1 - progress));
  const arc = remaining * c;
  const cx = size / 2;

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        // overflow:visible lets the `pulse` drop-shadow bleed past the viewport
        // as a soft circular halo. Without it the SVG clips the glow to its own
        // 46px box → the halo shows a hard rectangular edge.
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', overflow: 'visible' }}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--color-border-default)"
          strokeWidth={stroke}
          opacity={0.6}
        />
        {/* Remaining arc */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          style={{
            transition: 'stroke-dasharray 900ms linear',
            filter: pulse ? `drop-shadow(0 0 4px ${color})` : undefined,
          }}
        />
      </svg>

      {/* Planet thumb / fallback, clipped to a circle inside the ring */}
      <div
        style={{
          position: 'absolute',
          inset: stroke + 2,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
});
