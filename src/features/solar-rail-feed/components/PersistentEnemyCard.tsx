import { Crosshair, MapPin } from 'lucide-react';
import type { PersistentEnemyStatus } from '@/core/domain/railFeed';

export interface PersistentEnemyCardProps {
  status: PersistentEnemyStatus;
}

export function PersistentEnemyCard({ status }: PersistentEnemyCardProps) {
  const { enemy } = status;

  // Health bar: 100% = danger red, low% = dim
  const healthPct = Math.max(0, Math.min(100, enemy.health));
  const healthColor = healthPct > 66
    ? '#f87171'
    : healthPct > 33
      ? '#fb923c'
      : '#86efac'; // near-dead = green (almost defeated)

  const nodeMatch  = enemy.lastNode.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName   = nodeMatch ? nodeMatch[1] : enemy.lastNode;
  const nodeRegion = nodeMatch ? nodeMatch[2] : '';

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col p-5 gap-3"
      style={{
        background:  'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)',
        borderColor: `${healthColor}18`,
        borderTop:   `1px solid ${healthColor}28`,
      }}
    >
      {/* Tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(to right, transparent 42%, ${healthColor}0A 100%)` }}
      />

      {/* Top-left filigree corner */}
      <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: `1px solid ${healthColor}30`, borderLeft: `1px solid ${healthColor}30` }}
      />

      {/* Status chip */}
      <div className="flex items-center gap-2">
        <Crosshair size={12} strokeWidth={1.8} style={{ color: healthColor, opacity: 0.70 }} />
        <span
          className="font-label text-[8px] uppercase tracking-[0.3em] font-semibold px-2 py-0.5"
          style={{
            color:           healthColor,
            border:          `1px solid ${healthColor}35`,
            backgroundColor: `${healthColor}0A`,
          }}
        >
          {enemy.isDiscovered ? 'Discovered' : 'Hunting'}
        </span>
      </div>

      {/* Agent name */}
      <p className="font-headline text-lg font-black leading-tight orokin-etched text-on-surface">
        {enemy.agentType}
      </p>

      {/* Health bar */}
      <div>
        <div className="flex justify-between mb-1">
          <p className="font-label text-[9px] uppercase tracking-[0.25em]" style={{ color: healthColor, opacity: 0.55 }}>
            Hull Integrity
          </p>
          <p className="font-mono text-[9px] tabular-nums font-bold" style={{ color: healthColor }}>
            {healthPct.toFixed(0)}%
          </p>
        </div>
        <div className="relative overflow-hidden" style={{ height: 6, backgroundColor: 'rgba(197,192,190,0.07)' }}>
          <div
            className="absolute inset-y-0 left-0 h-full transition-all duration-700"
            style={{
              width:      `${healthPct}%`,
              backgroundColor: healthColor,
              boxShadow:  `0 0 8px ${healthColor}50`,
            }}
          />
        </div>
      </div>

      {/* Last node */}
      {enemy.lastNode && (
        <div className="flex items-center gap-1.5 mt-auto">
          <MapPin size={10} strokeWidth={1.5} style={{ color: '#C6C6C7', opacity: 0.35, flexShrink: 0 }} />
          <p className="font-label text-[10px] truncate" style={{ color: '#C6C6C7', opacity: 0.40 }}>
            {nodeName}
            {nodeRegion && <span className="ml-1 opacity-70">({nodeRegion})</span>}
          </p>
        </div>
      )}
    </div>
  );
}
