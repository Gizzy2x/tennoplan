import type { CycleData, CycleType } from '../../hooks/useWorldState';

const CYCLE_LABELS: Record<CycleType, string> = {
  cetus:   'Cetus',
  vallis:  'Orb Vallis',
  earth:   'Earth',
  zariman: 'Zariman',
};

const CYCLE_HINTS: Record<CycleType, string> = {
  cetus:   'Plains of Eidolon',
  vallis:  'Fortuna',
  earth:   'Earth',
  zariman: 'Zariman Ten Zero',
};

// Map phase names to CSS modifier classes
function phaseClass(phase: string): string {
  const p = phase.toLowerCase();
  if (p === 'day')   return 'day';
  if (p === 'night') return 'night';
  if (p === 'warm')  return 'warm';
  if (p === 'cold')  return 'cold';
  if (p === 'fass')  return 'fass';
  if (p === 'vome')  return 'vome';
  if (p === 'light') return 'day';
  if (p === 'dark')  return 'night';
  return 'night';
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Props = {
  cycle?: CycleData;
};

export function CycleCard({ cycle }: Props) {
  if (!cycle) {
    return (
      <div className="cycle-card">
        <div className="skeleton" style={{ height: '80px' }} />
      </div>
    );
  }

  const pClass = phaseClass(cycle.phase);

  return (
    <div className="cycle-card">
      <div className="cycle-header">
        <span className="cycle-name">{CYCLE_LABELS[cycle.type]}</span>
        <span className={`cycle-state-pill ${pClass}`}>{cycle.phase}</span>
      </div>

      <div className="cycle-bar-bg">
        <div
          className={`cycle-bar-fill ${pClass}`}
          style={{ width: `${cycle.progressPercent}%` }}
        />
      </div>

      <div className="cycle-footer">
        <span className="cycle-hint">{CYCLE_HINTS[cycle.type]}</span>
        <div style={{ textAlign: 'right' }}>
          <div className="cycle-timer">{formatTime(cycle.secondsRemaining)}</div>
          <div className="cycle-timer-label">remaining</div>
        </div>
      </div>
    </div>
  );
}
