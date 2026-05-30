import {
  Shield, Heart, Radio, Crosshair, LogOut, Skull, Eye,
  ShieldCheck, Shovel, KeyRound, Bomb, Swords, Hexagon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getFactionColor } from '@/core/services/railService';
import { formatMs } from '@/core/services/cycleService';
import type { AlertStatus } from '@/core/domain/railFeed';

const MISSION_ICON: Record<string, LucideIcon> = {
  'Defense':        Shield,
  'Survival':       Heart,
  'Interception':   Radio,
  'Sabotage':       Bomb,
  'Capture':        Crosshair,
  'Rescue':         LogOut,
  'Extermination':  Skull,
  'Spy':            Eye,
  'Mobile Defense': ShieldCheck,
  'Disruption':     KeyRound,
  'Excavation':     Shovel,
  'Assault':        Swords,
};

function getMissionIcon(type: string): LucideIcon {
  return MISSION_ICON[type] ?? Hexagon;
}

export interface AlertCardProps {
  status: AlertStatus;
}

export function AlertCard({ status }: AlertCardProps) {
  const { alert, msRemaining } = status;

  const factionColor = getFactionColor(alert.faction);
  const MissionIcon  = getMissionIcon(alert.missionType);

  const nodeMatch  = alert.node.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName   = nodeMatch ? nodeMatch[1] : alert.node;
  const nodeRegion = nodeMatch ? nodeMatch[2] : '';

  const isUrgent  = msRemaining > 0 && msRemaining < 600_000;
  const progress  = alert.expiryMs > alert.activationMs
    ? (Date.now() - alert.activationMs) / (alert.expiryMs - alert.activationMs)
    : 0;
  const progressPct = Math.min(1, Math.max(0, progress)) * 100;

  const cardBg      = 'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)';
  const tintOverlay = `linear-gradient(to right, transparent 42%, ${factionColor}1A 100%)`;

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col p-5 gap-3"
      style={{
        background:  cardBg,
        borderColor: 'rgba(219, 176, 88,0.15)',
        borderTop:   '1px solid rgba(219, 176, 88,0.20)',
      }}
    >
      {/* Color tint overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: tintOverlay }} />

      {/* Top-left filigree corner */}
      <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: '1px solid rgba(219, 176, 88,0.35)', borderLeft: '1px solid rgba(219, 176, 88,0.35)' }}
      />

      {/* Top row: icon + node + reward */}
      <div className="flex items-start gap-3">
        <MissionIcon size={48} strokeWidth={1.1} style={{ color: factionColor, opacity: 0.85, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p
            data-role="hero"
            className="typo-hero leading-tight orokin-etched truncate"
            style={{ color: 'rgba(229,226,225,1)' }}
          >
            {nodeName}
            {nodeRegion && (
              <span
                data-role="labelTiny"
                className="typo-label-xs ml-1.5 not-italic"
                style={{ opacity: 0.40 }}
              >
                ({nodeRegion})
              </span>
            )}
          </p>
          <p
            data-role="labelSmall"
            className="typo-label-sm mt-0.5"
            style={{ opacity: 0.40 }}
          >
            {alert.missionType}
          </p>
          {alert.reward && (
            <p
              data-role="emphasis"
              className="typo-emphasis mt-1"
              style={{ color: factionColor }}
            >
              {alert.reward}
            </p>
          )}
        </div>

        {/* Countdown */}
        <div className="text-right flex-shrink-0">
          <p
            data-role="labelTiny"
            className="typo-label-xs mb-0.5"
            style={{ color: '#DBB058', opacity: 0.40 }}
          >
            Expires in
          </p>
          <p
            className={`font-mono text-lg font-bold tabular-nums leading-none ${isUrgent ? 'orokin-countdown-glow' : ''}`}
            style={{ color: isUrgent ? '#fb923c' : '#DBB058' }}
          >
            {msRemaining > 0 ? formatMs(msRemaining) : 'EXPIRED'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative overflow-hidden" style={{ height: 3, backgroundColor: 'rgba(197,192,190,0.07)' }}>
        <div
          className="absolute inset-y-0 left-0 h-full transition-all duration-700"
          style={{ width: `${progressPct}%`, backgroundColor: factionColor, opacity: 0.60 }}
        />
      </div>
    </div>
  );
}
