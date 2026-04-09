import { useState } from 'react';
import { formatMsHuman } from '@/core/services/cycleService';
import type { SyndicateJob } from '@/core/domain/syndicates';

// ---------------------------------------------------------------------------
// BountyJobList
// ---------------------------------------------------------------------------

interface BountyJobListProps {
  jobs:          SyndicateJob[];
  accentColor:   string;
  expiryMs:      number;
  now:           number;
  maxJobsShown?: number;
}

const REWARD_PREVIEW = 3;

export function BountyJobList({
  jobs,
  accentColor,
  expiryMs,
  now,
  maxJobsShown = 3,
}: BountyJobListProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const msUntilRotation = Math.max(0, expiryMs - now);
  const visibleJobs = jobs.slice(0, maxJobsShown);

  // Skeleton while no data yet
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse h-2 rounded-sm"
            style={{ backgroundColor: `${accentColor}18`, width: `${60 + i * 10}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 4 }}>

      {/* Section label */}
      <p
        className="font-label uppercase"
        style={{
          fontSize:      '0.55rem',
          letterSpacing: '0.4em',
          color:         accentColor,
          opacity:       0.45,
          marginBottom:  2,
        }}
      >
        Bounty Board
      </p>

      {/* Job tiers */}
      {visibleJobs.map((job, idx) => {
        const pool    = job.rewardPool ?? [];
        const preview = pool.slice(0, REWARD_PREVIEW);
        const extra   = pool.length - REWARD_PREVIEW;
        const isExp   = expandedJob === job.type + idx;
        const total   = job.standingStages.reduce((s, n) => s + n, 0);

        return (
          <div
            key={job.type + idx}
            style={{
              borderTop:  idx > 0 ? `1px solid ${accentColor}12` : undefined,
              paddingTop: idx > 0 ? 3 : 0,
            }}
          >
            {/* Tier header */}
            <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 2 }}>
              <span
                className="font-label truncate"
                style={{
                  fontSize:  '0.58rem',
                  color:     'rgba(229,226,225,0.75)',
                  maxWidth:  '55%',
                }}
              >
                {job.type}
              </span>
              <span
                className="font-label"
                style={{
                  fontSize:        '0.52rem',
                  letterSpacing:   '0.08em',
                  color:           accentColor,
                  opacity:         0.55,
                  border:          `1px solid ${accentColor}25`,
                  padding:         '0 3px',
                  borderRadius:    '1px',
                  whiteSpace:      'nowrap',
                }}
              >
                Lv {job.enemyLevels[0]}–{job.enemyLevels[1]}
              </span>
              <span
                className="font-label"
                style={{
                  fontSize:      '0.52rem',
                  letterSpacing: '0.08em',
                  color:         'rgba(198,198,199,0.3)',
                  whiteSpace:    'nowrap',
                }}
              >
                {total.toLocaleString()} ▴
              </span>
            </div>

            {/* Reward pool */}
            {pool.length > 0 && (
              <div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {(isExp ? pool : preview).map(item => (
                    <li
                      key={item}
                      className="font-label flex items-center"
                      style={{
                        fontSize: '0.52rem',
                        color:    'rgba(198,198,199,0.5)',
                        gap:      4,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: accentColor, opacity: 0.35, fontSize: '0.4rem' }}>▶</span>
                      {item}
                    </li>
                  ))}
                </ul>

                {extra > 0 && (
                  <button
                    onClick={() => setExpandedJob(isExp ? null : job.type + idx)}
                    className="font-label"
                    style={{
                      fontSize:        '0.5rem',
                      letterSpacing:   '0.1em',
                      color:           accentColor,
                      opacity:         0.45,
                      cursor:          'pointer',
                      background:      'none',
                      border:          'none',
                      padding:         '1px 0',
                      marginTop:       1,
                    }}
                  >
                    {isExp ? '▲ LESS' : `+${extra} MORE`}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Rotation countdown */}
      <p
        className="font-label"
        style={{
          fontSize:      '0.5rem',
          letterSpacing: '0.25em',
          color:         'rgba(198,198,199,0.25)',
          marginTop:     3,
        }}
      >
        ROTATION IN {msUntilRotation > 0 ? formatMsHuman(msUntilRotation) : '—'}
      </p>

    </div>
  );
}
