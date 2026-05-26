import { useSimaris } from '../hooks/useSimaris';

export function SimarisPanel({ standaloneSection = true }: { standaloneSection?: boolean }) {
  const { data, isLoading, isError, isStale } = useSimaris();
  const target = data?.activeSynthesisTarget;

  return (
    <section>
      {standaloneSection && <div className="somatic-line mb-6" />}

      {standaloneSection && (
        <div className="flex items-center gap-4 mb-4">
          <p
            data-role="sectionHeader"
            className="typo-section-header"
            style={{ color: '#E3C372', opacity: 0.50 }}
          >
            Simaris Sanctuary
          </p>
          <span
            data-role="labelTiny"
            className="typo-label-xs"
            style={{ color: 'rgba(198,198,199,1)', opacity: 0.25 }}
          >
            — Synthesis Targets
          </span>
        </div>
      )}

      <div
        className="glass-panel relative overflow-hidden p-5"
        style={{ borderColor: 'rgba(186,195,254,0.12)' }}
      >
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
            <div className="flex-1 min-w-0">
              <p
                data-role="labelSmall"
                className="typo-label-sm mb-1"
                style={{ color: 'rgba(186,195,254,1)', opacity: 0.50 }}
              >
                Active Synthesis Target
              </p>
              <h4
                data-role="hero"
                className="typo-hero orokin-etched leading-tight truncate"
                style={{ color: 'rgba(229,226,225,1)' }}
              >
                {target.name}
              </h4>

              <div className="flex gap-2 mt-2 flex-wrap">
                <span
                  data-role="labelTiny"
                  className="typo-label-xs px-2 py-0.5"
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
                    data-role="labelTiny"
                    className="typo-label-xs px-2 py-0.5"
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
                    data-role="labelTiny"
                    className="typo-label-xs px-2 py-0.5"
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

            <div className="text-right flex-shrink-0">
              <p
                data-role="labelTiny"
                className="typo-label-xs"
                style={{ color: 'rgba(198,198,199,1)', opacity: 0.35 }}
              >
                Resets Daily
              </p>
              <p
                data-role="labelTiny"
                className="typo-label-xs mt-0.5"
                style={{ color: 'rgba(198,198,199,1)', opacity: 0.20 }}
              >
                AT UTC MIDNIGHT
              </p>
            </div>
          </div>
        ) : (
          <p
            data-role="labelSmall"
            className="typo-label-sm"
            style={{ color: 'rgba(198,198,199,1)', opacity: 0.25 }}
          >
            {isLoading
              ? 'ESTABLISHING LINK TO SANCTUARY…'
              : isError
                ? 'SIMARIS UNREACHABLE · NETWORK REQUIRED'
                : 'NO ACTIVE SYNTHESIS TARGET'}
          </p>
        )}

        {isStale && (
          <p
            data-role="labelTiny"
            className="typo-label-xs mt-3"
            style={{ color: 'rgba(198,198,199,1)', opacity: 0.20 }}
          >
            Stale cache · Simaris data may be outdated
          </p>
        )}
      </div>
    </section>
  );
}
