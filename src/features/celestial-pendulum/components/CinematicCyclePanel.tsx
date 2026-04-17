import { useRef, useState } from 'react';
import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';
import type { SyndicateMission } from '@/core/domain/syndicates';
import { STATE, FALLBACK } from './CycleCard';
import { BountyJobList } from './BountyJobList';
import { useEnrichedBounties } from '../hooks/useEnrichedBounties';

// ── Static world lore ──────────────────────────────────────────────────────

const WORLD_ABOUT: Record<string, string> = {
  cetus:
    'The Plains of Eidolon stretch beyond the colony of Cetus, a trading hub where the Ostron people thrive. At night, massive Sentient Eidolons roam the landscape — remnants of a vast Sentient destroyed during the Old War. Tenno brave enough to face them can earn Arcanes and Operator Amps.',
  vallis:
    "Beneath the frozen surface of Venus lies Fortuna, a debt-internment colony. The Solaris United resistance fights against Nef Anyo's Corpus regime. Above ground, the Orb Vallis cycles between frigid cold and brief warmth, each state affecting the wildlife and bounty availability.",
  cambion:
    'Deimos, the Infested moon, houses the Entrati family in the Necralisk. The Cambion Drift is a nightmarish landscape where two wyrms — Fass and Vome — battle eternally. Their cycle determines which Infested resources appear and affects the behavior of the local fauna.',
  zariman:
    'The Zariman Ten Zero was a colony ship lost in the Void, its passengers transformed by Void exposure. Now partially restored, it serves as a hub for Tenno operations. The ship alternates between Grineer and Corpus incursions, each bringing different enemies and mission modifiers.',
  duviri:
    'Duviri is an impossible realm within the Void, shaped by the ever-shifting moods of Dominus Thrax. Tenno enter as Drifters, separated from their Warframes. The current Spiral mood determines enemy behavior, decree types, and rewards available from the circuit.',
  earth:
    "Earth's forests have long since reclaimed humanity's first cities. The Grineer hold the surface while the Ostron colony of Cetus endures on the edge of the Plains. The open world offers unique fishing opportunities and rare encounters with Grineer patrol squads.",
};

const WORLD_HINT: Record<string, string> = {
  'cetus-day':       'Eidolon hunts available at night — bring Amp and Void Strike',
  'cetus-night':     'Eidolons active — hunt Teralyst, Gantulyst, Hydrolyst for Arcanes',
  'vallis-warm':     'Exploiter Orb requires warm cycle — Profit-Taker available anytime',
  'vallis-cold':     'Exploiter Orb requires warm cycle — Profit-Taker available anytime',
  'cambion-fass':    'Residue type changes with cycle — collect both for max standing',
  'cambion-vome':    'Residue type changes with cycle — collect both for max standing',
  'zariman-corpus':  'Faction determines mission enemies and Incarnon rotations',
  'zariman-grineer': 'Faction determines mission enemies and Incarnon rotations',
  'duviri-joy':      'Joy Spiral — speed and combat efficiency decrees available this cycle',
  'duviri-anger':    'Anger Spiral — powerful but chaotic decrees active, high risk',
  'duviri-envy':     'Envy Spiral — resource acquisition bonuses active this cycle',
  'duviri-sorrow':   'Sorrow Spiral — stealth and evasion decrees available',
  'duviri-fear':     'Fear Spiral — high-risk, high-reward encounter modifiers active',
  'earth-day':       'Cetus Wisps spawn near water — check the Plains during day',
  'earth-night':     'Rare fish spawns increased — bring Luminous Dye for night fishing',
};

interface KeyResource { icon: string; name: string; source: string; }

