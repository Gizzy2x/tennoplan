import {
  Zap, Shield, Heart, Radio, Crosshair, LogOut, Skull, Eye,
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
        borderColor: 'rgba(227,195,114,0.15)',
        borderTop:   '1px solid rgba(227,195,114,0.20)',
      }}
    >
      {/* Tint overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: tintOverlay }} />

      {/* Top-left filigree corner */}
      <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: '1px solid rgba(227,195,114,0.35)', borderLeft: '1px solid rgba(227,195,114,0.35)' }}
      />

      {/* Top row: icon + mission type + node */}
      <div className="flex items-start gap-3">
        {/* Icon with faction dot */}
        <div className="relative flex-shrink-0">
          <Zap size={56} strokeWidth={1.0} style={{ color: '#E3C372', opacity: 0.85 }} />
          {/* Faction dot */}
          <span
            className="absolute bottom-0 right-0 w-3.5 h-3.5 flex items-center justify-center"
            style={{ backgroundColor: factionColor, boxShadow: `0 0 6px ${factionColor}60` }}
          >
            <MissionIcon size={8} strokeWidth={2} style={{ color: '#131313' }} />
          </span>
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <p className="font-headline text-2xl font-black leading-tight orokin-etched" style={{ color: '#E3C372' }}>
            {alert.missionType}
          </p>
          <p className="font-label text-[10px] leading-tight mt-0.5 truncate" style={{ color: '#C6C6C7', opacity: 0.45 }}>
            {nodeName}
            {nodeRegion && <span className="ml-1 opacity-70">({nodeRegion})</span>}
          </p>
          {/* Level range */}
          <span
            className="inline-block font-label text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 mt-1"
            style={{ color: factionColor, border: `1px solid ${factionColor}30`, backgroundColor: `${factionColor}0A` }}
          >
            Lv {alert.minLevel}–{alert.maxLevel}
          </span>
        </div>
      </div>

      {/* Modifier badges */}
      {(alert.nightmare || alert.archwingRequired) && (
        <div className="flex gap-2 flex-wrap">
          {alert.nightmare && (
            <span className="font-label text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 font-semibold"
              style={{ color: '#ffb4ab', border: '1px solid rgba(255,180,171,0.35)', backgroundColor: 'rgba(255,180,171,0.08)' }}>
              Nightmare
            </span>
          )}
          {alert.archwingRequired && (
            <span className="font-label text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 font-semibold"
              style={{ color: '#bac3fe', border: '1px solid rgba(186,195,254,0.35)', backgroundColor: 'rgba(186,195,254,0.08)' }}>
              Archwing
            </span>
          )}
        </div>
      )}

      {/* Faction + reward */}
      <div>
        <p className="font-label text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: factionColor, opacity: 0.70 }}>
          {alert.faction}
        </p>
        <p className="font-label text-sm font-semibold" style={{ color: '#E3C372' }}>
          {alert.reward || 'Mission Reward'}
        </p>
        {alert.rewardCredits > 0 && (
          <p className="font-mono text-[10px] tabular-nums mt-0.5" style={{ color: '#C6C6C7', opacity: 0.45 }}>
            +{alert.rewardCredits.toLocaleString()} cr
          </p>
        )}
      </div>

      {/* Countdown */}
      <p
        className={['font-mono text-2xl font-bold tabular-nums leading-none', isUrgent ? 'orokin-countdown-glow' : ''].filter(Boolean).join(' ')}
        style={{ color: isUrgent ? '#E3C372' : 'rgba(227,195,114,0.75)' }}
      >
        {msRemaining > 0 ? formatMs(msRemaining) : 'EXPIRED'}
      </p>

      {/* Time bar */}
      <div className="relative overflow-hidden mt-auto" style={{ height: 4, backgroundColor: 'rgba(197,192,190,0.07)' }}>
        <div
          className="absolute inset-y-0 left-0 h-full"
          style={{
            width:      `${progressPct}%`,
            backgroundColor: factionColor,
            opacity:    0.65,
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  );
}
