/**
 * MasterHeader — The "Spotter" Intelligence.
 *
 * A slim, sticky strip anchored at the top of the Celestial Pendulum content
 * area. Acts as a "Global Radar" — always visible regardless of which world
 * the user is browsing, so they never miss a strategic window.
 *
 * States:
 *   pre-heat  — A P0 phase is approaching within 15 min. Shows amber pulse,
 *               world/phase title, countdown, and a preparation recommendation.
 *               Background drain bar empties as the window closes.
 *   ambient   — No imminent P0 phases. Shows a calm green nominal indicator
 *               with a brief multi-world summary.
 *
 * Color identity: the header uses the APPROACHING world's accent color in
 * pre-heat mode (pulled directly from WORLD_THEMES), not the selected world.
 * This keeps the "Global Radar" semantically independent.
 */

import { memo, useMemo } from 'react';
import type { CycleId, CycleStatus } from '@/core/domain/cycles';
import type { CycleUrgency } from '../hooks/useWorldCycles';
import { WORLD_THEMES, PRE_HEAT_MS } from '@/tokens/worldThemes';
import { formatMsParts } from '@/core/services/cycleService';

// ─── Static copy ──────────────────────────────────────────────────────────────

const PRE_HEAT_TITLES: Partial<Record<string, string>> = {
  'cetus-night':  'NIGHTFALL APPROACHING',
  'vallis-warm':  'WARM CYCLE INCOMING',
  'cambion-fass': 'FASS CYCLE INCOMING',
};

const PRE_HEAT_WORLD_LABELS: Partial<Record<string, string>> = {
  'cetus-night':  'CETUS',
  'vallis-warm':  'FORTUNA',
  'cambion-fass': 'DEIMOS',
};

const PRE_HEAT_RECOMMENDATIONS: Partial<Record<string, string>> = {
  'cetus-night':  'Equip Eidolon loadout — stock Void Strikes and Eidolon Lures.',
  'vallis-warm':  'Stage Exploiter Orb — prepare 4× Thermia and heat-resistance mods.',
  'cambion-fass': 'Prepare Isolation Vaults — equip Necramech and Jugulus/Carnis mods.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format as M:SS for pre-heat countdown (always < 15 min) */
function formatCountdown(ms: number): string {
  const { m, s } = formatMsParts(ms);
  return `${parseInt(m, 10)}:${s}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MasterHeaderProps {
  statuses: Partial<Record<CycleId, CycleStatus>>;
  urgency:  Partial<Record<CycleId, CycleUrgency>>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MasterHeader = memo(function MasterHeader({
  statuses,
  urgency,
}: MasterHeaderProps) {

  // Find all pre-heating worlds, sorted by urgency (least msRemaining = most urgent)
  const preHeatWorlds = useMemo(() =>
    (Object.keys(urgency) as CycleId[])
      .filter(id => urgency[id]?.isPreHeat)
      .sort((a, b) => (statuses[a]?.msRemaining ?? 0) - (statuses[b]?.msRemaining ?? 0)),
    [urgency, statuses]
  );

  const isPreHeat   = preHeatWorlds.length > 0;
  const primaryId   = preHeatWorlds[0] ?? null;
  const primaryStat = primaryId ? statuses[primaryId] : null;
  const primaryUrg  = primaryId ? urgency[primaryId]  : null;

  const nextStateKey   = primaryUrg?.nextStateKey ?? '';
  const title          = PRE_HEAT_TITLES[nextStateKey]          ?? 'STRATEGIC WINDOW';
  const worldLabel     = PRE_HEAT_WORLD_LABELS[nextStateKey]    ?? '';
  const recommendation = PRE_HEAT_RECOMMENDATIONS[nextStateKey] ?? '';
  const countdown      = primaryStat ? formatCountdown(primaryStat.msRemaining) : '—';

  // Drain bar: starts at 1.0 when 15 min remain, empties to 0 at phase flip
  const drainPct = primaryStat
    ? Math.min(1, primaryStat.msRemaining / PRE_HEAT_MS) * 100
    : 0;

  // Approaching world's accent color for header chrome (independent of selected world)
  const approachingTheme = primaryId ? WORLD_THEMES[primaryId] : null;
  const accentColor      = approachingTheme?.accent ?? 'var(--color-accent-gold)';
  const glowColor        = approachingTheme?.glowLow ?? 'rgba(227,195,114,0.12)';

  return (
    <div
      className={`master-header${isPreHeat ? ' master-header--pre-heat' : ' master-header--ambient'}`}
      role="status"
      aria-live="polite"
      aria-label={
        isPreHeat
          ? `Strategic window: ${worldLabel} ${title} in ${countdown}`
          : 'All strategic windows clear'
      }
    >
      {/* Background drain bar — empties as the pre-heat window closes */}
      <div
        className="master-header-drain"
        aria-hidden="true"
        style={{
          width: `${drainPct.toFixed(1)}%`,
          background: isPreHeat ? glowColor : 'transparent',
        }}
      />

      <div className="master-header-content">
        {isPreHeat ? (
          <>
            {/* Status badge */}
            <span className="master-header-badge master-header-badge--pre-heat">
              ◆ STRATEGIC PREPARATION
            </span>

            {/* Main signal */}
            <span className="master-header-signal">
              {worldLabel && (
                <span
                  className="master-header-world"
                  style={{ color: accentColor }}
                >
                  {worldLabel}
                </span>
              )}
              {worldLabel && ' — '}
              {title}
              <span className="master-header-countdown"> ({countdown})</span>
            </span>

            {/* Recommendation */}
            {recommendation && (
              <span className="master-header-rec">
                {recommendation}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="master-header-badge master-header-badge--nominal">
              ◆ SYSTEMS NOMINAL
            </span>
            <span className="master-header-signal master-header-signal--ambient">
              No imminent strategic windows — all cycles within normal parameters
            </span>
          </>
        )}
      </div>
    </div>
  );
});