const KEY_RESOURCES: Partial<Record<string, KeyResource[]>> = {
  'cetus-day': [
    { icon: '◆', name: 'Cetus Wisp',        source: 'Plains (night)' },
    { icon: '✦', name: 'Breath of Eidolon',  source: 'Bounties Lv.4+' },
    { icon: '◈', name: 'Iradite',            source: 'Rock formations' },
    { icon: '◎', name: 'Grokdrul',           source: 'Grineer camps' },
    { icon: '◇', name: 'Sentirum',           source: 'Mining (rare)' },
    { icon: '◆', name: 'Nyth',               source: 'Mining (rare)' },
  ],
  'cetus-night': [
    { icon: '✦', name: 'Arcane Energize',    source: 'Eidolon hunts' },
    { icon: '◆', name: 'Cetus Wisp',         source: 'Plains (glowing)' },
    { icon: '◈', name: 'Brilliant Shard',    source: 'Eidolons' },
    { icon: '◇', name: 'Intact Core',        source: 'Sentients' },
  ],
  'vallis-warm': [
    { icon: '◆', name: 'Gyromag Systems',    source: 'Heist bounties' },
    { icon: '✦', name: 'Repeller Systems',   source: 'Profit-Taker bounty' },
    { icon: '◈', name: 'Atmo Systems',       source: 'Coolant pools' },
    { icon: '◎', name: 'Thermal Sludge',     source: 'Mining' },
    { icon: '◇', name: 'Mytocardia Spore',   source: 'Conservation' },
  ],
  'vallis-cold': [
    { icon: '◎', name: 'Toroid',             source: 'Spiders & caves' },
    { icon: '✦', name: 'Repeller Systems',   source: 'Profit-Taker bounty' },
    { icon: '◈', name: 'Gyromag Systems',    source: 'Heist bounties' },
    { icon: '◎', name: 'Thermal Sludge',     source: 'Coolant pools' },
    { icon: '◇', name: 'Amarast',            source: 'Mining' },
  ],
  'cambion-fass': [
    { icon: '✦', name: 'Scintillant',        source: 'Isolation Vaults' },
    { icon: '◎', name: 'Son Tokens',         source: 'Conservation' },
    { icon: '◈', name: 'Mother Tokens',      source: 'Bounties' },
    { icon: '◆', name: 'Father Tokens',      source: 'Parts trading' },
    { icon: '◇', name: 'Ganglion',           source: 'Infested deposits' },
  ],
  'cambion-vome': [
    { icon: '◆', name: 'Vome Residue',       source: 'Vome worm' },
    { icon: '✦', name: 'Pustulite',          source: 'Mining' },
    { icon: '◈', name: 'Son Tokens',         source: 'Conservation' },
    { icon: '◇', name: 'Mother Tokens',      source: 'Bounties' },
    { icon: '◆', name: 'Ganglion',           source: 'Infested deposits' },
  ],
  'zariman-corpus': [
    { icon: '◆', name: 'Voidplume Quill',    source: 'Bounties Lv.3' },
    { icon: '✦', name: 'Voidplume Down',     source: 'Bounties Lv.2' },
    { icon: '◈', name: 'Holdfast Token',     source: 'Bounties' },
    { icon: '◇', name: 'Incarnon Genesis',   source: 'Bounties rare' },
  ],
  'zariman-grineer': [
    { icon: '◆', name: 'Voidplume Quill',    source: 'Bounties Lv.3' },
    { icon: '✦', name: 'Voidplume Down',     source: 'Bounties Lv.2' },
    { icon: '◈', name: 'Holdfast Token',     source: 'Bounties' },
    { icon: '◇', name: 'Incarnon Genesis',   source: 'Bounties rare' },
  ],
};

// ── Special missions (hardcoded game knowledge) ────────────────────────────

interface SpecialMission {
  name:      string;
  type:      string;
  rotation?: 'A' | 'B' | 'C';
  levels:    string;
  icon:      string;
}

