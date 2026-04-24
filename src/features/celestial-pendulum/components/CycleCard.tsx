import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';

// ---------------------------------------------------------------------------
// State presentation config
// ---------------------------------------------------------------------------

export interface StatePresentation {
  label:     string;
  badge:     string;
  color:     string;
  nextLabel: string;
  icon:      string;
}

export const STATE: Record<string, StatePresentation> = {
  day:     { label: 'DAY CYCLE',          badge: 'DAY',     color: '#E3C372', nextLabel: 'NIGHT',           icon: '☀' },
  night:   { label: 'NIGHT CYCLE',        badge: 'NIGHT',   color: '#bac3fe', nextLabel: 'DAY',             icon: '☽' },
  warm:    { label: 'THERMAL SURGE',      badge: 'WARM',    color: '#fb923c', nextLabel: 'COLD FRONT',      icon: '◎' },
  cold:    { label: 'COLD FRONT',         badge: 'COLD',    color: '#67e8f9', nextLabel: 'WARM SURGE',      icon: '❄' },
  fass:    { label: 'FASS ASCENDANT',     badge: 'FASS',    color: '#fb923c', nextLabel: 'VOME',            icon: '✦' },
  vome:    { label: 'VOME ASCENDANT',     badge: 'VOME',    color: '#c084fc', nextLabel: 'FASS',            icon: '◈' },
  corpus:  { label: 'CORPUS CONTROL',     badge: 'CORPUS',  color: '#60a5fa', nextLabel: 'GRINEER ADV.',    icon: '⊕' },
  grineer: { label: 'GRINEER OCCUPATION', badge: 'GRINEER', color: '#f87171', nextLabel: 'CORPUS RET.',     icon: '☠' },
  joy:     { label: 'JOY',               badge: 'JOY',     color: '#E3C372', nextLabel: 'ANGER APPROACHES', icon: '◌' },
  anger:   { label: 'ANGER',             badge: 'ANGER',   color: '#ef4444', nextLabel: 'ENVY RISES',       icon: '△' },
  envy:    { label: 'ENVY',              badge: 'ENVY',    color: '#22c55e', nextLabel: 'SORROW FALLS',     icon: '◆' },
  sorrow:  { label: 'SORROW',            badge: 'SORROW',  color: '#60a5fa', nextLabel: 'FEAR COMES',       icon: '▽' },
  fear:    { label: 'FEAR',              badge: 'FEAR',    color: '#a855f7', nextLabel: 'JOY RETURNS',      icon: '◇' },
};

export const FALLBACK: StatePresentation = STATE.day;

// ---------------------------------------------------------------------------
// World background gradients
// ---------------------------------------------------------------------------

const CARD_GRADIENT: Record<string, string> = {
  'cetus-day':       'radial-gradient(ellipse at 30% 85%, #6b3800 0%, #3d1c00 35%, #1a0c00 65%, #0a0800 100%)',
  'cetus-night':     'radial-gradient(ellipse at 60% 20%, #1a2a5e 0%, #0c1840 35%, #060d2a 65%, #020510 100%)',
  'vallis-warm':     'radial-gradient(ellipse at 50% 90%, #5a2800 0%, #3a1800 35%, #1a0e00 65%, #0a0600 100%)',
  'vallis-cold':     'radial-gradient(ellipse at 50% 30%, #0d3550 0%, #082240 30%, #040e20 65%, #020610 100%)',
  'cambion-fass':    'radial-gradient(ellipse at 70% 70%, #5c2800 0%, #3a1500 35%, #1a0800 65%, #080400 100%)',
  'cambion-vome':    'radial-gradient(ellipse at 40% 60%, #082a1e 0%, #041a12 35%, #020e0a 65%, #010805 100%)',
  'zariman-corpus':  'radial-gradient(ellipse at 50% 50%, #0c1e50 0%, #081440 35%, #040c28 65%, #020610 100%)',
  'zariman-grineer': 'radial-gradient(ellipse at 50% 50%, #4a0c08 0%, #300806 35%, #180402 65%, #0a0200 100%)',
  'duviri-joy':      'radial-gradient(ellipse at 50% 70%, #4a3800 0%, #2a2000 35%, #141000 65%, #080600 100%)',
  'duviri-anger':    'radial-gradient(ellipse at 50% 70%, #4a0e00 0%, #2c0800 35%, #160400 65%, #080200 100%)',
  'duviri-envy':     'radial-gradient(ellipse at 50% 70%, #084a08 0%, #043004 35%, #021802 65%, #010801 100%)',
  'duviri-sorrow':   'radial-gradient(ellipse at 50% 30%, #082040 0%, #041428 35%, #020a18 65%, #010610 100%)',
  'duviri-fear':     'radial-gradient(ellipse at 50% 50%, #1e0640 0%, #120428 35%, #080218 65%, #040110 100%)',
  'earth-day':       'radial-gradient(ellipse at 40% 80%, #1a3800 0%, #0e2200 35%, #060e00 65%, #030800 100%)',
  'earth-night':     'radial-gradient(ellipse at 50% 20%, #0c1430 0%, #060c20 35%, #030612 65%, #010408 100%)',
};

