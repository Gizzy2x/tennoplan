import {
  Shield, Heart, Radio, Crosshair, LogOut, Skull, Eye,
  ShieldCheck, Shovel, AlertTriangle, Hexagon, KeyRound,
  Zap, Bomb, FlaskConical, Swords, Droplet, Orbit,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { getTypographyStyle } from '@/tokens/utils';
import { formatMs } from '@/core/services/cycleService';
import { TIER_COLOR, ENEMY_COLOR } from '@/core/services/fissureService';
import type { FissureStatus } from '@/core/domain/relics';

// ---------------------------------------------------------------------------
// Mission type → icon
// ---------------------------------------------------------------------------

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
  'Assassination':  Crosshair,
  'Volatile':       AlertTriangle,
  'Alchemy':        FlaskConical,
  'Assault':        Swords,
  'Void Cascade':   Droplet,
  'Void Flood':     Orbit,
};

function getMissionIcon(missionType: string): LucideIcon {
  return MISSION_ICON[missionType] ?? Hexagon;
}

// ---------------------------------------------------------------------------
// Per-tier relic overlay colors
// ---------------------------------------------------------------------------

const TIER_OVERLAY: Record<string, string> = {
  Lith:    'rgba(227, 195, 114, 0.17)',
  Meso:    'rgba(186, 195, 254, 0.17)',
  Neo:     'rgba(103, 232, 249, 0.15)',
  Axi:     'rgba(192, 132, 252, 0.17)',
  Requiem: 'rgba(251, 146,  60, 0.16)',
  Omnia:   'rgba(248, 113, 113, 0.16)',
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface FissureCardProps {
  status: FissureStatus;
}

export function FissureCard({ status }: FissureCardProps) {
  const { tokens } = useThemeStore();
  const { fissure, msRemaining, progress, isExpired } = status;
  const tierColor   = TIER_COLOR[fissure.tier]   ?? '#E3C372';
  const enemyColor  = ENEMY_COLOR[fissure.enemy] ?? '#C6C6C7';
  const countdown   = isExpired ? 'EXPIRED' : formatMs(msRemaining);
  const isPulsing   = !isExpired && msRemaining < 600_000;
  const MissionIcon = getMissionIcon(fissure.missionType);

  const nodeMatch  = fissure.node.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName   = nodeMatch ? nodeMatch[1] : fissure.node;
  const nodeRegion = nodeMatch ? nodeMatch[2] : '';

  const cardBg = fissure.isHard
    ? 'linear-gradient(to right, transparent 0%, rgba(22,18,18,0.50) 42%, rgba(30,17,17,0.70) 100%)'
    : 'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)';

  const tierOverlayColor = TIER_OVERLAY[fissure.tier] ?? 'rgba(227,195,114,0.10)';
  const tierOverlay = fissure.isHard
    ? `linear-gradient(to right, transparent 30%, rgba(248,113,113,0.12) 58%, ${tierOverlayColor} 100%)`
    : `linear-gradient(to right, transparent 42%, ${tierOverlayColor} 100%)`;

  return (
    <div className="relative" style={{ paddingTop: '12px' }}>

      {/* ── Variant Tag ────────────────────────────────────────────── */}
      {fissure.isHard ? (
        <div
          className="fissure-variant-tag absolute top-0 right-3 z-20"
          style={{
            background:   'rgba(185, 28, 28, 0.97)',
            borderTop:    '2px solid rgba(248,113,113,0.70)',
            borderRight:  '1px solid rgba(239,68,68,0.45)',
            borderBottom: '1px solid rgba(227,195,114,0.45)',
            borderLeft:   '1px solid rgba(239,68,68,0.45)',
            color:        '#ffffff',
          }}
        >
          <Skull size={10} strokeWidth={2.5} />
          SP
        </div>
      ) : fissure.isStorm ? (
        <div
          className="fissure-variant-tag absolute top-0 right-3 z-20"
          style={{
            background:   'rgba(200, 158, 8, 0.92)',
            borderTop:    '2px solid rgba(255,220,80,0.60)',
            borderRight:  '1px solid rgba(227,195,114,0.50)',
            borderBottom: '1px solid rgba(227,195,114,0.55)',
            borderLeft:   '1px solid rgba(227,195,114,0.50)',
            color:        '#1a0c00',
          }}
        >
          <Zap size={10} strokeWidth={2.5} />
          STORM
        </div>
      ) : (
        <div
          className="fissure-variant-tag absolute top-0 right-3 z-20"
          style={{
            background:   'rgba(229, 226, 225, 0.93)',
            borderTop:    '2px solid rgba(227,195,114,0.60)',
            borderRight:  '1px solid rgba(227,195,114,0.30)',
            borderBottom: '1px solid rgba(227,195,114,0.45)',
            borderLeft:   '1px solid rgba(227,195,114,0.30)',
            color:        '#131313',
          }}
        >
          NORMAL
        </div>
      )}

      {/* ── Card ────────────────────────────────────────────────────── */}
      <div
        className="glass-panel fissure-card-hover relative overflow-hidden flex flex-col p-6 cursor-pointer"
        style={{
          background:     cardBg,
          backdropFilter: 'blur(16px)',
          borderColor: fissure.isHard ? 'rgba(248,113,113,0.15)' : `${tierColor}1A`,
          boxShadow:   fissure.isHard
            ? 'inset 0 0 20px rgba(248,113,113,0.03), 0 0 40px rgba(0,0,0,0.65)'
            : '0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: tierOverlay }} />
        <span
          className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
          style={{
            borderTop:  `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.30)' : `${tierColor}40`}`,
            borderLeft: `1px solid ${fissure.isHard ? 'rgba(248,113,113,0.30)' : `${tierColor}40`}`,
          }}
        />

        {/* ── Top row: icon + mission type ─────────────────────────── */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 relative">
            <span
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full"
              style={{ backgroundColor: tierColor, opacity: 0.9 }}
            />
            <MissionIcon
              size={72}
              strokeWidth={1.1}
              style={{ color: '#E3C372', position: 'relative', zIndex: 1 }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p
              data-role="hero"
              className="leading-tight truncate orokin-etched"
              style={{ ...getTypographyStyle(tokens, 'hero'), color: tierColor }}
            >
              {fissure.missionType}
            </p>
            <p
              data-role="labelSmall"
              className="truncate leading-tight mt-0.5"
              style={{ ...getTypographyStyle(tokens, 'labelSmall'), opacity: 0.4, color: '#E5E2E1' }}
            >
              {nodeName}
              {nodeRegion && <span className="ml-1">({nodeRegion})</span>}
            </p>
            <span
              data-role="labelTiny"
              className="inline-block mt-1 px-1.5 py-0.5"
              style={{
                ...getTypographyStyle(tokens, 'labelTiny'),
                color:           tierColor,
                border:          `1px solid ${tierColor}45`,
                backgroundColor: `${tierColor}0D`,
              }}
            >
              {fissure.tier}
            </span>
          </div>
        </div>

        {/* ── Enemy faction ─────────────────────────────────────────── */}
        <p
          data-role="labelSmall"
          className="mb-2"
          style={{ ...getTypographyStyle(tokens, 'labelSmall'), color: enemyColor, opacity: 0.7 }}
        >
          {fissure.enemy}
        </p>

        {/* ── Countdown ─────────────────────────────────────────────── */}
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

        {/* ── Progress bar ──────────────────────────────────────────── */}
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
    </div>
  );
}
