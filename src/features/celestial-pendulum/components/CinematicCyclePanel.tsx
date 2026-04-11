import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';
import type { SyndicateMission } from '@/core/domain/syndicates';
import { STATE, FALLBACK, getCardGradient } from './CycleCard';
import { BountyJobList } from './BountyJobList';
import { getWorldBg } from '../worldAssets';

// ── Static world lore ──────────────────────────────────────────────────────

const WORLD_ABOUT: Record<string, string> = {
  cetus:
    'The Plains of Eidolon stretch beyond the colony of Cetus, a trading hub where the Ostron people thrive. At night, massive Sentient Eidolons roam the landscape — remnants of a vast Sentient destroyed during the Old War. Tenno brave enough to face them can earn Arcanes and Operator Amps.',
  vallis:
    "The Orb Vallis is a terraformed Venusian plateau controlled by Nef Anyo's Corpus operations. The enslaved Solaris United work in its debt-vaults beneath the surface. During cold snaps, rare Toroids emerge — essential materials for advancing Vent Kids standings and Operator Amps.",
  cambion:
    'The Cambion Drift is the Infestation-ravaged landscape of Deimos, home to the partially-infested Entrati family. Isolation Vaults hold Orokin secrets guarded by ancient Necramechs. The alternating Fass and Vome cycles determine which resources and enemies are most abundant.',
  zariman:
    'The Zariman Ten Zero vanished into the Void for fifty years, returning with its young colonists forever changed by Void exposure. Now held by the Holdfasts, its corridors contain unique Void-touched resources. Corpus and Grineer factions vie for control of its decks.',
  duviri:
    'Duviri is an impossible realm within the Void, shaped by the ever-shifting moods of Dominus Thrax. Tenno enter as Drifters, separated from their Warframes. The current Spiral mood determines enemy behavior, decree types, and rewards available from the circuit.',
  earth:
    "Earth's forests have long since reclaimed humanity's first cities. The Grineer hold the surface while the Ostron colony of Cetus endures on the edge of the Plains. The open world offers unique fishing opportunities and rare encounters with Grineer patrol squads.",
};

