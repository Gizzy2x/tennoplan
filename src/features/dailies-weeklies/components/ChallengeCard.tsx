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
import { KIND_COLOR } from '@/core/services/ascensionService';
import type { ChallengeKind, ChallengeStatus } from '@/core/domain/ascension';

// ---------------------------------------------------------------------------
// Icon resolution — keyword-based on challenge title
// ---------------------------------------------------------------------------

function getChallengeIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (t.includes('kill') || t.includes('slay') || t.includes('eliminat') || t.includes('defeat'))  return Skull;
  if (t.includes('craft') || t.includes('build') || t.includes('fabricat') || t.includes('forge')) return Hammer;
  if (t.includes('defense') || t.includes('defend'))       return Shield;
  if (t.includes('survival') || t.includes('survive'))     return Heart;
  if (t.includes('interception'))                           return Radio;
  if (t.includes('spy'))                                    return Eye;
  if (t.includes('capture'))                               return Crosshair;
  if (t.includes('rescue'))                                return LogOut;
  if (t.includes('excavation') || t.includes('excavat'))  return Shovel;
  if (t.includes('disruption'))                            return KeyRound;
  if (t.includes('fissure') || t.includes('relic'))       return Orbit;
  if (t.includes('syndicate') || t.includes('standing'))  return Medal;
  if (t.includes('trade') || t.includes('sell') || t.includes('buy') || t.includes('market')) return ArrowLeftRight;
  if (t.includes('level') || t.includes('rank') || t.includes('master')) return TrendingUp;
  if (t.includes('nightmare') || t.includes('kuva'))      return Zap;
  if (t.includes('railjack') || t.includes('empyrean'))   return Rocket;
  if (t.includes('clan') || t.includes('dojo'))           return Home;
  if (t.includes('flask') || t.includes('alchemy') || t.includes('potion')) return FlaskConical;
  if (t.includes('mission') || t.includes('sortie') || t.includes('complete') || t.includes('finish')) return Swords;
  return Target;
}

// ---------------------------------------------------------------------------
// Per-kind tag palette
// ---------------------------------------------------------------------------

