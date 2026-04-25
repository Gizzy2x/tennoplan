import {
  Shield, Heart, Radio, Crosshair, LogOut, Skull, Eye,
  ShieldCheck, Shovel, KeyRound, Bomb, Swords, Hexagon, Zap,
  AlertTriangle, Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ArchimedeaMission } from '@/core/domain/ascension';

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

const ACCENT      = '#00d4ff';  // teal — Deep Archimedea identity
const HARD_COLOR  = '#c084fc';  // purple — Elite (isHard) risks

export interface DeepArchimedeaCardProps {
  mission: ArchimedeaMission;
  index:   number;
}

export function DeepArchimedeaCard({ mission, index }: DeepArchimedeaCardProps) {
  const MissionIcon = getMissionIcon(mission.missionType);

  const cardBg  = 'linear-gradient(to right, transparent 0%, rgba(18,22,30,0.52) 42%, rgba(20,22,34,0.70) 100%)';
  const overlay = `linear-gradient(to right, transparent 40%, ${ACCENT}0C 100%)`;

  const normalRisks = mission.risks.filter(r => !r.isHard);
  const hardRisks   = mission.risks.filter(r =>  r.isHard);

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col p-5"
      style={{
        background:     cardBg,
        backdropFilter: 'blur(14px)',
        borderColor:    `${ACCENT}1A`,
        borderTop:      `2px solid ${ACCENT}35`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: overlay }} />
      <span
        className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: `1px solid ${ACCENT}35`, borderLeft: `1px solid ${ACCENT}35` }}
      />

      {/* Header: number badge + mission type */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 relative">
          <span
            data-role="labelTiny"
            className="typo-label-xs absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center z-10"
            style={{
              backgroundColor: `${ACCENT}18`,
              border:          `1px solid ${ACCENT}40`,
              color:           ACCENT,
            }}
          >
            {index + 1}
          </span>
          <MissionIcon size={48} strokeWidth={1.1} style={{ color: ACCENT, opacity: 0.80 }} />
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <p
            data-role="hero"
            className="typo-hero leading-tight orokin-etched"
            style={{ color: ACCENT }}
          >
            {mission.missionType}
          </p>
          <p
            data-role="labelTiny"
            className="typo-label-xs mt-0.5"
            style={{ color: '#a8a5a0', opacity: 0.50 }}
          >
            {mission.faction}
          </p>
        </div>
      </div>

      {/* Deviation modifier */}
      {mission.deviation && (
        <div
          className="mt-3 px-2.5 py-2 flex items-start gap-2"
          style={{
            backgroundColor: `${ACCENT}0A`,
            borderLeft:      `2px solid ${ACCENT}40`,
          }}
        >
          <Flame size={10} strokeWidth={2} style={{ color: ACCENT, opacity: 0.7, flexShrink: 0, marginTop: 2 }} />
          <div className="min-w-0">
            <p
              data-role="labelTiny"
              className="typo-label-xs font-bold"
              style={{ color: ACCENT, opacity: 0.80 }}
            >
              {mission.deviation.name}
            </p>
            <p
              data-role="labelTiny"
              className="typo-label-xs leading-snug mt-0.5"
              style={{ color: '#a8a5a0', opacity: 0.65 }}
            >
              {mission.deviation.description}
            </p>
          </div>
        </div>
      )}

      {/* Normal risks */}
      {normalRisks.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {normalRisks.map((risk, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle size={9} strokeWidth={2} style={{ color: '#E3C372', opacity: 0.55, flexShrink: 0, marginTop: 2 }} />
              <p
                data-role="labelTiny"
                className="typo-label-xs leading-snug"
                style={{ color: '#a8a5a0', opacity: 0.70 }}
              >
                <span style={{ color: '#E3C372', opacity: 0.80 }}>{risk.name} · </span>
                {risk.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Hard (Elite) risks */}
      {hardRisks.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {hardRisks.map((risk, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle size={9} strokeWidth={2} style={{ color: HARD_COLOR, opacity: 0.65, flexShrink: 0, marginTop: 2 }} />
              <p
                data-role="labelTiny"
                className="typo-label-xs leading-snug"
                style={{ color: '#a8a5a0', opacity: 0.70 }}
              >
                <span style={{ color: HARD_COLOR, opacity: 0.85 }}>{risk.name} · </span>
                {risk.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