const WORLD_HINT: Record<string, string> = {
  'cetus-day':       'Eidolon hunts available at night — bring Amp and Void Strike',
  'cetus-night':     'Eidolons active — hunt Teralyst, Gantulyst, Hydrolyst for Arcanes',
  'vallis-warm':     'Wildlife spawns increased — optimal for conservation and rare fish',
  'vallis-cold':     'Toroid drop rates increased — check Enrichment Labs and Temple of Profit',
  'cambion-fass':    'Isolation Vaults unlocked — bring Necramech and Helminth Charger',
  'cambion-vome':    'Conservation active — Son tokens available from rare wildlife encounters',
  'zariman-corpus':  'Corpus Bounties active — Voidplume Wings and Drifter Intrinsics available',
  'zariman-grineer': 'Grineer Bounties active — Voidplume Wings and Drifter Intrinsics available',
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
    { icon: '◆', name: 'Nyth',              source: 'Mining (rare)' },
  ],
  'cetus-night': [
    { icon: '✦', name: 'Arcane Energize',   source: 'Eidolon hunts' },
    { icon: '◆', name: 'Cetus Wisp',        source: 'Plains (glowing)' },
    { icon: '◈', name: 'Brilliant Shard',   source: 'Eidolons' },
    { icon: '◇', name: 'Intact Core',       source: 'Sentients' },
  ],
  'vallis-warm': [
    { icon: '◆', name: 'Thermal Sludge',     source: 'Mining' },
    { icon: '✦', name: 'Thumper Organs',     source: 'Thumper kills' },
    { icon: '◈', name: 'Mytocardia Spore',   source: 'Conservation' },
    { icon: '◎', name: 'Dusklight Sarracenia', source: 'Plains flora' },
  ],
  'vallis-cold': [
    { icon: '◆', name: 'Toroid',             source: 'Orb encounters' },
    { icon: '✦', name: 'Field Ron',          source: 'Mining' },
    { icon: '◈', name: 'Marquise Thyst',     source: 'Mining (rare)' },
    { icon: '◇', name: 'Foxglove Sunflower', source: 'Bounty rewards' },
  ],
  'cambion-fass': [
    { icon: '◆', name: 'Anomaly Shard',      source: 'Isolation Vaults' },
    { icon: '✦', name: 'Sporulate Sac',      source: 'Infested nodes' },
    { icon: '◈', name: 'Fass Residue',       source: 'Fass worm' },
    { icon: '◎', name: 'Thaumica',           source: 'Mining' },
  ],
  'cambion-vome': [
    { icon: '◆', name: 'Vome Residue',       source: 'Vome worm' },
    { icon: '✦', name: 'Pustulite',          source: 'Mining' },
    { icon: '◈', name: 'Latrox Une',         source: 'Conservation' },
    { icon: '◇', name: 'Biotic',             source: 'Infested cysts' },
  ],
  'zariman-corpus': [
    { icon: '◆', name: 'Voidplume Quill',    source: 'Zariman mobs' },
    { icon: '✦', name: 'Voidplume Crest',    source: 'Bounty rewards' },
    { icon: '◈', name: 'HoldFast Token',     source: 'Bounties' },
    { icon: '◇', name: 'Incarnon Genesis',   source: 'Circuit rewards' },
  ],
  'zariman-grineer': [
    { icon: '◆', name: 'Voidplume Quill',    source: 'Zariman mobs' },
    { icon: '✦', name: 'Voidplume Crest',    source: 'Bounty rewards' },
    { icon: '◈', name: 'HoldFast Token',     source: 'Bounties' },
    { icon: '◇', name: 'Incarnon Genesis',   source: 'Circuit rewards' },
  ],
};

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

  const bgUrl        = getWorldBg(cycle.id, cycle.state);
  const cssGradient  = getCardGradient(cycle.id, cycle.state);
  const hasBounties  = !!syndicateMission && syndicateMission.jobs.length > 0;
  const resources    = KEY_RESOURCES[`${cycle.id}-${cycle.state}`] ?? [];
  const aboutText    = WORLD_ABOUT[cycle.id] ?? '';
  const hintText     = WORLD_HINT[`${cycle.id}-${cycle.state}`] ?? '';

  const timerParts: { val: string; unit: string }[] = [];
  if (h !== '00') timerParts.push({ val: h, unit: 'H' });
  timerParts.push({ val: m, unit: 'M' }, { val: s, unit: 'S' });

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{ background: cssGradient, minHeight: 0 }}
    >
      {/* ── Background image (local asset) ────────────────────────────────── */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          style={{ zIndex: 0 }}
        />
      )}

      {/* ── Vignette overlay ──────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.60) 38%, rgba(0,0,0,0.18) 65%, rgba(0,0,0,0.55) 100%)',
            'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.55) 100%)',
          ].join(', '),
          zIndex: 1,
        }}
      />

      {/* ── Two-column content ────────────────────────────────────────────── */}
      <div
        className="relative h-full flex"
        style={{ zIndex: 6, padding: '32px 48px 32px 44px', gap: 48 }}
      >

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div
          className="flex flex-col"
          style={{ flex: '0 0 60%', minWidth: 0, overflowY: 'auto', scrollbarWidth: 'none' }}
        >

          {/* World title */}
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
              marginBottom:  8,
            }}
          >
            {cycle.name}
          </h2>

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

          {/* Timer */}
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
                color:        'rgba(198,198,199,0.52)',
                marginBottom: 24,
                lineHeight:   1.5,
              }}
            >
              {hintText}
            </p>
          )}

          {/* KEY RESOURCES */}
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
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                {resources.map(res => (
                  <div
                    key={res.name}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                  >
                    <span style={{ color: '#E3C372', opacity: 0.65, fontSize: '0.62rem', marginTop: 3, flexShrink: 0 }}>
                      {res.icon}
                    </span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 500, color: 'rgba(229,226,225,0.88)', lineHeight: 1.2 }}>
                        {res.name}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.52rem', color: 'rgba(198,198,199,0.38)', letterSpacing: '0.04em', marginTop: 2 }}>
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

          {/* BOUNTY BOARD */}
          {hasBounties ? (
            <BountyJobList
              jobs={syndicateMission!.jobs}
              accentColor={pres.color}
              expiryMs={syndicateMission!.expiryMs}
              now={now}
              worldId={cycle.id}
            />
          ) : (
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.55em', color: 'rgba(227,195,114,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
                Bounty Board
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'rgba(198,198,199,0.30)', fontStyle: 'italic' }}>
                No active bounties for this cycle
              </p>
            </div>
          )}
        </div>

        {/* ══ RIGHT COLUMN ══════════════════════════════════════════════════ */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>

          {/* State badge */}
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

          <div style={{ flex: 1 }} />

          {/* About section */}
          {aboutText && (
            <div>
              <p
                style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      '0.48rem',
                  fontWeight:    700,
                  letterSpacing: '0.42em',
                  color:         'rgba(227,195,114,0.50)',
                  textTransform: 'uppercase',
                  marginBottom:  10,
                }}
              >
                About {cycle.name}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize:   '0.72rem',
                  color:      'rgba(198,198,199,0.58)',
                  lineHeight: 1.68,
                }}
              >
                {aboutText}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
