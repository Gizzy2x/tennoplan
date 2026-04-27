/**
 * WorldNavigationDials — Phase 1 of the Celestial Pendulum redesign.
 *
 * Replaces CycleTabBar. State-driven dial rail where:
 *   • Selected world docks at far-left (Primary Seat) with anchor treatment
 *   • Click slides cards via translateX (300ms ease-out, no bounce)
 *   • Pre-Heat dials pulse amber when their next phase is P0 within 15 min
 *   • Each dial shows: World, State, Primary timer, Ghost timer (next phase)
 *   • Bottom 1px progress track empties as the current state nears its end
 *
 * Theme broadcasting: each dial carries its own data-world for visual identity;
 * the page wrapper carries data-world={selectedId} to drive global atmosphere.
 */

import { memo, useMemo } from 'react';
import type { CycleId, CycleStatus } from '@/core/domain/cycles';
import type { CycleUrgency } from '../hooks/useWorldCycles';
import { CYCLE_DURATIONS } from '@/core/services/cycleService';

interface WorldNavigationDialsProps {
  tabs:     { id: CycleId; label: string }[];
  statuses: Partial<Record<CycleId, CycleStatus>>;
  urgency:  Partial<Record<CycleId, CycleUrgency>>;
  activeId: CycleId;
  onSelect: (id: CycleId) => void;
  /** Pre-formatted "25m" / "1h" time strings keyed by world id */
  times:    Partial<Record<CycleId, string>>;
}

function formatNextDuration(id: CycleId, nextState: string): string {
  const dur = CYCLE_DURATIONS[id]?.[nextState] ?? 0;
  if (dur === 0) return '';
  const mins = Math.round(dur / 60_000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

const Dial = memo(function Dial({
  id,
  label,
  status,
  urgency,
  isPrimary,
  slot,
  total,
  timeStr,
  onSelect,
}: {
  id:        CycleId;
  label:     string;
  status?:   CycleStatus;
  urgency?:  CycleUrgency;
  isPrimary: boolean;
  slot:      number;
  total:     number;
  timeStr:   string;
  onSelect:  (id: CycleId) => void;
}) {
  const state         = (status?.cycle.state ?? '—').toString();
  const nextStateName = urgency?.nextStateKey.split('-')[1] ?? '';
  const nextDur       = nextStateName ? formatNextDuration(id, nextStateName) : '';
  const progress      = status?.progress ?? 0;
  const isPreHeat     = urgency?.isPreHeat ?? false;

  return (
    <button
      type="button"
      className="dial"
      data-primary={isPrimary ? 'true' : undefined}
      data-pre-heat={isPreHeat ? 'true' : undefined}
      data-world={id}
      style={{
        ['--dial-slot'  as string]: slot,
        ['--dial-total' as string]: total,
      } as React.CSSProperties}
      onClick={() => onSelect(id)}
      aria-pressed={isPrimary}
      aria-label={`${label} — ${state}, ${timeStr} remaining`}
    >
      <div className="dial-inner">
        <div className="dial-row-top">
          <span className="dial-label">{label}</span>
          <span className="dial-state">{state.toUpperCase()}</span>
        </div>

        <div className="dial-time">{timeStr}</div>

        <div className="dial-ghost">
          {nextStateName && (
            <>
              <span className="dial-ghost-prefix">Next:</span>{' '}
              <span className="dial-ghost-state">{nextStateName}</span>
              {nextDur && <span className="dial-ghost-dur"> ({nextDur})</span>}
            </>
          )}
        </div>

        <div className="dial-progress-track" aria-hidden="true">
          <div
            className="dial-progress-fill"
            style={{ width: `${(progress * 100).toFixed(1)}%` }}
          />
        </div>
      </div>
    </button>
  );
});

export const WorldNavigationDials = memo(function WorldNavigationDials({
  tabs,
  statuses,
  urgency,
  activeId,
  onSelect,
  times,
}: WorldNavigationDialsProps) {
  // Reorder so activeId docks at slot 0; others retain original order
  const orderedIds = useMemo(() => {
    const others = tabs.filter(t => t.id !== activeId).map(t => t.id);
    return tabs.some(t => t.id === activeId) ? [activeId, ...others] : tabs.map(t => t.id);
  }, [activeId, tabs]);

  const labelById = useMemo(() =>
    Object.fromEntries(tabs.map(t => [t.id, t.label])) as Partial<Record<CycleId, string>>,
    [tabs]
  );

  return (
    <div
      className="dial-rail"
      style={{ ['--dial-count' as string]: orderedIds.length } as React.CSSProperties}
    >
      {orderedIds.map((id, slot) => (
        <Dial
          key={id}
          id={id}
          label={labelById[id] ?? id.toUpperCase()}
          status={statuses[id]}
          urgency={urgency[id]}
          isPrimary={slot === 0}
          slot={slot}
          total={orderedIds.length}
          timeStr={times[id] ?? '—'}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
