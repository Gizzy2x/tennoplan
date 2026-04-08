import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';

// ---------------------------------------------------------------------------
// State presentation config
// ---------------------------------------------------------------------------

interface StatePresentation {
  label:     string;  // full state name
  badge:     string;  // short indicator shown in the state pill
  color:     string;  // hex — used for glow, ring, countdown digits
  nextLabel: string;  // what the *next* state is called (shown in transition line)
}

const STATE: Record<string, StatePresentation> = {
  // Cetus / Earth
  day:     { label: 'DAY CYCLE',          badge: 'DAY',     color: '#E3C372', nextLabel: 'NIGHT'           },
  night:   { label: 'NIGHT CYCLE',        badge: 'NIGHT',   color: '#bac3fe', nextLabel: 'DAY'             },
  // Orb Vallis
  warm:    { label: 'THERMAL SURGE',      badge: 'WARM',    color: '#fb923c', nextLabel: 'COLD FRONT'      },
  cold:    { label: 'COLD FRONT',         badge: 'COLD',    color: '#67e8f9', nextLabel: 'WARM SURGE'      },
  // Cambion Drift
  fass:    { label: 'FASS ASCENDANT',     badge: 'FASS',    color: '#fb923c', nextLabel: 'VOME'            },
  vome:    { label: 'VOME ASCENDANT',     badge: 'VOME',    color: '#c084fc', nextLabel: 'FASS'            },
  // Zariman Ten Zero
  corpus:  { label: 'CORPUS CONTROL',     badge: 'CORPUS',  color: '#60a5fa', nextLabel: 'GRINEER ADV.'    },
  grineer: { label: 'GRINEER OCCUPATION', badge: 'GRINEER', color: '#f87171', nextLabel: 'CORPUS RET.'     },
  // Duviri moods
  joy:     { label: 'JOY',               badge: 'JOY',     color: '#E3C372', nextLabel: 'ANGER APPROACHES' },
  anger:   { label: 'ANGER',             badge: 'ANGER',   color: '#ef4444', nextLabel: 'ENVY RISES'       },
  envy:    { label: 'ENVY',              badge: 'ENVY',    color: '#22c55e', nextLabel: 'SORROW FALLS'     },
  sorrow:  { label: 'SORROW',            badge: 'SORROW',  color: '#60a5fa', nextLabel: 'FEAR COMES'       },
  fear:    { label: 'FEAR',              badge: 'FEAR',    color: '#a855f7', nextLabel: 'JOY RETURNS'      },
};

const FALLBACK: StatePresentation = STATE.day;

// ---------------------------------------------------------------------------
// World background gradients — atmospheric CSS gradients per world + state
// ---------------------------------------------------------------------------

const CARD_GRADIENT: Record<string, string> = {
  'cetus-day':       'linear-gradient(135deg, #1a1200 0%, #2a1a06 100%)',
  'cetus-night':     'linear-gradient(135deg, #060c18 0%, #0d1828 100%)',
  'vallis-warm':     'linear-gradient(135deg, #1a1200 0%, #2a1508 100%)',
  'vallis-cold':     'linear-gradient(135deg, #060f1a 0%, #091525 100%)',
  'cambion-fass':    'linear-gradient(135deg, #150c00 0%, #1a1000 100%)',
  'cambion-vome':    'linear-gradient(135deg, #060f06 0%, #080d05 100%)',
  'zariman-grineer': 'linear-gradient(135deg, #150808 0%, #110606 100%)',
  'zariman-corpus':  'linear-gradient(135deg, #060c18 0%, #080f1f 100%)',
  'duviri-joy':      'linear-gradient(135deg, #1a1500 0%, #201800 100%)',
  'duviri-anger':    'linear-gradient(135deg, #1a0600 0%, #180400 100%)',
  'duviri-envy':     'linear-gradient(135deg, #061a06 0%, #041504 100%)',
  'duviri-sorrow':   'linear-gradient(135deg, #060f1a 0%, #081525 100%)',
  'duviri-fear':     'linear-gradient(135deg, #100615 0%, #0d0512 100%)',
  'earth-day':       'linear-gradient(135deg, #0a1200 0%, #101a05 100%)',
  'earth-night':     'linear-gradient(135deg, #060812 0%, #0a0c18 100%)',
};

function getCardGradient(id: string, state: string): string {
  return CARD_GRADIENT[`${id}-${state}`]
    ?? 'linear-gradient(135deg, #131313 0%, #1c1b1b 100%)';
}

// ---------------------------------------------------------------------------
// Static rewards — hardcoded game knowledge per world + state
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

function getStaticRewards(id: string, state: string): string {
  return STATIC_REWARDS[`${id}-${state}`] ?? '—';
}

// ---------------------------------------------------------------------------
// CycleCard
// ---------------------------------------------------------------------------

export interface CycleCardProps {
  status:    CycleStatus;
  featured?: boolean;  // Row-1 cards: taller (≥280px). Row-2: standard (≥220px).
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

  // Right-to-left state tint overlay (10–14% opacity)
  const tintOverlay = `linear-gradient(to left, ${pres.color}24 0%, ${pres.color}0A 55%, transparent 100%)`;

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
      {/* Right-to-left state tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: tintOverlay }}
      />

      {/* Filigree corners */}
      <span
        className="absolute top-0 left-0 w-6 h-6 pointer-events-none"
        style={{ borderTop: `1px solid ${pres.color}44`, borderLeft: `1px solid ${pres.color}44` }}
      />
      <span
        className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
        style={{ borderBottom: `1px solid ${pres.color}22`, borderRight: `1px solid ${pres.color}22` }}
      />

      {/* ── TOP BAR: location label + state pill ───────────────────── */}
      <div className="relative flex items-center justify-between px-4 pt-3 pb-1">
        <p
          className="font-label text-[9px] uppercase tracking-[0.35em]"
          style={{ color: pres.color, opacity: 0.55 }}
        >
          {cycle.location}
        </p>

        <span
          className="font-label text-[8px] uppercase tracking-[0.18em] px-2 py-0.5"
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

        {/* World name — smaller, sits above the countdown */}
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface/35">
          {cycle.name}
        </p>

        {/* HERO countdown */}
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
        <p className="font-label text-[9px] uppercase tracking-[0.28em] text-secondary/35">
          {isExpired ? 'SYNCING…' : `UNTIL ${nextPres.badge}`}
        </p>

        {/* State medallion — circular badge */}
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
            className="font-label font-bold uppercase text-center leading-tight"
            style={{
              fontSize:      featured ? '0.6rem' : '0.55rem',
              letterSpacing: '0.12em',
              color:         pres.color,
              padding:       '0 8px',
            }}
          >
            {pres.label}
          </span>
        </div>

        {/* Eidolon Night special badge */}
        {isEidolonNight && (
          <span
            className="font-label text-[8px] uppercase tracking-widest px-2 py-0.5 mt-0.5"
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

      {/* ── BOTTOM: progress strip + rewards footer ─────────────────── */}
      <div className="relative px-4 pb-3 pt-1">

        {/* Thin progress strip */}
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

        {/* Next state footer */}
        <div className="flex items-center justify-between">
          <p
            className="font-label text-[8px] uppercase tracking-[0.18em]"
            style={{ color: pres.color, opacity: 0.35 }}
          >
            ACTIVE: {rewards}
          </p>
          <p
            className="font-label text-[8px] uppercase tracking-[0.15em]"
            style={{ color: nextPres.color, opacity: 0.5 }}
          >
            → {nextPres.badge}
          </p>
        </div>

      </div>
    </div>
  );
}
