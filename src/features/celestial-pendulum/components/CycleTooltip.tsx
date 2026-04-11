import type { SyndicateJob } from '@/core/domain/syndicates';

// ---------------------------------------------------------------------------
// CycleTooltip — tooltipinfo-v3 style detail card
// Rendered absolutely within CinematicCyclePanel at the panel level,
// so it is never clipped by the scrollable bounty section.
// ---------------------------------------------------------------------------

interface CycleTooltipProps {
  job:         SyndicateJob;
  accentColor: string;
  worldName:   string;
}

export function CycleTooltip({ job, accentColor, worldName }: CycleTooltipProps) {
  const total = job.standingStages.reduce((s, n) => s + n, 0);

  return (
    <div className="cycle-tooltip">

      {/* Header label */}
      <p
        className="font-label uppercase"
        style={{
          fontSize:      '0.47rem',
          letterSpacing: '0.45em',
          color:         accentColor,
          opacity:       0.55,
          marginBottom:  5,
        }}
      >
        {worldName} · Bounty Tier
      </p>

      {/* Tier name */}
      <p
        className="font-headline font-bold"
        style={{
          fontSize:      '0.9rem',
          color:         accentColor,
          marginBottom:  7,
          letterSpacing: '0.04em',
          lineHeight:    1.1,
        }}
      >
        {job.type}
      </p>

      {/* Level + Standing row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
        <span
          className="font-label"
          style={{
            fontSize:      '0.55rem',
            letterSpacing: '0.1em',
            color:         'rgba(198,198,199,0.58)',
            border:        `1px solid ${accentColor}28`,
            padding:       '1px 6px',
            borderRadius:  '1px',
          }}
        >
          LV {job.enemyLevels[0]}–{job.enemyLevels[1]}
        </span>
        <span
          className="font-label"
          style={{
            fontSize:      '0.55rem',
            letterSpacing: '0.1em',
            color:         'rgba(198,198,199,0.38)',
          }}
        >
          {total.toLocaleString()} STANDING
        </span>
      </div>

      {/* Accent divider */}
      <div
        style={{
          height:       1,
          background:   `linear-gradient(to right, ${accentColor}38, transparent)`,
          marginBottom: 10,
        }}
      />

      {/* Reward pool */}
      {job.rewardPool && job.rewardPool.length > 0 ? (
        <>
          <p
            className="font-label uppercase"
            style={{
              fontSize:      '0.47rem',
              letterSpacing: '0.38em',
              color:         accentColor,
              opacity:       0.45,
              marginBottom:  6,
            }}
          >
            Reward Pool
          </p>
          <ul
            style={{
              margin:        0,
              padding:       0,
              listStyle:     'none',
              display:       'flex',
              flexDirection: 'column',
              gap:           4,
            }}
          >
            {job.rewardPool.map((item, i) => (
              <li
                key={i}
                className="font-label"
                style={{
                  fontSize:   '0.55rem',
                  color:      'rgba(198,198,199,0.68)',
                  display:    'flex',
                  gap:        7,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: accentColor, opacity: 0.42, fontSize: '0.35rem', flexShrink: 0 }}>▶</span>
                {item}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p
          className="font-label uppercase"
          style={{ fontSize: '0.5rem', letterSpacing: '0.25em', color: 'rgba(198,198,199,0.28)' }}
        >
          No reward data available
        </p>
      )}

    </div>
  );
}
