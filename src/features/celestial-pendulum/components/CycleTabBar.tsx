/**
 * CycleTabBar — 4-world selector tabs with:
 *   - Cinematic region background image (at low opacity, brightens on active/hover)
 *   - World name + current state label
 *   - Time remaining (prominent)
 *   - Thin progress bar at bottom showing cycle elapsed progress
 *
 * No side-stripe borders. Active state = full border + bg tint.
 */

import { memo } from 'react';
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

// ─── Tab button (memoized to prevent re-renders) ─────────────────────────────

const CycleTabButton = memo(function CycleTabButton({
  id,
  label,
  status,
  isActive,
  timeStr,
  progress,
  onSelect,
}: {
  id: CycleId;
  label: string;
  status?: CycleStatus;
  isActive: boolean;
  timeStr: string;
  progress: number;
  onSelect: (id: CycleId) => void;
}) {
  const state = status?.cycle.state ?? '—';

  return (
    <button
      key={id}
      type="button"
      className="cycle-tab"
      data-active={isActive ? 'true' : undefined}
      onClick={() => onSelect(id)}
    >
      <div className="cycle-tab-body">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
          <span className={`cycle-tab-label ${isActive ? 'cycle-tab-label-active' : ''}`}>
            {label}
          </span>
          <span className={`cycle-tab-state ${isActive ? 'cycle-tab-state-active' : ''}`}>
            {state}
          </span>
        </div>

        <div className={`cycle-tab-time ${isActive ? 'cycle-tab-time-active' : ''}`}>
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
});

// ─── Component ────────────────────────────────────────────────────────────────

export const CycleTabBar = memo(function CycleTabBar({
  tabs,
  statuses,
  activeId,
  onSelect,
  times,
}: CycleTabBarProps) {
  return (
    <div className="cycle-tab-bar">
      {tabs.map(({ id, label }) => (
        <CycleTabButton
          key={id}
          id={id}
          label={label}
          status={statuses[id]}
          isActive={activeId === id}
          timeStr={times[id] ?? '—'}
          progress={statuses[id]?.progress ?? 0}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
