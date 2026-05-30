import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';
import { STATE, FALLBACK } from './CycleCard';
import { getWorldBg } from '../worldAssets';

// ── Descriptor text per world-state ──────────────────────────────────────────

const DESCRIPTOR: Record<string, string> = {
  'cetus-day':       'CORE FOR BOUNTIES & MINING',
  'cetus-night':     'EIDOLON HUNTS ACTIVE',
  'vallis-warm':     'CONSERVATION & FARMING',
  'vallis-cold':     'TOROID FARMING & REWARDS',
  'cambion-fass':    'ISOLATION VAULTS ACTIVE',
  'cambion-vome':    'CONSERVATION & MINERALS',
  'zariman-corpus':  'CORPUS BOUNTIES ACTIVE',
  'zariman-grineer': 'GRINEER BOUNTIES ACTIVE',
  'duviri-joy':      'ROTATES WITH THE LOOP',
  'duviri-anger':    'ROTATES WITH THE LOOP',
  'duviri-envy':     'ROTATES WITH THE LOOP',
  'duviri-sorrow':   'ROTATES WITH THE LOOP',
  'duviri-fear':     'ROTATES WITH THE LOOP',
  'earth-day':       'CETUS WISPS AVAILABLE',
  'earth-night':     'RARE FISHING ACTIVE',
};

// ── Key resources per world-state ─────────────────────────────────────────────

const PANEL_ICONS: Record<string, string[]> = {
  'cetus-day':       ['◆', '✦', '◈', '◎', '◇', '◆'],
  'cetus-night':     ['✦', '◆', '◈', '◇'],
  'vallis-warm':     ['◆', '✦', '◈', '◎'],
  'vallis-cold':     ['◆', '✦', '◈', '◇'],
  'cambion-fass':    ['◆', '✦', '◈', '◎'],
  'cambion-vome':    ['◆', '✦', '◈', '◇'],
  'zariman-corpus':  ['◆', '✦', '◈', '◇'],
  'zariman-grineer': ['◆', '✦', '◈', '◇'],
  'duviri-joy':      ['◌', '◆', '✦', '◈'],
  'duviri-anger':    ['△', '◆', '✦', '◈'],
  'duviri-envy':     ['◆', '✦', '◈', '◇'],
  'duviri-sorrow':   ['▽', '◆', '✦', '◈'],
  'duviri-fear':     ['◇', '◆', '✦', '◈'],
  'earth-day':       ['◆', '✦', '◎'],
  'earth-night':     ['◆', '◈', '◇'],
};

function stateLabel(id: string, state: string, nextBadge: string): string {
  if (id === 'duviri')  return `CURRENT MOOD: ${state.toUpperCase()}`;
  if (id === 'zariman') return `FACTION: ${state.toUpperCase()}`;
  return `UNTIL ${nextBadge}`;
}

interface WorldOverviewPanelProps {
  status:   CycleStatus;
  onSelect: (id: string) => void;
  isLast:   boolean;
}

export function WorldOverviewPanel({ status, onSelect, isLast }: WorldOverviewPanelProps) {
  const { cycle, msRemaining, isExpired } = status;
  const pres      = STATE[cycle.state] ?? FALLBACK;
  const nextState = nextCycleState(cycle.id, cycle.state);
  const nextPres  = STATE[nextState] ?? FALLBACK;
  const { h, m }  = formatMsParts(msRemaining);

  const bgUrl      = getWorldBg(cycle.id, cycle.state);
  const descriptor = DESCRIPTOR[`${cycle.id}-${cycle.state}`] ?? '';
  const icons      = PANEL_ICONS[`${cycle.id}-${cycle.state}`] ?? ['◆', '✦', '◈'];
  const label      = isExpired ? 'SYNCING…' : stateLabel(cycle.id, cycle.state, nextPres.badge);

  const timerDisplay = h !== '00'
    ? `${parseInt(h, 10)}h ${parseInt(m, 10)}m`
    : `${parseInt(m, 10)}m`;

  return (
    <button
      onClick={() => onSelect(cycle.id)}
      className="relative flex flex-col overflow-hidden focus:outline-none group"
      style={{
        flex:        '1 1 0',
        minWidth:    0,
        cursor:      'pointer',
        background:  'transparent',
        padding:     0,
        borderRight: isLast ? undefined : '1px solid rgba(219, 176, 88,0.08)',
      }}
      aria-label={`${cycle.name} — ${label}`}
    >
      {/* ── Background image ────────────────────────────────────────────── */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-all duration-500"
          style={{ zIndex: 0, filter: 'brightness(0.55)' }}
        />
      )}

      {/* ── Hover brightening layer ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ background: 'rgba(219, 176, 88,0.06)', zIndex: 1 }}
      />

      {/* ── Dark vignette ──────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.10) 30%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.82) 100%)',
          zIndex:     2,
        }}
      />

      {/* ── Top: location label + state pill ──────────────────────────────── */}
      <div className="relative flex items-center justify-between px-4 pt-4" style={{ zIndex: 3 }}>
        <span
          data-role="labelSmall"
          className="typo-label-sm"
          style={{ color: pres.color, opacity: 0.70 }}
        >
          {cycle.location}
        </span>

        <span
          data-role="labelTiny"
          className="typo-label-xs"
          style={{
            color:      pres.color,
            border:     `1px solid ${pres.color}40`,
            background: `${pres.color}10`,
            padding:    '3px 8px',
          }}
        >
          {pres.badge}
        </span>
      </div>

      {/* ── Centre: timer + label ──────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-2 px-3" style={{ zIndex: 3 }}>
        {/* Timer — font-mono, intentionally not a token role */}
        <p
          className="font-mono font-bold tabular-nums"
          style={{
            fontWeight:         900,
            fontSize:           'clamp(1.8rem, 3.2vw, 3.4rem)',
            lineHeight:         1,
            color:              '#DBB058',
            textShadow:         `0 2px 24px rgba(0,0,0,0.95), 0 0 40px ${pres.color}28`,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing:      '0.04em',
          }}
        >
          {timerDisplay}
        </p>

        <p
          data-role="labelSmall"
          className="typo-label-sm"
          style={{ color: pres.color, opacity: 0.70 }}
        >
          {label}
        </p>

        <p
          data-role="labelTiny"
          className="typo-label-xs"
          style={{ color: 'rgba(198,198,199,0.38)', marginTop: 2 }}
        >
          {cycle.name}
        </p>
      </div>

      {/* ── Resource icons strip ──────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center gap-3 pb-2 px-3" style={{ zIndex: 3 }}>
        {icons.map((icon, i) => (
          <span key={i} style={{ fontSize: '0.68rem', color: pres.color, opacity: 0.45 }}>
            {icon}
          </span>
        ))}
      </div>

      {/* ── Bottom descriptor bar ─────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center px-3 py-2"
        style={{ zIndex: 3, background: 'rgba(0,0,0,0.62)', borderTop: `1px solid ${pres.color}14` }}
      >
        <p
          data-role="labelTiny"
          className="typo-label-xs text-center"
          style={{ color: pres.color, opacity: 0.55 }}
        >
          {descriptor}
        </p>
      </div>
    </button>
  );
}
