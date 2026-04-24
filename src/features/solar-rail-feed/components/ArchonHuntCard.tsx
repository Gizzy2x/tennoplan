import {
  Shield, Heart, Radio, Crosshair, LogOut, Skull, Eye,
  ShieldCheck, Shovel, KeyRound, Zap, Bomb, Swords, Hexagon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { getTypographyStyle } from '@/tokens/utils';
import { SORTIE_FACTION_COLOR } from '@/core/services/ascensionService';
import type { ArchonHuntMission } from '@/core/domain/ascension';

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

export interface ArchonHuntCardProps {
  mission: ArchonHuntMission;
  index:   number;
  faction: string;
}

export function ArchonHuntCard({ mission, index, faction }: ArchonHuntCardProps) {
  const { tokens } = useThemeStore();
  const factionColor = SORTIE_FACTION_COLOR[faction] ?? '#C6C6C7';
  const MissionIcon  = getMissionIcon(mission.type);

  const nodeMatch  = mission.node.match(/^(.+?)\s*\((.+)\)$/);
  const nodeName   = nodeMatch ? nodeMatch[1] : mission.node;
  const nodeRegion = nodeMatch ? nodeMatch[2] : '';

  const cardBg         = 'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)';
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
      <div className="absolute inset-0 pointer-events-none" style={{ background: factionOverlay }} />
      <span
        className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: `1px solid ${factionColor}35`, borderLeft: `1px solid ${factionColor}35` }}
      />

      {/* Mission number badge + icon + type */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 relative">
          <span
            data-role="labelTiny"
            className="absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center z-10"
            style={{
              ...getTypographyStyle(tokens, 'labelTiny'),
              backgroundColor: `${factionColor}22`,
              border:          `1px solid ${factionColor}45`,
              color:           factionColor,
            }}
          >
            {index + 1}
          </span>
          <MissionIcon size={52} strokeWidth={1.1} style={{ color: factionColor, opacity: 0.85 }} />
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <p
            data-role="hero"
            className="leading-tight orokin-etched"
            style={{ ...getTypographyStyle(tokens, 'hero'), color: factionColor }}
          >
            {mission.type}
          </p>
          <p
            data-role="labelSmall"
            className="leading-tight mt-0.5 truncate"
            style={{ ...getTypographyStyle(tokens, 'labelSmall'), color: '#C6C6C7', opacity: 0.45 }}
          >
            {nodeName}
            {nodeRegion && <span className="ml-1 opacity-70">({nodeRegion})</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
