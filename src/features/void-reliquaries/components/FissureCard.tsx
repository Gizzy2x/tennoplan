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

  // Base background: fully transparent left → dark semi-opaque right.
  // Overrides glass-panel's flat fill so the left zone is pure blurred void.
  // SP gets a warm dark base on the right to blend with the red tint overlay.
  const cardBg = fissure.isHard
    ? 'linear-gradient(to right, transparent 0%, rgba(22,18,18,0.50) 42%, rgba(30,17,17,0.70) 100%)'
    : 'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)';

  // Tier tint overlay: transparent left → tier color at 10-15% right.
  // SP adds a faint red undertone that peaks before the tier tint takes over.
  const tierOverlay = fissure.isHard
    ? `linear-gradient(to right, transparent 28%, rgba(248,113,113,0.08) 52%, ${tierColor}26 100%)`
    : `linear-gradient(to right, transparent 30%, ${tierColor}1A 72%, ${tierColor}1E 100%)`;

  return (
    <div
      className="glass-panel fissure-card-hover relative overflow-hidden flex flex-col p-6 cursor-pointer"
      style={{
        background:    cardBg,
        backdropFilter: 'blur(16px)',
        borderColor: fissure.isHard
          ? 'rgba(248,113,113,0.15)'
          : `${tierColor}1A`,
        boxShadow: fissure.isHard
          ? 'inset 0 0 20px rgba(248,113,113,0.03), 0 0 40px rgba(0,0,0,0.65)'
          : '0 0 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Tier tint overlay — renders first so everything above it sits on top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: tierOverlay }}
      />

      {/* Top-left filigree corner */}
      <span
        className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
        style={{
          borderTop:  `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.30)' : `${tierColor}40`}`,
          borderLeft: `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.30)' : `${tierColor}40`}`,
        }}
      />

      {/* ── Variant corner tag — primary glance signal ──────────── */}
      {fissure.isHard ? (
        <div
          className="absolute top-0 right-0 flex items-center gap-1 px-2.5 py-1.5 rounded-bl-md z-10"
          style={{
            background:   'rgba(120, 15, 15, 0.94)',
            borderBottom: '1px solid rgba(239,68,68,0.28)',
            borderLeft:   '1px solid rgba(239,68,68,0.28)',
          }}
        >
          <Skull size={7} strokeWidth={2} style={{ color: '#fca5a5' }} />
          <span
            className="font-label text-[8px] uppercase tracking-[0.14em] font-bold"
            style={{ color: '#fecaca' }}
          >
            Steel Path
          </span>
        </div>
      ) : fissure.isStorm ? (
        <div
          className="absolute top-0 right-0 flex items-center gap-1 px-2.5 py-1.5 rounded-bl-md z-10"
          style={{
            background:   'rgba(172, 118, 10, 0.90)',
            borderBottom: '1px solid rgba(227,195,114,0.30)',
            borderLeft:   '1px solid rgba(227,195,114,0.30)',
          }}
        >
          <Zap size={7} strokeWidth={2.5} style={{ color: '#1a0c00' }} />
          <span
            className="font-label text-[8px] uppercase tracking-[0.14em] font-bold"
            style={{ color: '#1a0c00' }}
          >
            Storm
          </span>
        </div>
      ) : (
        <div
          className="absolute top-0 right-0 px-2.5 py-1.5 rounded-bl-md z-10"
          style={{
            background:   'rgba(229, 226, 225, 0.05)',
            borderBottom: '1px solid rgba(229,226,225,0.09)',
            borderLeft:   '1px solid rgba(229,226,225,0.09)',
          }}
        >
          <span
            className="font-label text-[8px] uppercase tracking-[0.14em]"
            style={{ color: 'rgba(229,226,225,0.32)' }}
          >
            Normal
          </span>
        </div>
      )}

      {/* ── Top row: icon + mission type ──────────────────────── */}
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

        {/* Mission type (headline) + node name + tier badge */}
        {/* pr-16 keeps text clear of the corner tag (~80 px wide at largest) */}
        <div className="flex-1 min-w-0 pr-16">
          <p
            className="font-headline text-2xl font-black leading-tight truncate orokin-etched"
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
          {/* Tier badge — tertiary info, sits below node name */}
          <span
            className="inline-block font-label text-[8px] uppercase tracking-[0.2em] px-1.5 py-0.5 mt-1 font-semibold"
            style={{
              color:           tierColor,
              border:          `1px solid ${tierColor}45`,
              backgroundColor: `${tierColor}0D`,
            }}
          >
            {fissure.tier}
          </span>
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
          isPulsing ? 'orokin-countdown-glow' : '',
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
