import { useEffect, useState } from 'react';
import { useSyndicateMissions } from '../hooks/useSyndicateMissions';
import { formatMsHuman } from '@/core/services/cycleService';
import type { SyndicateMission } from '@/core/domain/syndicates';

// ---------------------------------------------------------------------------
// Syndicate display metadata
// ---------------------------------------------------------------------------

interface SyndicateMeta {
  displayName: string;
  subtitle:    string;  // open-world location
  color:       string;
}

const SYNDICATE_META: Record<string, SyndicateMeta> = {
  'Ostron':         { displayName: 'Ostron',         subtitle: 'Plains of Eidolon', color: '#E3C372' },
  'Solaris United': { displayName: 'Solaris United', subtitle: 'Orb Vallis',        color: '#60a5fa' },
  'Entrati':        { displayName: 'Entrati',         subtitle: 'Cambion Drift',     color: '#a855f7' },
  'The Holdfasts':  { displayName: 'The Holdfasts',  subtitle: 'Zariman Ten Zero',  color: '#22c55e' },
};

const DISPLAY_ORDER = ['Ostron', 'Solaris United', 'Entrati', 'The Holdfasts'];

// ---------------------------------------------------------------------------
// SyndicateCard sub-component
// ---------------------------------------------------------------------------

function SyndicateCard({
  name,
  mission,
  now,
  isLoading,
  isError,
}: {
  name:      string;
  mission:   SyndicateMission | null;
  now:       number;
  isLoading: boolean;
  isError:   boolean;
}) {
  const meta   = SYNDICATE_META[name];
  const msLeft = mission && mission.expiryMs > 0
    ? Math.max(0, mission.expiryMs - now)
    : null;

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col gap-2 p-4"
      style={{ borderColor: `${meta.color}1A` }}
    >
      {/* Filigree corner */}
      <span
        className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
        style={{ borderTop: `1px solid ${meta.color}40`, borderLeft: `1px solid ${meta.color}40` }}
      />

      {/* Syndicate name */}
      <div>
        <p
          className="font-label text-[9px] uppercase tracking-[0.3em]"
          style={{ color: meta.color, opacity: 0.55 }}
        >
          {meta.subtitle}
        </p>
        <p
          className="font-headline text-base font-bold orokin-etched leading-tight mt-0.5"
          style={{ color: meta.color }}
        >
          {meta.displayName}
        </p>
      </div>

      {/* Divider */}
      <div className="somatic-line" style={{ opacity: 0.12 }} />

      {mission ? (
        <>
          {/* Expiry countdown */}
          {msLeft !== null && msLeft > 0 ? (
            <div>
              <p
                className="font-headline text-xl font-bold tabular-nums"
                style={{ color: meta.color, textShadow: `0 0 16px ${meta.color}40` }}
              >
                {formatMsHuman(msLeft)}
              </p>
              <p className="font-label text-[8px] uppercase tracking-widest text-secondary/30 mt-0.5">
                UNTIL ROTATION
              </p>
            </div>
          ) : (
            <p className="font-label text-[8px] uppercase tracking-widest text-secondary/25">
              ROTATING…
            </p>
          )}

          {/* Job tier count */}
          {mission.jobs.length > 0 && (
            <p
              className="font-label text-[8px] uppercase tracking-[0.18em] mt-auto"
              style={{ color: meta.color, opacity: 0.4 }}
            >
              {mission.jobs.length} JOB TIER{mission.jobs.length !== 1 ? 'S' : ''} AVAILABLE
            </p>
          )}
        </>
      ) : (
        <p className="font-label text-[8px] uppercase tracking-widest text-secondary/25">
          {isLoading ? 'ESTABLISHING LINK…' : isError ? 'DISPATCH UNAVAILABLE' : 'NO ACTIVE DISPATCH'}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SyndicateMissionsPanel
// ---------------------------------------------------------------------------

export function SyndicateMissionsPanel() {
  const { missions, isLoading, isError, isStale } = useSyndicateMissions();

  // Local 1-second clock for expiry countdowns
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Build lookup by canonical syndicate name
  const byName = Object.fromEntries(missions.map(m => [m.syndicate, m]));

  return (
    <section>
      <div className="somatic-line mb-6" />

      {/* Section header */}
      <div className="flex items-center gap-4 mb-4">
        <p className="font-label text-[10px] uppercase tracking-[0.4em] text-primary/50">
          Syndicate Dispatches
        </p>
        <span className="font-label text-[9px] uppercase tracking-[0.25em] text-secondary/25">
          — Daily Bounty Rotations
        </span>
      </div>

      {/* 4-column grid — one card per open-world syndicate */}
      <div className="grid grid-cols-4 gap-4">
        {DISPLAY_ORDER.map(name => (
          <SyndicateCard
            key={name}
            name={name}
            mission={byName[name] ?? null}
            now={now}
            isLoading={isLoading}
            isError={isError}
          />
        ))}
      </div>

      {/* Stale cache banner */}
      {isStale && (
        <p className="font-label text-[8px] uppercase tracking-widest text-secondary/25 mt-3">
          Stale cache · Syndicate data may be outdated
        </p>
      )}
    </section>
  );
}
