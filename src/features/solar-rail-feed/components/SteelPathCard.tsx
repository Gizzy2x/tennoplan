import { Skull } from 'lucide-react';
import { formatMsHuman } from '@/core/services/cycleService';
import type { SteelPathStatus } from '@/core/domain/railFeed';

export interface SteelPathCardProps {
  status: SteelPathStatus;
}

export function SteelPathCard({ status }: SteelPathCardProps) {
  const { steelPath, msRemaining } = status;

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col p-5 gap-3"
      style={{
        background:  'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)',
        borderColor: 'rgba(248,113,113,0.15)',
        borderTop:   '1px solid rgba(248,113,113,0.25)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent 40%, rgba(248,113,113,0.06) 100%)' }}
      />
      <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: '1px solid rgba(248,113,113,0.30)', borderLeft: '1px solid rgba(248,113,113,0.30)' }}
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Skull size={14} strokeWidth={1.5} style={{ color: '#f87171', opacity: 0.70 }} />
        <p data-role="labelTiny" className="typo-label-xs" style={{ color: '#f87171', opacity: 0.55 }}>
          Steel Path Incursion
        </p>
      </div>

      {/* Current reward */}
      <div>
        <p
          data-role="hero"
          className="typo-hero leading-tight orokin-etched"
          style={{ color: '#E3C372' }}
        >
          {steelPath.rewardName}
        </p>
        <p
          data-role="labelSmall"
          className="typo-label-sm mt-0.5"
          style={{ color: '#f87171', opacity: 0.55 }}
        >
          {steelPath.rewardCost} Steel Essence
        </p>
      </div>

      {/* Reset countdown */}
      <div className="flex items-end gap-2 mt-1">
        <p className="font-mono text-xl font-bold tabular-nums leading-none" style={{ color: '#E3C372', opacity: 0.80 }}>
          {msRemaining > 0 ? formatMsHuman(msRemaining) : '—'}
        </p>
        <p data-role="labelTiny" className="typo-label-xs mb-0.5" style={{ color: '#C6C6C7', opacity: 0.30 }}>
          until reset
        </p>
      </div>

      {/* Upcoming rotation */}
      {steelPath.rotation.length > 0 && (
        <div className="mt-1 space-y-1">
          <p data-role="labelTiny" className="typo-label-xs mb-2" style={{ color: '#C6C6C7', opacity: 0.25 }}>
            Upcoming
          </p>
          {steelPath.rotation.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-center gap-2 opacity-30">
              <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              <p
                data-role="body"
                className="typo-body truncate"
                style={{ color: '#e5e2e1' }}
              >
                {r.name}
              </p>
              <p className="font-mono text-[9px] tabular-nums ml-auto flex-shrink-0" style={{ color: '#f87171' }}>
                {r.cost} SE
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
