import { useState } from 'react';
import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';
import { STATE, FALLBACK, getCardGradient, getStaticRewards } from './CycleCard';

// ---------------------------------------------------------------------------
// Wiki background images — one per world.
// onError falls back to the CSS gradient from getCardGradient().
// Update these URLs to point to higher-res artwork if available.
// ---------------------------------------------------------------------------

const WORLD_BG_IMAGE: Record<string, string> = {
  cetus:   'https://static.wikia.nocookie.net/warframe/images/b/b8/Plains_of_Eidolon.png',
  vallis:  'https://static.wikia.nocookie.net/warframe/images/6/68/OrbVallisTilesetPanorama.png',
  cambion: 'https://static.wikia.nocookie.net/warframe/images/e/e4/CambionDrift.png',
  zariman: 'https://static.wikia.nocookie.net/warframe/images/f/f5/Zariman_Ten_Zero.png',
  duviri:  'https://static.wikia.nocookie.net/warframe/images/d/d7/Duviri.png',
  earth:   'https://static.wikia.nocookie.net/warframe/images/4/41/EarthRooftop.png',
};

// ---------------------------------------------------------------------------
// CinematicCyclePanel
// ---------------------------------------------------------------------------

export interface CinematicCyclePanelProps {
  status: CycleStatus;
}

