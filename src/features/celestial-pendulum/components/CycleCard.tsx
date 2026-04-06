import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';

// ---------------------------------------------------------------------------
// State presentation config
// ---------------------------------------------------------------------------

interface StatePresentation {
  label:     string;  // displayed above the countdown
  badge:     string;  // short label inside the progress ring
  color:     string;  // hex — used for glow, ring, countdown digits
  nextLabel: string;  // prefix for the "transitions to…" footer
}

const STATE: Record<string, StatePresentation> = {
  day:     { label: 'DAY CYCLE',          badge: 'DAY',     color: '#E3C372', nextLabel: 'NIGHT BEGINS' },
  night:   { label: 'NIGHT CYCLE',        badge: 'NIGHT',   color: '#bac3fe', nextLabel: 'DAY RETURNS'  },
  warm:    { label: 'THERMAL SURGE',      badge: 'WARM',    color: '#fb923c', nextLabel: 'COLD FRONT'   },
  cold:    { label: 'COLD FRONT',         badge: 'COLD',    color: '#67e8f9', nextLabel: 'WARM SURGE'   },
  fass:    { label: 'FASS ASCENDANT',     badge: 'FASS',    color: '#fb923c', nextLabel: 'VOME RISES'   },
  vome:    { label: 'VOME ASCENDANT',     badge: 'VOME',    color: '#c084fc', nextLabel: 'FASS RISES'   },
  corpus:  { label: 'CORPUS CONTROL',     badge: 'CORPUS',  color: '#60a5fa', nextLabel: 'GRINEER ADV.' },
  grineer: { label: 'GRINEER OCCUPATION', badge: 'GRINEER', color: '#f87171', nextLabel: 'CORPUS RET.'  },
};

const FALLBACK: StatePresentation = STATE.day;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressRing({
  progress,
  color,
  size = 72,
}: {
  progress: number;
  color:    string;
  size?:    number;
}) {
  const stroke = 2;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
    >
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(77,70,56,0.25)"
        strokeWidth={stroke}
      />
      {/* Fill */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="butt"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CycleCard
// ---------------------------------------------------------------------------

export interface CycleCardProps {
  status:   CycleStatus;
  featured?: boolean;
}

export function CycleCard({ status, featured = false }: CycleCardProps) {
  const { cycle, msRemaining, progress, isExpired } = status;
  const pres     = STATE[cycle.state] ?? FALLBACK;
  const { h, m, s } = formatMsParts(msRemaining);
  const showHours    = h !== '00';
  const nextState    = nextCycleState(cycle.id, cycle.state);
  const nextPres     = STATE[nextState] ?? FALLBACK;

  const isEidolonNight = cycle.id === 'cetus' && cycle.state === 'night';

  const counterSize = featured ? 'text-5xl' : 'text-4xl';
  const ringSize    = featured ? 88 : 72;

  return (
    <div
      className="glass-panel relative overflow-hidden h-full"
      style={{
        padding:     featured ? '2rem' : '1.5rem',
        borderColor: `${pres.color}22`,
        boxShadow:   isEidolonNight
          ? `0 0 48px ${pres.color}18, inset 0 0 80px ${pres.color}06`
          : undefined,
      }}
    >
      {/* Filigree corners */}
      <span
        className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
        style={{
          borderTop:  `1px solid ${pres.color}44`,
          borderLeft: `1px solid ${pres.color}44`,
        }}
      />
      <span
        className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
        style={{
          borderBottom: `1px solid ${pres.color}22`,
          borderRight:  `1px solid ${pres.color}22`,
        }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-label text-[10px] uppercase tracking-[0.4em] text-secondary opacity-40 mb-0.5">
            {cycle.location}
          </p>
          <p
            className="font-label text-xs uppercase tracking-[0.25em] font-semibold"
            style={{ color: pres.color }}
          >
            {pres.label}
          </p>
        </div>

        {isEidolonNight && (
          <span
            className="font-label text-[9px] uppercase tracking-widest px-2 py-0.5"
            style={{
              color:           pres.color,
              border:          `1px solid ${pres.color}50`,
              backgroundColor: `${pres.color}12`,
            }}
          >
            EIDOLON WINDOW
          </span>
        )}
      </div>

      {/* Ring + world name */}
      <div className={`flex items-center gap-4 ${featured ? 'mb-6' : 'mb-5'}`}>
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <ProgressRing progress={progress} color={pres.color} size={ringSize} />
          {/* Badge label in ring centre */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: 'none' }}
          >
            <span
              className="font-label font-bold uppercase"
              style={{ fontSize: 9, letterSpacing: '0.1em', color: pres.color }}
            >
              {pres.badge}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <h3
            className={`font-headline font-bold text-on-surface leading-tight ${featured ? 'text-2xl' : 'text-xl'}`}
          >
            {cycle.name}
          </h3>
          <p className="font-label text-[10px] uppercase tracking-widest text-secondary opacity-30 mt-0.5">
            {isExpired ? 'SYNCING...' : 'ACTIVE'}
          </p>
        </div>
      </div>

      {/* Countdown digits */}
      <div className={`flex items-baseline gap-0.5 ${featured ? 'mb-6' : 'mb-4'}`}>
        {showHours && (
          <>
            <span
              className={`font-mono ${counterSize} font-bold tabular-nums leading-none`}
              style={{ color: pres.color }}
            >
              {h}
            </span>
            <span className="font-mono text-2xl text-secondary opacity-20 mx-0.5">:</span>
          </>
        )}
        <span
          className={`font-mono ${counterSize} font-bold tabular-nums leading-none`}
          style={{ color: pres.color }}
        >
          {m}
        </span>
        <span className="font-mono text-2xl text-secondary opacity-20 mx-0.5">:</span>
        <span
          className={`font-mono ${counterSize} font-bold tabular-nums leading-none`}
          style={{ color: pres.color }}
        >
          {s}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-px bg-surface-container-highest mb-3 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 h-full"
          style={{
            width:           `${progress * 100}%`,
            backgroundColor: pres.color,
            boxShadow:       `0 0 6px ${pres.color}`,
            transition:      'width 1s linear',
          }}
        />
      </div>

      {/* Footer: next state */}
      <div className="flex items-center justify-between">
        <p className="font-label text-[10px] uppercase tracking-widest text-secondary opacity-30">
          {pres.nextLabel} IN
        </p>
        <p
          className="font-label text-[10px] uppercase tracking-widest"
          style={{ color: nextPres.color, opacity: 0.7 }}
        >
          → {nextPres.badge}
        </p>
      </div>
    </div>
  );
}
