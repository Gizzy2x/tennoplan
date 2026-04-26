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
            <div style={{
              fontFamily:    'var(--font-sans)',
              fontSize:      '0.48rem',
              fontWeight:    700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color:         'rgba(227, 195, 114, 0.35)',
              marginBottom:  10,
            }}>
              ALL CYCLES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {entries.map(([id, s]) => {
                const isActive = id === activeId;
                const label    = WORLD_LABELS[id] ?? id.toUpperCase();
                const timeStr  = forecastTimes[id] ?? '—';

                return (
                  <div
                    key={id}
                    style={{
                      display:    'flex',
                      alignItems: 'baseline',
                      gap:        6,
                    }}
                  >
                    <span style={{
                      fontFamily:    'var(--font-sans)',
                      fontSize:      '0.50rem',
                      fontWeight:    700,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color:         isActive
                        ? 'rgba(227, 195, 114, 0.82)'
                        : 'rgba(227, 195, 114, 0.35)',
                      minWidth:      54,
                      flexShrink:    0,
                    }}>
                      {label}
                    </span>

                    <span style={{
                      fontFamily:    'var(--font-sans)',
                      fontSize:      '0.48rem',
                      color:         'rgba(168, 165, 160, 0.52)',
                      textTransform: 'capitalize',
                    }}>
                      {s.cycle.state}
                    </span>

                    <span style={{ color: 'rgba(227, 195, 114, 0.15)', fontSize: '0.40rem' }}>·</span>

                    <span style={{
                      fontFamily:         'var(--font-sans)',
                      fontSize:           '0.48rem',
                      color:              isActive
                        ? 'rgba(229, 226, 225, 0.55)'
                        : 'rgba(168, 165, 160, 0.35)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
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
          <div style={{
            borderTop:  '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: 12,
          }}>
            <div style={{
              fontFamily:    'var(--font-sans)',
              fontSize:      '0.48rem',
              fontWeight:    700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color:         'rgba(227, 195, 114, 0.35)',
              marginBottom:  10,
            }}>
              INTEL
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    color:      'rgba(227, 195, 114, 0.38)',
                    flexShrink: 0,
                    fontSize:   '0.50rem',
                    lineHeight: 1.6,
                    userSelect: 'none',
                  }}>
                    ·
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize:   '0.52rem',
                    color:      'rgba(168, 165, 160, 0.52)',
                    lineHeight: 1.65,
                  }}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </PanelBody>
    </Panel>
  );
}
