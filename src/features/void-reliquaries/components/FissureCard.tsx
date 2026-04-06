import { formatMs } from '@/core/services/cycleService';
import { TIER_COLOR, ENEMY_COLOR } from '@/core/services/fissureService';
import type { FissureStatus } from '@/core/domain/relics';

export interface FissureCardProps {
  status: FissureStatus;
}

export function FissureCard({ status }: FissureCardProps) {
  const { fissure, msRemaining, progress, isExpired } = status;
  const tierColor   = TIER_COLOR[fissure.tier]   ?? '#E3C372';
  const enemyColor  = ENEMY_COLOR[fissure.enemy] ?? '#C6C6C7';
  const countdown   = formatMs(msRemaining);

  // Extract just the node name (without the location in parentheses for the
  // headline, keep full string for subtitle)
  const nodeMatch   = fissure.node.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName    = nodeMatch ? nodeMatch[1] : fissure.node;
  const nodeRegion  = nodeMatch ? nodeMatch[2] : '';

  return (
    <div
      className="glass-panel relative overflow-hidden"
      style={{
        padding:     '0.875rem 1rem',
        borderColor: `${tierColor}22`,
      }}
    >
      {/* Top-left filigree corner */}
      <span
        className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
        style={{
          borderTop:  `1px solid ${tierColor}44`,
          borderLeft: `1px solid ${tierColor}44`,
        }}
      />

      {/* Header: mission type + badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <p
            className="font-label text-[10px] uppercase tracking-[0.35em] font-semibold truncate"
            style={{ color: tierColor }}
          >
            {fissure.missionType}
          </p>
          <p className="font-label text-[11px] text-on-surface font-medium truncate leading-tight mt-0.5">
            {nodeName}
            {nodeRegion && (
              <span className="text-secondary opacity-40 ml-1 font-normal">
                ({nodeRegion})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {fissure.isStorm && (
            <span
              className="font-label text-[8px] uppercase tracking-widest px-1.5 py-0.5"
              style={{
                color:           tierColor,
                border:          `1px solid ${tierColor}50`,
                backgroundColor: `${tierColor}12`,
              }}
            >
              STORM
            </span>
          )}
          {fissure.isHard && (
            <span
              className="font-label text-[8px] uppercase tracking-widest px-1.5 py-0.5"
              style={{
                color:           '#f87171',
                border:          '1px solid rgba(248,113,113,0.4)',
                backgroundColor: 'rgba(248,113,113,0.08)',
              }}
            >
              SP
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-px bg-surface-container-highest mb-2 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 h-full"
          style={{
            width:           `${(1 - progress) * 100}%`,
            backgroundColor: tierColor,
            boxShadow:       `0 0 4px ${tierColor}`,
            transition:      'width 1s linear',
          }}
        />
      </div>

      {/* Footer: enemy + countdown */}
      <div className="flex items-center justify-between">
        <p
          className="font-label text-[10px] uppercase tracking-[0.25em]"
          style={{ color: enemyColor, opacity: 0.8 }}
        >
          {fissure.enemy}
        </p>
        <p
          className="font-mono text-xs font-bold tabular-nums"
          style={{ color: isExpired ? 'rgba(197,192,190,0.3)' : tierColor }}
        >
          {isExpired ? 'EXPIRED' : countdown}
        </p>
      </div>
    </div>
  );
}
