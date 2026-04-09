import { useSimaris } from '../hooks/useSimaris';

// ---------------------------------------------------------------------------
// SimarisPanel
// ---------------------------------------------------------------------------

/**
 * Displays the active Simaris synthesis target.
 * Single full-width card — this is the right layout for one atomic piece of data.
 * No countdown: the API provides no expiry; we surface "Resets Daily" instead.
 *
 * standaloneSection (default true): when false, omits the leading somatic-line
 * divider and section header so the page can provide its own spacing.
 */
export function SimarisPanel({ standaloneSection = true }: { standaloneSection?: boolean }) {
  const { data, isLoading, isError, isStale } = useSimaris();
  const target = data?.activeSynthesisTarget;

  return (
    <section>
      {standaloneSection && <div className="somatic-line mb-6" />}

      {/* Section header */}
      {standaloneSection && (
        <div className="flex items-center gap-4 mb-4">
          <p className="font-label text-[10px] uppercase tracking-[0.4em] text-primary/50">
            Simaris Sanctuary
          </p>
          <span className="font-label text-[9px] uppercase tracking-[0.25em] text-secondary/25">
            — Synthesis Targets
          </span>
        </div>
      )}

      {/* Single full-width card */}
      <div
        className="glass-panel relative overflow-hidden p-5"
        style={{ borderColor: 'rgba(186,195,254,0.12)' }}
      >
        {/* Filigree corners */}
        <span
          className="absolute top-0 left-0 w-6 h-6 pointer-events-none"
          style={{ borderTop: '1px solid rgba(186,195,254,0.25)', borderLeft: '1px solid rgba(186,195,254,0.25)' }}
        />
        <span
          className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
          style={{ borderBottom: '1px solid rgba(186,195,254,0.12)', borderRight: '1px solid rgba(186,195,254,0.12)' }}
        />

        {target ? (
          <div className="flex items-start justify-between gap-6">

            {/* Left: target info */}
            <div className="flex-1 min-w-0">
              <p className="font-label text-[9px] uppercase tracking-[0.3em] text-tertiary/50 mb-1">
                Active Synthesis Target
              </p>
              <h4 className="font-headline text-2xl font-bold orokin-etched text-on-surface leading-tight truncate">
                {target.name}
              </h4>

              {/* Modifier badges */}
              <div className="flex gap-2 mt-2 flex-wrap">
                <span
                  className="font-label text-[8px] uppercase tracking-[0.18em] px-2 py-0.5"
                  style={{
                    color:           '#bac3fe',
                    border:          '1px solid rgba(186,195,254,0.25)',
                    backgroundColor: 'rgba(186,195,254,0.06)',
                    borderRadius:    '0.125rem',
                  }}
                >
                  DAILY ROTATION
                </span>
                {target.isArchwing && (
                  <span
                    className="font-label text-[8px] uppercase tracking-[0.18em] px-2 py-0.5"
                    style={{
                      color:           '#bac3fe',
                      border:          '1px solid rgba(186,195,254,0.3)',
                      backgroundColor: 'rgba(186,195,254,0.08)',
                      borderRadius:    '0.125rem',
                    }}
                  >
                    ARCHWING
                  </span>
                )}
                {target.isBoss && (
                  <span
                    className="font-label text-[8px] uppercase tracking-[0.18em] px-2 py-0.5"
                    style={{
                      color:           '#ef4444',
                      border:          '1px solid rgba(239,68,68,0.3)',
                      backgroundColor: 'rgba(239,68,68,0.08)',
                      borderRadius:    '0.125rem',
                    }}
                  >
                    BOSS
                  </span>
                )}
              </div>
            </div>

            {/* Right: reset info */}
            <div className="text-right flex-shrink-0">
              <p className="font-label text-[9px] uppercase tracking-widest text-secondary/35">
                Resets Daily
              </p>
              <p className="font-label text-[8px] uppercase tracking-widest text-secondary/20 mt-0.5">
                AT UTC MIDNIGHT
              </p>
            </div>

          </div>
        ) : (
          <p className="font-label text-[9px] uppercase tracking-widest text-secondary/25">
            {isLoading
              ? 'ESTABLISHING LINK TO SANCTUARY…'
              : isError
                ? 'SIMARIS UNREACHABLE · NETWORK REQUIRED'
                : 'NO ACTIVE SYNTHESIS TARGET'}
          </p>
        )}

        {/* Stale cache indicator */}
        {isStale && (
          <p className="font-label text-[8px] uppercase tracking-widest text-secondary/20 mt-3">
            Stale cache · Simaris data may be outdated
          </p>
        )}
      </div>
    </section>
  );
}