export function getCardGradient(id: string, state: string): string {
  return CARD_GRADIENT[`${id}-${state}`]
    ?? 'linear-gradient(135deg, #131313 0%, #1c1b1b 100%)';
}

// ---------------------------------------------------------------------------
// Static rewards
// ---------------------------------------------------------------------------

const STATIC_REWARDS: Record<string, string> = {
  'cetus-day':       'BOUNTIES · MINING · CONSERVATION',
  'cetus-night':     'EIDOLON HUNTS · WISPS · SHARDS',
  'vallis-warm':     'MINING · CONSERVATION',
  'vallis-cold':     'TOROIDS · FIELD RON · BOUNTIES',
  'cambion-fass':    'ISO VAULTS · MINING',
  'cambion-vome':    'CONSERVATION · MINERALS',
  'zariman-grineer': 'GRINEER BOUNTIES · VOIDPLUME',
  'zariman-corpus':  'CORPUS BOUNTIES · VOIDPLUME',
  'duviri-joy':      'JOY LOOP ACTIVE',
  'duviri-anger':    'ANGER LOOP ACTIVE',
  'duviri-envy':     'ENVY LOOP ACTIVE',
  'duviri-sorrow':   'SORROW LOOP ACTIVE',
  'duviri-fear':     'FEAR LOOP ACTIVE',
  'earth-day':       'OPEN WORLD',
  'earth-night':     'NIGHTTIME FISHING',
};

export function getStaticRewards(id: string, state: string): string {
  return STATIC_REWARDS[`${id}-${state}`] ?? '—';
}

// ---------------------------------------------------------------------------
// CycleCard
// ---------------------------------------------------------------------------

export interface CycleCardProps {
  status:    CycleStatus;
  featured?: boolean;
}