const SPECIAL_MISSIONS: Partial<Record<string, SpecialMission[]>> = {
  cambion: [
    { name: 'Isolation Vault T1', type: 'Vault',          levels: 'Lv. 30-40', icon: '◈' },
    { name: 'Isolation Vault T2', type: 'Vault',          levels: 'Lv. 40-50', icon: '◈' },
    { name: 'Isolation Vault T3', type: 'Vault',          levels: 'Lv. 50-60', icon: '◈' },
  ],
  zariman: [
    { name: 'Cascade',           type: 'Exterminate',    rotation: 'A', levels: 'Lv. 50-55', icon: '✗' },
    { name: 'Halako Perimeter',  type: 'Mobile Defense', rotation: 'B', levels: 'Lv. 50-55', icon: '✗' },
    { name: 'Void Flood',        type: 'Survival',       rotation: 'C', levels: 'Lv. 50-55', icon: '✗' },
  ],
};

// ── Info Popover ───────────────────────────────────────────────────────────
// Uses position:fixed so it escapes any overflow:hidden ancestor.

interface InfoPopoverProps {
  text:        string;
  worldName:   string;
  accentColor: string;
}

function InfoPopover({ text, worldName, accentColor }: InfoPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const btnRef                = useRef<HTMLButtonElement>(null);

  function handleMouseEnter() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 10, left: r.left });
    }
    setVisible(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:           18,
          height:          18,
          flexShrink:      0,
          alignSelf:       'flex-end',
          marginBottom:    '0.28em',
          marginLeft:      10,
          fontFamily:      'var(--font-body)',
          fontSize:        '0.68rem',
          fontWeight:      700,
          color:           accentColor,
          opacity:         0.45,
          border:          `1px solid ${accentColor}30`,
          background:      `${accentColor}0A`,
          cursor:          'default',
          transition:      'opacity 0.15s, border-color 0.15s',
          lineHeight:      1,
        }}
        onFocus={handleMouseEnter}
        onBlur={() => setVisible(false)}
        aria-label={`About ${worldName}`}
      >
        ⓘ
      </button>

      {visible && (
        <div
          style={{
            position:           'fixed',
            top:                pos.top,
            left:               pos.left,
            zIndex:             9999,
            maxWidth:           340,
            background:         'rgba(10,10,12,0.92)',
            backdropFilter:     'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border:             `1px solid ${accentColor}28`,
            boxShadow:          `0 8px 40px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset`,
            padding:            '14px 16px',
            pointerEvents:      'none',
          }}
        >
          <p
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      '0.46rem',
              fontWeight:    700,
              letterSpacing: '0.38em',
              color:         accentColor,
              opacity:       0.65,
              textTransform: 'uppercase',
              marginBottom:  8,
            }}
          >
            About {worldName}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize:   '0.68rem',
              color:      'rgba(198,198,199,0.84)',
              lineHeight: 1.65,
            }}
          >
            {text}
          </p>
        </div>
      )}
    </>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export interface CinematicCyclePanelProps {
  status:            CycleStatus;
  syndicateMission?: SyndicateMission | null;
  now?:              number;
}

