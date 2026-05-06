/**
 * TacticalRadar — Cycle timer + key resources panel.
 *
 * The SVG blueprint map has been removed. This component now renders
 * a single wide panel split into:
 *   Left  — current cycle state, countdown, cycle note, pre-heat alert
 *   Right — key resources for the active world/state
 */

import { memo } from 'react';
import type { CycleId } from '@/core/domain/cycles';
import type { CycleUrgency } from '../hooks/useWorldCycles';
import type { KeyResource } from './TimerHeroPanel';
import { WORLD_THEMES } from '@/tokens/worldThemes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TacticalRadarProps {
  worldId:          CycleId;
  cycleState:       string;
  timeRemaining:    string;
  cycleNote?:       string | null;
  resources:        KeyResource[];
  urgency?:         CycleUrgency;
  isDataOutOfSync?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TacticalRadar = memo(function TacticalRadar({
  worldId,
  cycleState,
  timeRemaining,
  cycleNote,
  resources,
  urgency,
  isDataOutOfSync = false,
}: TacticalRadarProps) {
  const theme     = WORLD_THEMES[worldId];
  const accent    = theme?.accent ?? 'var(--color-accent-teal)';
  const isPreHeat = urgency?.isPreHeat ?? false;
  const nextState = urgency?.nextStateKey.split('-')[1] ?? '';

  return (
    <div className="tactical-radar">

      {/* ── Left: cycle state + countdown + notes ───────────────────── */}
      <div className="radar-left">
        <div className="radar-timer-label">CURRENT CYCLE</div>

        <div className="radar-timer-state" style={{ color: accent }}>
          {cycleState.toUpperCase()}
        </div>

        <div className="radar-timer-countdown">
          <span className="radar-timer-value">{timeRemaining}</span>
          <span className="radar-timer-unit">REMAINING</span>
        </div>

        {isDataOutOfSync && (
          <div
            title="Cycle data is more than 3 minutes old — may not reflect current game state"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          16,
              height:         16,
              borderRadius:   '50%',
              fontSize:       '0.65rem',
              color:          'rgba(251, 146, 60, 0.78)',
              border:         '1px solid rgba(251, 146, 60, 0.40)',
              background:     'rgba(251, 146, 60, 0.08)',
              cursor:         'help',
              marginTop:      4,
            }}
          >
            🕐
          </div>
        )}

        {cycleNote && (
          <div className="radar-cycle-note">
            <span className="radar-cycle-note-icon" style={{ color: accent }}>◆</span>
            <span className="radar-cycle-note-text">{cycleNote}</span>
          </div>
        )}

        {isPreHeat && (
          <div className="radar-pre-heat-badge">
            ↑ {nextState.toUpperCase()} INCOMING
          </div>
        )}
      </div>

      {/* ── Right: key resources ────────────────────────────────────── */}
      <div className="radar-right">
        <div className="radar-resources-label">KEY RESOURCES</div>
        <div className="radar-resources-list">
          {resources.slice(0, 6).map(r => (
            <div key={r.name} className="radar-resource-row">
              <span className="radar-resource-name">{r.name}</span>
              <span className="radar-resource-source">{r.source}</span>
            </div>
          ))}
          {resources.length === 0 && (
            <span className="radar-resource-empty">No key resources for this cycle</span>
          )}
        </div>
      </div>

    </div>
  );
});
