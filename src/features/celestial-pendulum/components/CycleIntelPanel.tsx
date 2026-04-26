/**
 * CycleIntelPanel — right-side intelligence panel.
 *
 * Shows:
 *   - All 4 worlds' current state + time remaining (compact list)
 *   - Farming tips for the currently selected world
 *
 * Deliberately minimal — no section header.
 * The CycleTabBar already provides per-world timers; this reinforces with
 * a glanceable all-worlds summary + actionable intel.
 */

import { Panel, PanelBody } from '@/components/ui/Panel';
import type { CycleId, CycleStatus } from '@/core/domain/cycles';

// ─── Types ────────────────────────────────────────────────────────────────────

const WORLD_LABELS: Partial<Record<CycleId, string>> = {
  cetus:   'CETUS',
  vallis:  'FORTUNA',
  cambion: 'DEIMOS',
  zariman: 'ZARIMAN',
  duviri:  'DUVIRI',
};

interface CycleIntelPanelProps {
  activeId:           CycleId;
  statuses:           Partial<Record<CycleId, CycleStatus>>;
  /** Pre-formatted forecast time strings keyed by cycle id */
  forecastTimes:      Partial<Record<CycleId, string>>;
  tips:               string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CycleIntelPanel({
  activeId,
  statuses,
  forecastTimes,
  tips,
}: CycleIntelPanelProps) {
  const entries = Object.entries(statuses) as [CycleId, CycleStatus][];

  return (
    <Panel>
      <PanelBody>

        {/* ── All-worlds forecast ─────────────────────────────────────── */}
        {entries.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="intel-section-label">ALL WORLDS</div>

            <div className="intel-worlds-list">
              {entries.map(([id, s]) => {
                const isActive = id === activeId;
                const label    = WORLD_LABELS[id] ?? id.toUpperCase();
                const timeStr  = forecastTimes[id] ?? '—';

                return (
                  <div key={id} className="intel-world-row">
                    <span className={`intel-world-name ${isActive ? 'intel-world-name--active' : 'intel-world-name--inactive'}`}>
                      {label}
                    </span>
                    <span className="intel-world-state">{s.cycle.state}</span>
                    <span className="intel-world-sep">·</span>
                    <span className={`intel-world-time ${isActive ? 'intel-world-time--active' : 'intel-world-time--inactive'}`}>
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Farming tips ────────────────────────────────────────────── */}
        {tips.length > 0 && (
          <div className="intel-tips-section">
            <div className="intel-section-label">FARMING TIPS</div>

            <div className="intel-tips-list">
              {tips.map((tip, i) => (
                <div key={i} className="intel-tip-item">
                  <span className="intel-tip-bullet">·</span>
                  <span className="intel-tip-text">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </PanelBody>
    </Panel>
  );
}
