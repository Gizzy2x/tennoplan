import {
  Skull,
  Heart,
  Shield,
  Radio,
  Eye,
  Crosshair,
  LogOut,
  Shovel,
  KeyRound,
  Orbit,
  Medal,
  ArrowLeftRight,
  TrendingUp,
  Zap,
  FlaskConical,
  Swords,
  Hammer,
  Rocket,
  Home,
  Target,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatMsHuman } from '@/core/services/cycleService';
import { KIND_COLOR, KIND_OVERLAY } from '@/core/services/ascensionService';
import type { ChallengeStatus } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Icon resolution — keyword-based on challenge title
// ---------------------------------------------------------------------------

function getChallengeIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (t.includes('kill') || t.includes('slay') || t.includes('eliminat') || t.includes('defeat'))  return Skull;
  if (t.includes('craft') || t.includes('build') || t.includes('fabricat') || t.includes('forge')) return Hammer;
  if (t.includes('defense') || t.includes('defend'))        return Shield;
  if (t.includes('survival') || t.includes('survive'))      return Heart;
  if (t.includes('interception'))                            return Radio;
  if (t.includes('spy'))                                     return Eye;
  if (t.includes('capture'))                                 return Crosshair;
  if (t.includes('rescue'))                                  return LogOut;
  if (t.includes('excavation') || t.includes('excavat'))    return Shovel;
  if (t.includes('disruption'))                              return KeyRound;
  if (t.includes('fissure') || t.includes('relic'))         return Orbit;
  if (t.includes('syndicate') || t.includes('standing'))    return Medal;
  if (t.includes('trade') || t.includes('sell') || t.includes('buy') || t.includes('market')) return ArrowLeftRight;
  if (t.includes('level') || t.includes('rank') || t.includes('master'))  return TrendingUp;
  if (t.includes('nightmare') || t.includes('kuva'))        return Zap;
  if (t.includes('railjack') || t.includes('empyrean'))     return Rocket;
  if (t.includes('clan') || t.includes('dojo'))             return Home;
  if (t.includes('flask') || t.includes('alchemy') || t.includes('potion')) return FlaskConical;
  if (t.includes('mission') || t.includes('sortie') || t.includes('complete') || t.includes('finish')) return Swords;
  return Target;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface ChallengeCardProps {
  status:   ChallengeStatus;
  onToggle: (id: string) => void;
}

export function ChallengeCard({ status, onToggle }: ChallengeCardProps) {
  const { raw, kind, completed, msRemaining } = status;
  const color      = KIND_COLOR[kind];
  const overlay    = KIND_OVERLAY[kind];
  const ChalIcon   = getChallengeIcon(raw.title);
  // Daily timers live-tick (1s). Weekly/elite show "Xd Yh" — format won't
  // visibly change at sub-minute granularity, so they share the same `now`.
  const showTimer  = !raw.isPermanent && msRemaining > 0;
  const isPulsing  = raw.isDaily && showTimer && msRemaining < 600_000;

  // Subtle right-to-left gradient + completed dim
  const cardBg = completed
    ? 'linear-gradient(to right, transparent 0%, rgba(18,18,18,0.55) 45%, rgba(18,18,18,0.72) 100%)'
    : 'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)';

  const kindOverlay = `linear-gradient(to right, transparent 45%, ${overlay} 100%)`;

  return (
    <div
      className="glass-panel fissure-card-hover relative overflow-hidden flex gap-4 p-5 cursor-pointer select-none"
      style={{
        background:     cardBg,
        backdropFilter: 'blur(14px)',
        borderColor:    completed ? 'rgba(197,192,190,0.07)' : `${color}1A`,
        opacity:        completed ? 0.62 : 1,
        transition:     'opacity 0.25s ease, border-color 0.25s ease',
      }}
      onClick={() => onToggle(raw.id)}
    >
      {/* Kind-color overlay — right-to-left tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: kindOverlay }}
      />

      {/* Top-left filigree corner */}
      <span
        className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{
          borderTop:  `1px solid ${completed ? 'rgba(197,192,190,0.12)' : `${color}40`}`,
          borderLeft: `1px solid ${completed ? 'rgba(197,192,190,0.12)' : `${color}40`}`,
        }}
      />

      {/* ── Left: category icon ─────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 52 }}>
        <ChalIcon
          size={44}
          strokeWidth={1.1}
          style={{
            color:   completed ? 'rgba(197,192,190,0.25)' : color,
            opacity: completed ? 0.6 : 0.9,
            filter:  completed ? 'none' : kind === 'elite' ? `drop-shadow(0 0 6px ${color}60)` : 'none',
          }}
        />
      </div>

      {/* ── Center: title + description ─────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <p
          className="font-headline text-lg font-black leading-tight orokin-etched"
          style={{
            color:     completed ? 'rgba(197,192,190,0.45)' : color,
            textDecoration: completed ? 'line-through' : 'none',
            textDecorationColor: `${color}60`,
          }}
        >
          {raw.title}
        </p>
        <p
          className="font-label text-xs leading-snug line-clamp-2"
          style={{ color: '#C6C6C7', opacity: completed ? 0.35 : 0.55 }}
        >
          {raw.desc}
        </p>
      </div>

      {/* ── Right: standing + timer + toggle ────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2 pl-3" style={{ minWidth: 72 }}>
        {/* Standing reward */}
        <div className="text-right">
          <p
            className="font-mono text-xl font-bold tabular-nums leading-none"
            style={{ color: completed ? 'rgba(197,192,190,0.30)' : color }}
          >
            {(Math.max(0, Number(raw.standing) || 0) / 1000).toFixed(0)}k
          </p>
          <p
            className="font-label text-[8px] uppercase tracking-[0.2em] mt-0.5"
            style={{ color, opacity: completed ? 0.3 : 0.5 }}
          >
            standing
          </p>
        </div>

        {/* Daily countdown */}
        {showTimer && (
          <p
            className={['font-mono text-xs tabular-nums', isPulsing ? 'orokin-countdown-glow' : ''].filter(Boolean).join(' ')}
            style={{ color: isPulsing ? '#E3C372' : 'rgba(197,192,190,0.4)' }}
          >
            {formatMsHuman(msRemaining)}
          </p>
        )}

        {/* Completion toggle */}
        <div
          className="flex items-center justify-center rounded-sm transition-all"
          style={{
            width:           22,
            height:          22,
            border:          `1px solid ${completed ? `${color}80` : 'rgba(197,192,190,0.20)'}`,
            backgroundColor: completed ? `${color}22` : 'transparent',
            boxShadow:       completed && kind === 'elite' ? `0 0 8px ${color}40` : 'none',
          }}
        >
          {completed && (
            <Check
              size={13}
              strokeWidth={3}
              style={{ color }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