export function CinematicCyclePanel({
  status,
  syndicateMission,
  now = Date.now(),
}: CinematicCyclePanelProps) {
  const { cycle, msRemaining, isExpired } = status;
  const pres      = STATE[cycle.state] ?? FALLBACK;
  const nextState = nextCycleState(cycle.id, cycle.state);
  const nextPres  = STATE[nextState] ?? FALLBACK;
  const { h, m, s } = formatMsParts(msRemaining);

  const hasBounties = !!syndicateMission && syndicateMission.jobs.length > 0;

  // Phase 2: enrich bounties with real drop data + cycle context.
  // Safe to call unconditionally — the hook no-ops for worlds without bounties.
  const { bounties: enrichedBounties, cycleNote } = useEnrichedBounties(
    syndicateMission,
    cycle.id,
    cycle.state,
  );

  const resources   = KEY_RESOURCES[`${cycle.id}-${cycle.state}`] ?? [];
  const aboutText   = WORLD_ABOUT[cycle.id] ?? '';
  const hintText    = WORLD_HINT[`${cycle.id}-${cycle.state}`] ?? '';
  const specials    = SPECIAL_MISSIONS[cycle.id] ?? [];

  const timerParts: { val: string; unit: string }[] = [];
  if (h !== '00') timerParts.push({ val: h, unit: 'H' });
  timerParts.push({ val: m, unit: 'M' }, { val: s, unit: 'S' });

  return (
    <div
      className="relative flex-1"
      style={{ minHeight: 0, height: '100%', overflow: 'hidden' }}
    >
      {/* ── Two-column content ────────────────────────────────────────────── */}
      <div
        className="relative flex"
        style={{ zIndex: 6, padding: '32px 48px 32px 44px', gap: 48, height: '100%' }}
      >

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div
          className="flex flex-col"
          style={{ flex: '0 0 60%', minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', height: '100%' }}
        >

          {/* World title + info icon */}
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 8 }}>
            <h2
              style={{
                fontFamily:    'var(--font-headline)',
                fontWeight:    900,
                fontSize:      'clamp(2.4rem, 4.8vw, 5.2rem)',
                lineHeight:    1,
                color:         '#E3C372',
                textShadow:    '0 2px 32px rgba(0,0,0,0.98), 0 0 80px rgba(227,195,114,0.12)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {cycle.name}
            </h2>
            {aboutText && (
              <InfoPopover
                text={aboutText}
                worldName={cycle.name}
                accentColor={pres.color}
              />
            )}
          </div>

          {/* Location subtitle */}
          <p
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      '0.62rem',
              fontWeight:    500,
              letterSpacing: '0.45em',
              color:         'rgba(227,195,114,0.50)',
              textTransform: 'uppercase',
              marginBottom:  18,
            }}
          >
            {cycle.location}
          </p>

          {/* Countdown timer */}
          <div
            style={{
              display:      'flex',
              alignItems:   'flex-end',
              gap:          4,
              marginBottom: 10,
              flexWrap:     'nowrap',
            }}
          >
            {timerParts.map(({ val, unit }, i) => (
              <div key={unit} style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span
                  style={{
                    fontFamily:         'var(--font-headline)',
                    fontWeight:         900,
                    fontSize:           'clamp(2.2rem, 4.2vw, 4.8rem)',
                    lineHeight:         0.9,
                    color:              '#E3C372',
                    textShadow:         '0 2px 28px rgba(0,0,0,0.98)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {val}
                </span>
                <span
                  style={{
                    fontFamily:    'var(--font-headline)',
                    fontWeight:    700,
                    fontSize:      'clamp(1rem, 2vw, 2rem)',
                    color:         '#E3C372',
                    opacity:       0.40,
                    lineHeight:    1,
                    paddingBottom: '0.14em',
                    marginRight:   i < timerParts.length - 1 ? 8 : 0,
                  }}
                >
                  {unit}
                </span>
              </div>
            ))}
          </div>

          {/* Hint text */}
          {hintText && (
            <p
              style={{
                fontFamily:   'var(--font-body)',
                fontSize:     '0.72rem',
                fontStyle:    'italic',
                color:        'rgba(198,198,199,0.78)',
                textShadow:   '0 1px 6px rgba(0,0,0,0.90)',
                marginBottom: 24,
                lineHeight:   1.5,
              }}
            >
              {hintText}
            </p>
          )}

          {/* ── KEY RESOURCES ───────────────────────────────────────────── */}
          {resources.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p
                style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      '0.48rem',
                  fontWeight:    700,
                  letterSpacing: '0.55em',
                  color:         'rgba(227,195,114,0.50)',
                  textTransform: 'uppercase',
                  marginBottom:  12,
                }}
              >
                Key Resources
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {resources.map(res => (
                  <div
                    key={res.name}
                    style={{
                      display:    'flex',
                      alignItems: 'flex-start',
                      gap:        8,
                      padding:    '7px 11px',
                      border:     '1px solid rgba(227,195,114,0.22)',
                      background: 'rgba(0,0,0,0.28)',
                    }}
                  >
                    <span style={{ color: '#E3C372', opacity: 0.65, fontSize: '0.62rem', marginTop: 3, flexShrink: 0 }}>
                      {res.icon}
                    </span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 500, color: 'rgba(229,226,225,0.95)', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}>
                        {res.name}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.52rem', color: 'rgba(198,198,199,0.62)', letterSpacing: '0.04em', marginTop: 2 }}>
                        {res.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              height:       1,
              background:   'linear-gradient(to right, rgba(227,195,114,0.18) 0%, rgba(227,195,114,0.06) 100%)',
              marginBottom: 16,
              flexShrink:   0,
            }}
          />

          {/* ── BOUNTY BOARD ─────────────────────────────────────────────── */}
          {hasBounties ? (
            <BountyJobList
              bounties={enrichedBounties}
              accentColor={pres.color}
              worldId={cycle.id}
              cycleNote={cycleNote}
            />
          ) : (
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.55em', color: 'rgba(227,195,114,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
                Bounty Board
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'rgba(198,198,199,0.55)', fontStyle: 'italic', textShadow: '0 1px 4px rgba(0,0,0,0.80)' }}>
                No active bounties for this cycle
              </p>
            </div>
          )}

          {/* ── SPECIAL MISSIONS ─────────────────────────────────────────── */}
          {specials.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p
                style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      '0.48rem',
                  fontWeight:    700,
                  letterSpacing: '0.55em',
                  color:         'rgba(227,195,114,0.50)',
                  textTransform: 'uppercase',
                  marginBottom:  10,
                }}
              >
                Special Missions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {specials.map(m => (
                  <div
                    key={m.name}
                    style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        10,
                      padding:    '7px 0',
                      borderTop:  '1px solid rgba(227,195,114,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width:           28,
                        height:          28,
                        flexShrink:      0,
                        display:         'flex',
                        alignItems:      'center',
                        justifyContent:  'center',
                        background:      `${pres.color}12`,
                        border:          `1px solid ${pres.color}28`,
                      }}
                    >
                      <span style={{ fontSize: '0.70rem', color: pres.color, opacity: 0.75 }}>
                        {m.icon}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily:    'var(--font-body)',
                          fontSize:      '0.64rem',
                          fontWeight:    700,
                          color:         'rgba(229,226,225,0.95)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          textShadow:    '0 1px 4px rgba(0,0,0,0.85)',
                        }}
                      >
                        {m.name}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.52rem', color: 'rgba(198,198,199,0.45)', marginTop: 2 }}>
                        {m.type}
                        {m.rotation && (
                          <span style={{ marginLeft: 6, color: pres.color, opacity: 0.70, letterSpacing: '0.08em' }}>
                            · ⊕ {m.rotation}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      style={{
                        fontFamily:    'var(--font-body)',
                        fontSize:      '0.50rem',
                        color:         'rgba(198,198,199,0.40)',
                        letterSpacing: '0.06em',
                        flexShrink:    0,
                        whiteSpace:    'nowrap',
                      }}
                    >
                      {m.levels}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT COLUMN ══════════════════════════════════════════════════ */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>

          {/* State badge — top right */}
          <div style={{ alignSelf: 'flex-end', textAlign: 'right', marginBottom: 10 }}>
            <span
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:           7,
                fontFamily:    'var(--font-body)',
                fontSize:      '0.58rem',
                fontWeight:    700,
                letterSpacing: '0.28em',
                color:         pres.color,
                border:        `1px solid ${pres.color}48`,
                background:    `${pres.color}0D`,
                padding:       '5px 14px',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ fontSize: '0.80rem', lineHeight: 1 }}>{pres.icon}</span>
              {pres.badge}
            </span>
            <p
              style={{
                fontFamily:    'var(--font-body)',
                fontSize:      '0.46rem',
                letterSpacing: '0.32em',
                color:         'rgba(198,198,199,0.30)',
                textTransform: 'uppercase',
                marginTop:     6,
              }}
            >
              {isExpired ? 'SYNCING…' : `UNTIL ${nextPres.badge}`}
            </p>
          </div>

          {/* Right column: spacer — about section is now in info popover */}
          <div style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}
