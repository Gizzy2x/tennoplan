/**
 * CycleTabBar — 4-world selector tabs with:
 *   - Cinematic region background image (at low opacity, brightens on active/hover)
 *   - World name + current state label
 *   - Time remaining (prominent)
 *   - Thin progress bar at bottom showing cycle elapsed progress
 *
 * No side-stripe borders. Active state = full border + bg tint.
 */

import type { CycleId, CycleStatus } from '@/core/domain/cycles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CycleTabBarProps {
  tabs:       { id: CycleId; label: string }[];
  statuses:   Partial<Record<CycleId, CycleStatus>>;
  activeId:   CycleId;
  onSelect:   (id: CycleId) => void;
  /** Pre-formatted time strings keyed by cycle id */
  times:      Partial<Record<CycleId, string>>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CycleTabBar({
  tabs,
  statuses,
  activeId,
  onSelect,
  times,
}: CycleTabBarProps) {
  return (
    <div
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:                 8,
        marginBottom:        8,
      }}
    >
      {tabs.map(({ id, label }) => {
        const status   = statuses[id];
        const isActive = activeId === id;
        const state    = status?.cycle.state ?? '—';
        const timeStr  = times[id] ?? '—';
        const progress = status?.progress ?? 0;

        return (
          <button
            key={id}
            type="button"
            className="cycle-tab"
            data-active={isActive ? 'true' : undefined}
            onClick={() => onSelect(id)}
          >
            {/* Content — WorldBackground (position:fixed) shows through the
                transparent gradient of the active tab. No duplicate image needed. */}
            <div className="cycle-tab-body">

              {/* World name + state */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
                <span
                  className="typo-label-xs"
                  style={{
                    color: isActive
                      ? 'var(--color-accent-gold)'
                      : 'rgba(227, 195, 114, 0.68)',   /* was 0.42 — now readable */
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily:    'var(--font-sans)',
                    fontSize:      '0.50rem',
                    fontWeight:    600,
                    letterSpacing: '0.06em',
                    textTransform: 'capitalize',
                    color:         isActive
                      ? 'rgba(229, 226, 225, 0.75)'
                      : 'rgba(229, 226, 225, 0.52)',   /* was 0.38 — state always visible */
                    flexShrink:    0,
                  }}
                >
                  {state}
                </span>
              </div>

              {/* Time remaining */}
              <div
                style={{
                  fontFamily:         'var(--font-sans)',
                  fontSize:           '1.3rem',
                  fontWeight:         900,
                  lineHeight:         1,
                  letterSpacing:      '-0.01em',
                  fontVariantNumeric: 'tabular-nums',
                  color:              isActive
                    ? 'var(--color-accent-gold)'
                    : 'rgba(227, 195, 114, 0.72)',     /* was 0.48 — always legible */
                  marginTop:          2,
                }}
              >
                {timeStr}
              </div>
            </div>

            {/* Cycle progress bar */}
            <div className="cycle-tab-progress-bar">
              <div
                className="cycle-tab-progress-fill"
                style={{ width: `${Math.min(100, progress * 100).toFixed(1)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
