import {
  Shield,
  Heart,
  Radio,
  Zap,
  Crosshair,
  LogOut,
  Skull,
  Eye,
  ShieldCheck,
  Shovel,
  AlertTriangle,
  Hexagon,
  KeyRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatMs } from '@/core/services/cycleService';
import { TIER_COLOR, ENEMY_COLOR } from '@/core/services/fissureService';
import type { FissureStatus } from '@/core/domain/relics';

// ---------------------------------------------------------------------------
// Mission type → icon (UI concern — lives here, not in services)
// ---------------------------------------------------------------------------

const MISSION_ICON: Record<string, LucideIcon> = {
  'Defense':        Shield,
  'Survival':       Heart,
  'Interception':   Radio,
  'Sabotage':       Zap,
  'Capture':        Crosshair,
  'Rescue':         LogOut,       // exit/escape — person leaving
  'Extermination':  Skull,
  'Spy':            Eye,
  'Mobile Defense': ShieldCheck,
  'Disruption':     KeyRound,     // round Orokin key shape
  'Excavation':     Shovel,
  'Assassination':  Crosshair,
  'Volatile':       AlertTriangle,
};

function getMissionIcon(missionType: string): LucideIcon {
  return MISSION_ICON[missionType] ?? Hexagon;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface FissureCardProps {
  status: FissureStatus;
}

export function FissureCard({ status }: FissureCardProps) {
  const { fissure, msRemaining, progress, isExpired } = status;
  const tierColor    = TIER_COLOR[fissure.tier]   ?? '#E3C372';
  const enemyColor   = ENEMY_COLOR[fissure.enemy] ?? '#C6C6C7';
  const countdown    = isExpired ? 'EXPIRED' : formatMs(msRemaining);
  const isPulsing    = !isExpired && msRemaining < 600_000;
  const MissionIcon  = getMissionIcon(fissure.missionType);

  // Extract node name vs region
  const nodeMatch  = fissure.node.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName   = nodeMatch ? nodeMatch[1] : fissure.node;
  const nodeRegion = nodeMatch ? nodeMatch[2] : '';

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col"
      style={{
        padding:     '1.25rem',
        borderColor: fissure.isHard
          ? 'rgba(248,113,113,0.35)'
          : `${tierColor}22`,
        boxShadow: fissure.isHard
          ? '0 0 20px rgba(248,113,113,0.1), 0 0 40px rgba(0,0,0,0.5)'
          : '0 0 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Top-left filigree corner */}
      <span
        className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
        style={{
          borderTop:  `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.5)' : `${tierColor}44`}`,
          borderLeft: `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.5)' : `${tierColor}44`}`,
        }}
      />

      {/* ── Top row: icon + mission type + badges ─────────────── */}
      <div className="flex items-start gap-3 mb-3">

        {/* Mission type icon — large, tier-colored */}
        <div
          className="flex-shrink-0 mt-0.5"
          style={{ color: tierColor, opacity: 0.85 }}
        >
          <MissionIcon size={28} strokeWidth={1.5} />
        </div>

        {/* Mission type (headline) + node name */}
        <div className="flex-1 min-w-0">
          <p
            className="font-headline text-lg font-bold leading-tight truncate"
            style={{ color: tierColor }}
          >
            {fissure.missionType}
          </p>
          <p className="font-label text-[10px] truncate leading-tight mt-0.5" style={{ opacity: 0.4, color: '#E5E2E1' }}>
            {nodeName}
            {nodeRegion && (
              <span className="ml-1">({nodeRegion})</span>
            )}
          </p>
        </div>

        {/* Badges: Tier + SP + Storm — stacked top-right */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="font-label text-[9px] uppercase tracking-[0.25em] px-1.5 py-0.5 font-semibold"
            style={{
              color:           tierColor,
              border:          `1px solid ${tierColor}50`,
              backgroundColor: `${tierColor}12`,
            }}
          >
            {fissure.tier}
          </span>
          {fissure.isHard && (
            <span
              className="font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 font-bold"
              style={{
                color:           '#f87171',
                border:          '1px solid rgba(248,113,113,0.55)',
                backgroundColor: 'rgba(248,113,113,0.14)',
              }}
            >
              SP
            </span>
          )}
          {fissure.isStorm && (
            <span
              className="font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5"
              style={{
                color:           '#bac3fe',
                border:          '1px solid rgba(186,195,254,0.45)',
                backgroundColor: 'rgba(186,195,254,0.08)',
              }}
            >
              STORM
            </span>
          )}
        </div>
      </div>

      {/* ── Enemy faction ─────────────────────────────────────── */}
      <p
        className="font-label text-[10px] uppercase tracking-[0.25em] mb-2"
        style={{ color: enemyColor, opacity: 0.7 }}
      >
        {fissure.enemy}
      </p>

      {/* ── Countdown — second most prominent ────────────────── */}
      <p
        className={[
          'font-mono text-2xl font-bold tabular-nums leading-none mb-3',
          isPulsing ? 'animate-pulse' : '',
        ].filter(Boolean).join(' ')}
        style={{
          color: isExpired
            ? 'rgba(197,192,190,0.3)'
            : isPulsing
              ? '#E3C372'
              : tierColor,
        }}
      >
        {countdown}
      </p>

      {/* ── Progress bar — fills LTR while time remains ───────── */}
      <div className="w-full h-0.5 bg-surface-container-highest mt-auto relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 h-full"
          style={{
            width:           `${(1 - progress) * 100}%`,
            backgroundColor: isExpired ? 'transparent' : tierColor,
            boxShadow:       isExpired ? 'none' : `0 0 4px ${tierColor}`,
            transition:      'width 1s linear',
          }}
        />
      </div>
    </div>
  );
}
