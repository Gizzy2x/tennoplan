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

  // Card background — gradient left (transparent/glass) → right (more solid)
  // Overrides glass-panel's flat background; backdrop-filter still applies from the class.
  const cardBg = fissure.isHard
    ? 'linear-gradient(to right, rgba(19,19,19,0.22) 0%, rgba(28,27,27,0.60) 42%, rgba(35,20,20,0.78) 100%)'
    : 'linear-gradient(to right, rgba(19,19,19,0.22) 0%, rgba(28,27,27,0.55) 42%, rgba(28,27,27,0.70) 100%)';

  return (
    <div
      className="glass-panel fissure-card-hover relative overflow-hidden flex flex-col p-6 cursor-pointer"
      style={{
        background: cardBg,
        borderColor: fissure.isHard
          ? 'rgba(248,113,113,0.18)'
          : `${tierColor}22`,
        boxShadow: fissure.isHard
          ? '0 0 0 1px rgba(248,113,113,0.10), inset 0 0 24px rgba(248,113,113,0.04), 0 0 40px rgba(0,0,0,0.65)'
          : '0 0 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Top-left filigree corner */}
      <span
        className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
        style={{
          borderTop:  `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.35)' : `${tierColor}44`}`,
          borderLeft: `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.35)' : `${tierColor}44`}`,
        }}
      />

      {/* Tier color wash — right-to-left, subliminal on normal, slightly more intense on SP */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: fissure.isHard
            ? `linear-gradient(to left, rgba(248,113,113,0.10) 0%, ${tierColor}06 50%, transparent 75%)`
            : `linear-gradient(to left, ${tierColor}09 0%, transparent 55%)`,
        }}
      />

      {/* ── Top row: icon + mission type + badges ─────────────── */}
      <div className="flex items-start gap-3 mb-3">

        {/* Mission type icon — gold anchor for shape recognition; tier dot for color signal */}
        <div className="flex-shrink-0 mt-0.5 relative">
          <span
            className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: tierColor, opacity: 0.9 }}
          />
          <MissionIcon
            size={30}
            strokeWidth={1.5}
            style={{ color: '#E3C372', position: 'relative', zIndex: 1 }}
          />
        </div>

        {/* Mission type (headline) + node name */}
        <div className="flex-1 min-w-0">
          <p
            className="font-headline text-2xl font-black leading-tight truncate"
            style={{ color: tierColor }}
          >
            {fissure.missionType}
          </p>
          <p className="font-label text-xs truncate leading-tight mt-0.5" style={{ opacity: 0.4, color: '#E5E2E1' }}>
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
      <div className="w-full h-1 bg-surface-container-highest mt-auto relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 h-full"
          style={{
            width:           `${(1 - progress) * 100}%`,
            backgroundColor: isExpired ? 'transparent' : '#E3C372',
            boxShadow:       isExpired ? 'none' : `0 0 6px #E3C37280, 0 0 12px ${tierColor}40`,
            transition:      'width 1s linear',
          }}
        />
      </div>
    </div>
  );
}
