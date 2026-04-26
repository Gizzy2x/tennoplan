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

          <div className="timer-hero-meta-label">CURRENT CYCLE</div>

          <div className="timer-hero-state">{state}</div>

          <div className="timer-hero-countdown">
            <div className="timer-hero-countdown-value">{timeRemaining}</div>
            <div className="timer-hero-countdown-label">REMAINING</div>
          </div>

          {cycleNote && (
            <div className="timer-hero-note">
              <span className="timer-hero-note-icon">◆</span>
              <span className="timer-hero-note-text">{cycleNote}</span>
            </div>
          )}
        </div>

        {/* Vertical rule */}
        <div className="timer-hero-divider" />

        {/* ── Right: Key Resources ──────────────────────────────────────── */}
        <div className="timer-hero-resources">
          <div className="timer-hero-meta-label">KEY RESOURCES</div>

          {resources.length === 0 ? (
            <div className="timer-hero-no-resources">
              No resources available for this state.
            </div>
          ) : (
            <div className="timer-hero-resources-grid">
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
