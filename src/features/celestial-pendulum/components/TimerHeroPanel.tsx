/**
 * TimerHeroPanel — full-width cinematic hero section.
 *
 * Layout:
 *   Left (fixed 300px): translucent panel with cycle state + countdown
 *   Right (flex): Key Resources grid using ResourceTag
 *
 * The world image fills the entire background. A dark→transparent gradient
 * ensures left-side text always reads regardless of image.
 * Cycle notes (e.g. "EIDOLON HUNTING WINDOW") appear as a teal callout.
 */

import { ResourceTag } from '@/components/ui/ResourceTag';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyResource {
  name:   string;
  source: string;
}

interface TimerHeroPanelProps {
  /** No longer used for an image layer — WorldBackground (fixed) is the source.
   *  Kept in the interface for future use (e.g. alt text, analytics). */
  backgroundImage?: string;
  /** Cycle state label, e.g. "DAY", "NIGHT", "WARM", "COLD", "FASS" */
  state:            string;
  /** Pre-formatted time string, e.g. "2H: 14M" */
  timeRemaining:    string;
  /** Optional special note surfaced from cycleNote, e.g. "Eidolon Hunting Window" */
  cycleNote?:       string | null;
  resources:        KeyResource[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimerHeroPanel({
  state,
  timeRemaining,
  cycleNote,
  resources,
}: TimerHeroPanelProps) {
  return (
    <div className="timer-hero" style={{ marginBottom: 8 }}>

      {/* No background image here — WorldBackground (position:fixed) is already
          visible through the transparent right portion of this panel's gradient.
          This panel is a "window" into the world, not a duplicate image render. */}

      {/* Subtle scrim to protect left-side text */}
      <div className="timer-hero-gradient" />

      {/* Content row */}
      <div className="timer-hero-content">

        {/* ── Left: Timer panel ─────────────────────────────────────────── */}
        <div className="timer-hero-panel">

          {/* "CURRENT CYCLE" micro label */}
          <div style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      '0.48rem',
            fontWeight:    700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color:         'rgba(227, 195, 114, 0.38)',
          }}>
            CURRENT CYCLE
          </div>

          {/* State name — Noto Serif headline */}
          <div style={{
            fontFamily:    'var(--font-serif)',
            fontSize:      '1.6rem',
            fontWeight:    700,
            lineHeight:    1,
            color:         'var(--color-accent-gold)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {state}
          </div>

          {/* Countdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{
              fontFamily:         'var(--font-sans)',
              fontSize:           '2.6rem',
              fontWeight:         900,
              lineHeight:         1,
              letterSpacing:      '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              color:              'var(--color-accent-gold)',
            }}>
              {timeRemaining}
            </div>
            <div style={{
              fontFamily:    'var(--font-sans)',
              fontSize:      '0.46rem',
              fontWeight:    700,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color:         'rgba(229, 226, 225, 0.40)',
            }}>
              REMAINING
            </div>
          </div>

          {/* Cycle note callout — e.g. "EIDOLON HUNTING WINDOW" */}
          {cycleNote && (
            <div className="timer-hero-note">
              <span style={{ color: 'rgba(0, 212, 255, 0.65)', fontSize: '0.55rem', lineHeight: 1 }}>
                ◆
              </span>
              <span style={{
                fontFamily:    'var(--font-sans)',
                fontSize:      '0.48rem',
                fontWeight:    700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:         'rgba(0, 212, 255, 0.80)',
              }}>
                {cycleNote}
              </span>
            </div>
          )}
        </div>

        {/* Vertical rule */}
        <div className="timer-hero-divider" />

        {/* ── Right: Key Resources ──────────────────────────────────────── */}
        <div className="timer-hero-resources">
          <div style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      '0.48rem',
            fontWeight:    700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color:         'rgba(227, 195, 114, 0.32)',
          }}>
            KEY RESOURCES
          </div>

          {resources.length === 0 ? (
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize:   '0.55rem',
              color:      'rgba(168, 165, 160, 0.35)',
              fontStyle:  'italic',
            }}>
              No resources tracked for this state.
            </div>
          ) : (
            <div style={{
              display:        'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap:            8,
            }}>
              {resources.map(res => (
                <ResourceTag
                  key={res.name}
                  name={res.name}
                  source={res.source}
                  size="md"
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