const KIND_TAG: Record<ChallengeKind, {
  bg:      string;
  border:  string;
  topBord: string;
  color:   string;
  label:   string;
}> = {
  daily: {
    bg:      'rgba(229,226,225,0.92)',
    border:  'rgba(227,195,114,0.45)',
    topBord: 'rgba(227,195,114,0.75)',
    color:   '#1a1a1a',
    label:   'Daily',
  },
  weekly: {
    bg:      'rgba(198,198,199,0.88)',
    border:  'rgba(186,195,254,0.40)',
    topBord: 'rgba(186,195,254,0.65)',
    color:   '#1a1a1a',
    label:   'Weekly',
  },
  elite: {
    bg:      'rgba(200,158,8,0.90)',
    border:  'rgba(255,220,80,0.55)',
    topBord: 'rgba(255,220,80,0.85)',
    color:   '#131313',
    label:   'Elite',
  },
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface ChallengeCardProps {
  status:   ChallengeStatus;
  onToggle: (id: string) => void;
}

export function ChallengeCard({ status, onToggle }: ChallengeCardProps) {
  const { raw, kind, completed, msRemaining } = status;
  const color    = KIND_COLOR[kind];
  const ChalIcon = getChallengeIcon(raw.title);
  const tag      = KIND_TAG[kind];

  const showTimer = !raw.isPermanent && msRemaining > 0;
  const isPulsing = raw.isDaily && showTimer && msRemaining < 600_000;
  const standingK = (Math.max(0, Number(raw.standing) || 0) / 1000).toFixed(0);

  return (
    // Outer wrapper: paddingTop creates room for the overhanging kind tag
    <div
      className="relative cursor-pointer select-none"
      style={{ paddingTop: '14px' }}
      onClick={() => onToggle(raw.id)}
    >
      {/* ── Kind tag — overhangs above card top edge ─────────────────── */}
      <div
        className="fissure-variant-tag absolute top-0 right-3 z-10"
        style={{
          background:   tag.bg,
          borderTop:    `2px solid ${tag.topBord}`,
          borderRight:  `1px solid ${tag.border}`,
          borderBottom: `1px solid ${tag.border}`,
          borderLeft:   `1px solid ${tag.border}`,
          color:        tag.color,
          boxShadow:    `0 -2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)`,
        }}
      >
        {tag.label}
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div
        className="glass-panel fissure-card-hover relative overflow-hidden flex flex-col"
        style={{
          minHeight:   '200px',
          borderColor: completed ? 'rgba(197,192,190,0.07)' : `${color}22`,
          borderTop:   `1px solid ${completed ? 'rgba(197,192,190,0.09)' : `${color}30`}`,
          transition:  'border-color 0.35s ease',
        }}
      >
        {/* Kind-color top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 10%, ${color}50 50%, transparent 90%)`,
            opacity:    completed ? 0.15 : 1,
            transition: 'opacity 0.35s ease',
          }}
        />

        {/* ── COMPLETED OVERLAY ────────────────────────────────────────── */}
        {completed && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{
              background:     'linear-gradient(145deg, rgba(14,14,14,0.94) 0%, rgba(19,18,18,0.97) 100%)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            {/* Large Orokin checkmark ring */}
            <div
              className="flex items-center justify-center"
              style={{
                width:      56,
                height:     56,
                border:     `1px solid ${color}55`,
                background: `${color}0E`,
                boxShadow:  `0 0 28px ${color}30, 0 0 8px ${color}18, inset 0 1px 0 rgba(255,255,255,0.07)`,
              }}
            >
              <Check size={30} strokeWidth={1.4} style={{ color }} />
            </div>

            {/* Dimmed struck title */}
            <p
              className="font-headline font-black text-center leading-tight px-4 line-clamp-2"
              style={{
                fontSize:            '0.78rem',
                color:               'rgba(197,192,190,0.30)',
                textDecoration:      'line-through',
                textDecorationColor: 'rgba(197,192,190,0.16)',
              }}
            >
              {raw.title}
            </p>

            {/* Standing earned indicator */}
            <p
              className="font-mono text-[9px] tabular-nums uppercase tracking-[0.28em]"
              style={{ color: `${color}50` }}
            >
              {standingK}k earned
            </p>
          </div>
        )}

        {/* ── ACTIVE CONTENT ──────────────────────────────────────────── */}

        {/* Left radial spotlight — keeps icon readable against glass bg */}
        <div
          className="absolute top-0 left-0 bottom-0 w-1/2 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 15% 45%, ${color}0D, transparent 65%)`,
          }}
        />

        {/* Icon row */}
        <div className="flex items-start justify-between p-4 pb-0">
          {/* Large dominant icon — near-edge */}
          <div
            style={{
              background: `radial-gradient(circle at 38% 42%, ${color}10, transparent 58%)`,
              padding:     2,
            }}
          >
            <ChalIcon
              size={68}
              strokeWidth={0.82}
              style={{
                color:   completed ? 'rgba(197,192,190,0.10)' : color,
                opacity: completed ? 0.25 : 0.86,
                filter:  !completed
                  ? kind === 'elite'
                    ? `drop-shadow(0 0 10px ${color}75) drop-shadow(0 2px 5px rgba(0,0,0,0.65))`
                    : `drop-shadow(0 0 4px ${color}35) drop-shadow(0 2px 6px rgba(0,0,0,0.70))`
                  : 'none',
                transition: 'opacity 0.35s ease, color 0.35s ease',
              }}
            />
          </div>

          {/* Timer — top-right, low urgency */}
          {showTimer && (
            <p
              className={[
                'font-mono text-[10px] tabular-nums mt-1.5',
                isPulsing ? 'orokin-countdown-glow' : '',
              ].filter(Boolean).join(' ')}
              style={{ color: isPulsing ? '#E3C372' : 'rgba(197,192,190,0.26)' }}
            >
              {formatMsHuman(msRemaining)}
            </p>
          )}
        </div>

        {/* Standing reward — large center metric */}
        <div className="flex-1 px-4 pt-1 pb-1 flex flex-col justify-center">
          <p
            className="font-mono font-bold tabular-nums leading-none"
            style={{
              fontSize:   '2.1rem',
              color,
              textShadow: completed ? 'none' : `0 0 20px ${color}42`,
              opacity:    completed ? 0.14 : 1,
              transition: 'opacity 0.35s ease',
            }}
          >
            {standingK}k
          </p>
          <p
            className="font-label text-[9px] uppercase tracking-[0.32em] mt-0.5"
            style={{
              color,
              opacity: completed ? 0.10 : 0.38,
              transition: 'opacity 0.35s ease',
            }}
          >
            standing
          </p>
        </div>

        {/* Bottom: challenge title + short description */}
        <div
          className="px-4 pt-2.5 pb-4"
          style={{
            borderTop: `1px solid ${completed ? 'rgba(197,192,190,0.06)' : `${color}14`}`,
            transition: 'border-color 0.35s ease',
          }}
        >
          <p
            className="font-headline font-black leading-tight line-clamp-2"
            style={{
              fontSize:   '0.80rem',
              color:      completed ? 'rgba(197,192,190,0.20)' : '#E5E2E1',
              textShadow: completed ? 'none' : '0 1px 3px rgba(227,195,114,0.25), 0 2px 4px rgba(0,0,0,0.70)',
              transition: 'color 0.35s ease',
            }}
          >
            {raw.title}
          </p>
          {raw.desc && raw.desc !== raw.title && (
            <p
              className="font-label text-[10px] leading-snug mt-0.5 line-clamp-1"
              style={{
                color:      '#C6C6C7',
                opacity:    completed ? 0.10 : 0.38,
                transition: 'opacity 0.35s ease',
              }}
            >
              {raw.desc}
            </p>
          )}
        </div>

        {/* Bottom-right filigree corner bracket */}
        <span
          className="absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none"
          style={{
            borderBottom: `1px solid ${color}22`,
            borderRight:  `1px solid ${color}22`,
          }}
        />
      </div>
    </div>
  );
}
