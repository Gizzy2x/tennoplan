import {
  Shield,
  Heart,
  Radio,
  Crosshair,
  LogOut,
  Skull,
  Eye,
  ShieldCheck,
  Shovel,
  KeyRound,
  Zap,
  Bomb,
  FlaskConical,
  Swords,
  Hexagon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SORTIE_FACTION_COLOR } from '@/core/services/ascensionService';
import type { SortieMission } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Mission icon — same mapping as FissureCard
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
  'Volatile':       Zap,
  'Assault':        Swords,
};

function getMissionIcon(missionType: string): LucideIcon {
  return MISSION_ICON[missionType] ?? Hexagon;
}

// ---------------------------------------------------------------------------
// Mission modifier chip
// ---------------------------------------------------------------------------

function ModifierChip({ label, faction }: { label: string; faction: string }) {
  const color = SORTIE_FACTION_COLOR[faction] ?? '#C6C6C7';
  return (
    <span
      className="inline-block font-label text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 font-semibold"
      style={{
        color,
        border:          `1px solid ${color}40`,
        backgroundColor: `${color}0D`,
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface SortieCardProps {
  mission: SortieMission;
  index:   number;
  faction: string;
}

export function SortieCard({ mission, index, faction }: SortieCardProps) {
  const factionColor = SORTIE_FACTION_COLOR[faction] ?? '#C6C6C7';
  const MissionIcon  = getMissionIcon(mission.missionType);

  // Extract node name vs region
  const nodeMatch  = mission.node.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName   = nodeMatch ? nodeMatch[1] : mission.node;
  const nodeRegion = nodeMatch ? nodeMatch[2] : '';

  // Background: fully transparent left → semi-opaque right (same pattern as FissureCard)
  const cardBg = 'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)';
  const factionOverlay = `linear-gradient(to right, transparent 40%, ${factionColor}0D 100%)`;

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col p-5"
      style={{
        background:     cardBg,
        backdropFilter: 'blur(14px)',
        borderColor:    `${factionColor}1A`,
        borderTop:      `2px solid ${factionColor}30`,
      }}
    >
      {/* Faction tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: factionOverlay }}
      />

      {/* Top-left filigree corner */}
      <span
        className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{
          borderTop:  `1px solid ${factionColor}35`,
          borderLeft: `1px solid ${factionColor}35`,
        }}
      />

      {/* Mission number badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 relative">
          {/* Number dot */}
          <span
            className="absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center z-10"
            style={{
              backgroundColor: `${factionColor}22`,
              border:          `1px solid ${factionColor}45`,
              fontSize:        '9px',
              fontFamily:      'Inter, sans-serif',
              fontWeight:      700,
              color:           factionColor,
              letterSpacing:   '0.05em',
            }}
          >
            {index + 1}
          </span>
          <MissionIcon
            size={52}
            strokeWidth={1.1}
            style={{ color: factionColor, opacity: 0.85 }}
          />
        </div>

        <div className="flex-1 min-w-0 pt-1">
          {/* Mission type */}
          <p
            className="font-headline text-2xl font-black leading-tight orokin-etched"
            style={{ color: factionColor }}
          >
            {mission.missionType}
          </p>
          {/* Node */}
          <p
            className="font-label text-[10px] leading-tight mt-0.5 truncate"
            style={{ color: '#C6C6C7', opacity: 0.45 }}
          >
            {nodeName}
            {nodeRegion && <span className="ml-1 opacity-70">({nodeRegion})</span>}
          </p>
        </div>
      </div>

      {/* Modifier chip + description */}
      <div className="flex flex-col gap-2">
        <ModifierChip label={mission.modifierType} faction={faction} />
        <p
          className="font-label text-xs leading-snug"
          style={{ color: '#C6C6C7', opacity: 0.50 }}
        >
          {mission.modifierDescription}
        </p>
      </div>
    </div>
  );
}