export function CinematicCyclePanel({ status }: CinematicCyclePanelProps) {
  const { cycle, msRemaining, progress, isExpired } = status;
  const pres      = STATE[cycle.state] ?? FALLBACK;
  const { h, m, s } = formatMsParts(msRemaining);
  const nextState = nextCycleState(cycle.id, cycle.state);
  const nextPres  = STATE[nextState] ?? FALLBACK;
  const rewards   = getStaticRewards(cycle.id, cycle.state);
  const lootItems = rewards !== '—' ? rewards.split(' · ') : [];

  const [imgFailed, setImgFailed] = useState(false);
  const wikiUrl  = WORLD_BG_IMAGE[cycle.id];
  const cssGradient = getCardGradient(cycle.id, cycle.state);

  const darkOverlay = 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.60) 100%)';
  const tintOverlay = `linear-gradient(to left, ${pres.color}1A 0%, ${pres.color}08 60%, transparent 100%)`;

  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden"
      style={{
        background:       cssGradient,
        borderRight:      `1px solid ${pres.color}18`,
        minWidth:         0,
      }}
    >
      {/* Full-bleed background image */}
      {wikiUrl && !imgFailed && (
        <img
          src={wikiUrl}
          alt=""
          aria-hidden
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          style={{ zIndex: 0 }}
        />
      )}

      {/* Dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: darkOverlay, zIndex: 1 }}
      />

      {/* State tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: tintOverlay, zIndex: 2 }}
      />

      {/* Filigree corners */}
      <span
        className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
        style={{ borderTop: `1px solid ${pres.color}55`, borderLeft: `1px solid ${pres.color}55`, zIndex: 3 }}
      />
      <span
        className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
        style={{ borderTop: `1px solid ${pres.color}30`, borderRight: `1px solid ${pres.color}30`, zIndex: 3 }}
      />
      <span
        className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none"
        style={{ borderBottom: `1px solid ${pres.color}30`, borderLeft: `1px solid ${pres.color}30`, zIndex: 3 }}
      />
      <span
        className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
        style={{ borderBottom: `1px solid ${pres.color}20`, borderRight: `1px solid ${pres.color}20`, zIndex: 3 }}
      />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 4 }}>

        {/* TOP — world name */}
        <div className="pt-7 px-7">
          <p
            className="font-label text-[9px] uppercase tracking-[0.5em] mb-1"
            style={{ color: pres.color, opacity: 0.5 }}
          >
            World Cycle Status
          </p>
          <h3
            className="font-headline font-black text-on-surface leading-none"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.75rem)', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
          >
            {cycle.name.toUpperCase()}
          </h3>
        </div>

        {/* CENTER — countdown + medallion */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">

          {/* Countdown */}
          <div
            className="flex items-baseline"
            style={{ gap: 'clamp(4px, 0.5vw, 10px)' }}
          >
            {/* Hours */}
            <span
              className="font-headline font-black tabular-nums leading-none"
              style={{
                fontSize:   'clamp(3rem, 6vw, 7rem)',
                color:      pres.color,
                textShadow: `0 0 40px ${pres.color}70, 0 2px 12px rgba(0,0,0,0.9)`,
              }}
            >
              {h}
            </span>
            <span
              className="font-headline font-black leading-none"
              style={{
                fontSize:   'clamp(1.5rem, 3vw, 3.5rem)',
                color:      pres.color,
                opacity:    0.65,
                marginRight: 'clamp(2px, 0.4vw, 8px)',
              }}
            >
              H
            </span>
            {/* Minutes */}
            <span
              className="font-headline font-black tabular-nums leading-none"
              style={{
                fontSize:   'clamp(3rem, 6vw, 7rem)',
                color:      pres.color,
                textShadow: `0 0 40px ${pres.color}70, 0 2px 12px rgba(0,0,0,0.9)`,
              }}
            >
              {m}
            </span>
            <span
              className="font-headline font-black leading-none"
              style={{
                fontSize:   'clamp(1.5rem, 3vw, 3.5rem)',
                color:      pres.color,
                opacity:    0.65,
                marginRight: 'clamp(2px, 0.4vw, 8px)',
              }}
            >
              M
            </span>
            {/* Seconds */}
            <span
              className="font-headline font-black tabular-nums leading-none"
              style={{
                fontSize:   'clamp(3rem, 6vw, 7rem)',
                color:      pres.color,
                textShadow: `0 0 40px ${pres.color}70, 0 2px 12px rgba(0,0,0,0.9)`,
              }}
            >
              {s}
            </span>
            <span
              className="font-headline font-black leading-none"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 3.5rem)',
                color:    pres.color,
                opacity:  0.65,
              }}
            >
              S
            </span>
          </div>

          {/* UNTIL label */}
          <p
            className="font-label uppercase"
            style={{
              fontSize:      'clamp(0.6rem, 1vw, 0.85rem)',
              letterSpacing: '0.4em',
              color:         'rgba(198,198,199,0.6)',
              textShadow:    '0 1px 6px rgba(0,0,0,0.8)',
            }}
          >
            {isExpired ? 'SYNCING…' : `UNTIL ${nextPres.badge}`}
          </p>

          {/* State medallion */}
          <div
            className="flex flex-col items-center justify-center"
            style={{
              width:           'clamp(90px, 12vw, 140px)',
              height:          'clamp(90px, 12vw, 140px)',
              borderRadius:    '50%',
              border:          `2px solid ${pres.color}40`,
              backgroundColor: `${pres.color}0D`,
              boxShadow:       `0 0 28px ${pres.color}35, inset 0 0 40px ${pres.color}0A`,
              flexShrink:      0,
              gap:             4,
            }}
          >
            <span
              aria-hidden
              style={{
                fontSize:   'clamp(1.6rem, 3vw, 2.5rem)',
                lineHeight: 1,
                filter:     `drop-shadow(0 0 8px ${pres.color}80)`,
              }}
            >
              {pres.icon}
            </span>
            <span
              className="font-label font-bold uppercase"
              style={{
                fontSize:      'clamp(0.55rem, 0.8vw, 0.75rem)',
                letterSpacing: '0.18em',
                color:         pres.color,
              }}
            >
              {pres.badge}
            </span>
          </div>

        </div>

        {/* BOTTOM — rewards + progress */}
        <div className="px-7 pb-5">

          {lootItems.length > 0 && (
            <>
              <p
                className="font-label uppercase mb-1.5"
                style={{
                  fontSize:      '0.6rem',
                  letterSpacing: '0.45em',
                  color:         pres.color,
                  opacity:       0.45,
                }}
              >
                Rewards &amp; Status
              </p>
              <ul className="space-y-0.5">
                {lootItems.map(item => (
                  <li
                    key={item}
                    className="font-label flex items-center gap-2"
                    style={{
                      fontSize: 'clamp(0.6rem, 0.8vw, 0.75rem)',
                      color:    'rgba(198,198,199,0.65)',
                    }}
                  >
                    <span style={{ color: pres.color, opacity: 0.5, fontSize: '0.5rem' }}>▶</span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Progress strip */}
          <div
            className="w-full mt-4 relative overflow-hidden"
            style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="absolute inset-y-0 left-0 h-full"
              style={{
                width:           `${progress * 100}%`,
                backgroundColor: pres.color,
                boxShadow:       `0 0 6px ${pres.color}`,
                transition:      'width 1s linear',
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
