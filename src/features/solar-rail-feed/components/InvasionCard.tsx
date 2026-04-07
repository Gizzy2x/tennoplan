import { Sword } from 'lucide-react';
import { getFactionColor } from '@/core/services/railService';
import type { InvasionStatus } from '@/core/domain/railFeed';

export interface InvasionCardProps {
  status: InvasionStatus;
}

export function InvasionCard({ status }: InvasionCardProps) {
  const { invasion, completion } = status;

  const attackerColor = getFactionColor(invasion.attackingFaction);
  const defenderColor = getFactionColor(invasion.defendingFaction);

  const nodeMatch  = invasion.node.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName   = nodeMatch ? nodeMatch[1] : invasion.node;
  const nodeRegion = nodeMatch ? nodeMatch[2] : '';

  const cardBg         = 'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)';
  const tintOverlay    = `linear-gradient(to right, ${attackerColor}0D 0%, transparent 50%, ${defenderColor}0D 100%)`;

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col p-5 gap-4"
      style={{
        background:  cardBg,
        borderColor: 'rgba(227,195,114,0.12)',
        borderTop:   '1px solid rgba(227,195,114,0.18)',
      }}
    >
      {/* Color tint overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: tintOverlay }} />

      {/* Top-left filigree corner */}
      <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: '1px solid rgba(227,195,114,0.35)', borderLeft: '1px solid rgba(227,195,114,0.35)' }}
      />

      {/* Top row: icon + node + factions */}
      <div className="flex items-start gap-3">
        <Sword size={48} strokeWidth={1.1} style={{ color: attackerColor, opacity: 0.85, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="font-headline text-xl font-black leading-tight orokin-etched text-on-surface truncate">
            {nodeName}
            {nodeRegion && (
              <span className="font-label text-[10px] font-normal ml-1.5 opacity-40 not-italic">
                ({nodeRegion})
              </span>
            )}
          </p>
          <p className="font-label text-[9px] uppercase tracking-[0.3em] opacity-40 mt-0.5">
            {invasion.desc}
          </p>
          {/* Faction matchup */}
          <p className="font-label text-xs mt-1.5 flex items-center gap-1.5">
            <span style={{ color: attackerColor }}>{invasion.attackingFaction}</span>
            <span className="opacity-30">vs</span>
            <span style={{ color: defenderColor }}>{invasion.defendingFaction}</span>
            {invasion.vsInfestation && (
              <span
                className="font-label text-[8px] uppercase tracking-[0.2em] px-1.5 py-0.5 ml-1"
                style={{ color: '#86efac', border: '1px solid rgba(134,239,172,0.30)', backgroundColor: 'rgba(134,239,172,0.07)' }}
              >
                Infestation
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Reward row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'ATK REWARD', reward: invasion.attackerReward, credits: invasion.attackerCredits, color: attackerColor },
          { label: 'DEF REWARD', reward: invasion.defenderReward, credits: invasion.defenderCredits, color: defenderColor },
        ].map(({ label, reward, credits, color }) => (
          <div key={label}>
            <p className="font-label text-[9px] uppercase tracking-[0.28em] mb-0.5" style={{ color, opacity: 0.45 }}>
              {label}
            </p>
            <p className="font-label text-xs leading-snug text-on-surface">
              {reward || (credits > 0 ? `${credits.toLocaleString()} cr` : '—')}
            </p>
            {credits > 0 && reward && (
              <p className="font-mono text-[9px] tabular-nums opacity-30 mt-0.5">
                +{credits.toLocaleString()} cr
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Completion bar */}
      <div>
        <div className="relative overflow-hidden" style={{ height: 6, backgroundColor: 'rgba(197,192,190,0.07)' }}>
          <div
            className="absolute inset-y-0 left-0 h-full transition-all duration-700"
            style={{ width: `${completion}%`, backgroundColor: attackerColor, opacity: 0.75 }}
          />
        </div>
        <p className="font-mono text-[9px] tabular-nums mt-1" style={{ color: attackerColor, opacity: 0.5 }}>
          {completion.toFixed(1)}% complete
        </p>
      </div>
    </div>
  );
}