export function CycleCard({ status, featured = false }: CycleCardProps) {
  const { cycle, msRemaining, progress, isExpired } = status;
  const pres        = STATE[cycle.state] ?? FALLBACK;
  const { h, m, s } = formatMsParts(msRemaining);
  const nextState   = nextCycleState(cycle.id, cycle.state);
  const nextPres    = STATE[nextState] ?? FALLBACK;

  const bg        = getCardGradient(cycle.id, cycle.state);
  const rewards   = getStaticRewards(cycle.id, cycle.state);
  const minHeight = featured ? '280px' : '220px';

  const tintOverlay    = `linear-gradient(to left, ${pres.color}24 0%, ${pres.color}0A 55%, transparent 100%)`;
  const isEidolonNight = cycle.id === 'cetus' && cycle.state === 'night';

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        background:   bg,
        minHeight,
        borderRadius: '0.25rem',
        border:       `1px solid ${pres.color}1A`,
        boxShadow:    isEidolonNight
          ? `0 0 48px ${pres.color}18, 0 0 80px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.3)`
          : `0 0 40px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.3)`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: tintOverlay }} />

      {/* Filigree corners */}
      <span
        className="absolute top-0 left-0 w-6 h-6 pointer-events-none"
        style={{ borderTop: `1px solid ${pres.color}44`, borderLeft: `1px solid ${pres.color}44` }}
      />
      <span
        className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
        style={{ borderBottom: `1px solid ${pres.color}22`, borderRight: `1px solid ${pres.color}22` }}
      />

      {/* ── TOP BAR: location label + state pill ─────────────────────── */}
      <div className="relative flex items-center justify-between px-4 pt-3 pb-1">
        <p
          data-role="labelTiny"
          className="typo-label-xs"
          style={{ color: pres.color, opacity: 0.55 }}
        >
          {cycle.location}
        </p>

        <span
          data-role="labelTiny"
          className="typo-label-xs px-2 py-0.5"
          style={{
            color:           pres.color,
            border:          `1px solid ${pres.color}40`,
            backgroundColor: `${pres.color}12`,
            borderRadius:    '0.125rem',
          }}
        >
          {pres.badge}
        </span>
      </div>

      {/* ── HERO SECTION: world name + countdown + medallion ─────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-3 gap-2">

        <p
          data-role="labelSmall"
          className="typo-label-sm"
          style={{ color: 'rgba(229,226,225,1)', opacity: 0.35 }}
        >
          {cycle.name}
        </p>

        {/* HERO countdown — font-mono, intentionally not a token role */}
        <div className="flex items-baseline gap-0.5 leading-none">
          {h !== '00' && (
            <>
              <span
                className="font-mono font-bold tabular-nums"
                style={{
                  fontSize:   featured ? '3rem' : '2.5rem',
                  color:      pres.color,
                  textShadow: `0 0 24px ${pres.color}50`,
                }}
              >
                {h}
              </span>
              <span
                className="font-mono font-semibold text-secondary/25"
                style={{ fontSize: featured ? '1.1rem' : '0.95rem', marginRight: '0.25rem' }}
              >
                h
              </span>
            </>
          )}
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize:   featured ? '3rem' : '2.5rem',
              color:      pres.color,
              textShadow: `0 0 24px ${pres.color}50`,
            }}
          >
            {m}
          </span>
          <span
            className="font-mono font-semibold text-secondary/25"
            style={{ fontSize: featured ? '1.1rem' : '0.95rem', marginRight: '0.25rem' }}
          >
            m
          </span>
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize:   featured ? '3rem' : '2.5rem',
              color:      pres.color,
              textShadow: `0 0 24px ${pres.color}50`,
            }}
          >
            {s}
          </span>
          <span
            className="font-mono font-semibold text-secondary/25"
            style={{ fontSize: featured ? '1.1rem' : '0.95rem' }}
          >
            s
          </span>
        </div>

        {/* Transition label */}
        <p
          data-role="labelTiny"
          className="typo-label-xs"
          style={{ color: 'rgba(198,198,199,1)', opacity: 0.35 }}
        >
          {isExpired ? 'SYNCING…' : `UNTIL ${nextPres.badge}`}
        </p>

        {/* State medallion */}
        <div
          className="flex items-center justify-center mt-1"
          style={{
            width:           featured ? 72 : 58,
            height:          featured ? 72 : 58,
            borderRadius:    '50%',
            border:          `1px solid ${pres.color}30`,
            backgroundColor: `${pres.color}0D`,
            boxShadow:       `0 0 16px ${pres.color}18, inset 0 0 20px ${pres.color}08`,
            flexShrink:      0,
          }}
        >
          <span
            data-role="labelTiny"
            className="typo-label-xs text-center leading-tight"
            style={{
              fontSize: featured ? '0.6rem' : '0.55rem',
              color:    pres.color,
              padding:  '0 8px',
            }}
          >
            {pres.label}
          </span>
        </div>

        {/* Eidolon Night special badge */}
        {isEidolonNight && (
          <span
            data-role="labelTiny"
            className="typo-label-xs mt-0.5 px-2 py-0.5"
            style={{
              color:           pres.color,
              border:          `1px solid ${pres.color}50`,
              backgroundColor: `${pres.color}12`,
              borderRadius:    '0.125rem',
            }}
          >
            EIDOLON WINDOW
          </span>
        )}

      </div>

      {/* ── BOTTOM: progress strip + rewards footer ──────────────────── */}
      <div className="relative px-4 pb-3 pt-1">
        <div className="relative w-full h-px mb-2 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <div
            className="absolute inset-y-0 left-0 h-full"
            style={{
              width:           `${progress * 100}%`,
              backgroundColor: pres.color,
              boxShadow:       `0 0 4px ${pres.color}`,
              transition:      'width 1s linear',
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p
            data-role="labelTiny"
            className="typo-label-xs"
            style={{ color: pres.color, opacity: 0.35 }}
          >
            ACTIVE: {rewards}
          </p>
          <p
            data-role="labelTiny"
            className="typo-label-xs"
            style={{ color: nextPres.color, opacity: 0.5 }}
          >
            → {nextPres.badge}
          </p>
        </div>
      </div>
    </div>
  );
}
