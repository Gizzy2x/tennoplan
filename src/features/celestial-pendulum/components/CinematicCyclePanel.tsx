import { useState } from 'react';
import { formatMsParts, nextCycleState } from '@/core/services/cycleService';
import type { CycleStatus } from '@/core/domain/cycles';
import type { SyndicateMission } from '@/core/domain/syndicates';
import { STATE, FALLBACK, getCardGradient, getStaticRewards } from './CycleCard';
import { BountyJobList } from './BountyJobList';

// ---------------------------------------------------------------------------
// Wiki background images (may be hotlink-blocked; CSS gradients are the
// real visual foundation — images are a bonus if they load).
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
// Orokin diamond ornament — centered on the border line
// ---------------------------------------------------------------------------
function Diamond({ color, size = 7, opacity = 0.75, lineWidth = 18 }: {
  color: string;
  size?: number;
  opacity?: number;
  lineWidth?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
      <div style={{ width: lineWidth, height: 1, background: color, opacity: opacity * 0.45 }} />
      <div style={{
        width: size,
        height: size,
        background: color,
        transform: 'rotate(45deg)',
        opacity,
        boxShadow: `0 0 6px ${color}90`,
        flexShrink: 0,
      }} />
      <div style={{ width: lineWidth, height: 1, background: color, opacity: opacity * 0.45 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CinematicCyclePanel
// ---------------------------------------------------------------------------
export interface CinematicCyclePanelProps {
  status:            CycleStatus;
  syndicateMission?: SyndicateMission | null;
  now?:              number;
  /** compact = secondary row (Duviri / Earth) — 2 panels, taller font */
  compact?:          boolean;
}

export function CinematicCyclePanel({
  status,
  syndicateMission,
  now = Date.now(),
  compact = false,
}: CinematicCyclePanelProps) {
  const { cycle, msRemaining, progress, isExpired } = status;
  const pres      = STATE[cycle.state] ?? FALLBACK;
  const { h, m, s } = formatMsParts(msRemaining);
  const nextState = nextCycleState(cycle.id, cycle.state);
  const nextPres  = STATE[nextState] ?? FALLBACK;
  const rewards   = getStaticRewards(cycle.id, cycle.state);
  const lootItems = rewards !== '—' ? rewards.split(' · ') : [];

  const [imgFailed, setImgFailed] = useState(false);
  const wikiUrl     = WORLD_BG_IMAGE[cycle.id];
  const cssGradient = getCardGradient(cycle.id, cycle.state);

  const hasBounties = !compact && !!syndicateMission && syndicateMission.jobs.length > 0;

  // Compact row = 2 panels wide = more space per panel = bigger timer
  // Primary row = 4 panels wide = less space = smaller (but still large) timer
  const timerFont    = compact ? 'clamp(3.5rem, 7vw, 8rem)'    : 'clamp(2.2rem, 4.5vw, 5.5rem)';
  const unitFont     = compact ? 'clamp(1.4rem, 2.8vw, 3.2rem)': 'clamp(0.9rem, 1.8vw, 2.2rem)';
  const worldFont    = compact ? 'clamp(0.85rem, 1.6vw, 1.4rem)': 'clamp(0.8rem, 1.6vw, 1.6rem)';
  const medallionSz  = compact ? 120 : 100;
  const medalIconSz  = compact ? '2.4rem' : '2rem';
  const topPad       = compact ? 14 : 80; // primary panels start behind the AppShell header

  // Overlays: heavy at bottom for text legibility, moderate at top
  const darkOverlay = [
    'linear-gradient(to top,',
    '  rgba(0,0,0,0.97) 0%,',
    '  rgba(0,0,0,0.82) 28%,',
    '  rgba(0,0,0,0.52) 58%,',
    '  rgba(0,0,0,0.62) 100%)',
  ].join('\n');
  const accentTint = `linear-gradient(170deg, ${pres.color}14 0%, transparent 50%)`;

  const BORDER_INSET = 10; // px — how far the ornate frame is from panel edge

  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden"
      style={{
        background:  cssGradient,
        borderRight: `1px solid rgba(227,195,114,0.10)`,
        minWidth:    0,
      }}
    >
      {/* Full-bleed background image (bonus — may not load due to hotlink protection) */}
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

      {/* Accent color tint — faint top-corner blush */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: accentTint, zIndex: 2 }}
      />

      {/* ── Orokin ornate frame ─────────────────────────────────────────── */}
      {/* Outer border — full panel edge */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset:  0,
          border: `1px solid ${pres.color}18`,
          zIndex: 3,
        }}
      />

      {/* Inner border — inset frame (the main "card" border) */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset:     BORDER_INSET,
          border:    `1px solid ${pres.color}35`,
          boxShadow: `inset 0 0 40px ${pres.color}06`,
          zIndex:    3,
        }}
      />

      {/* Corner brackets on inner frame */}
      <span className="absolute pointer-events-none" style={{ top: BORDER_INSET, left: BORDER_INSET, width: 20, height: 20, borderTop: `1px solid ${pres.color}70`, borderLeft: `1px solid ${pres.color}70`, zIndex: 4 }} />
      <span className="absolute pointer-events-none" style={{ top: BORDER_INSET, right: BORDER_INSET, width: 20, height: 20, borderTop: `1px solid ${pres.color}50`, borderRight: `1px solid ${pres.color}50`, zIndex: 4 }} />
      <span className="absolute pointer-events-none" style={{ bottom: BORDER_INSET, left: BORDER_INSET, width: 20, height: 20, borderBottom: `1px solid ${pres.color}40`, borderLeft: `1px solid ${pres.color}40`, zIndex: 4 }} />
      <span className="absolute pointer-events-none" style={{ bottom: BORDER_INSET, right: BORDER_INSET, width: 20, height: 20, borderBottom: `1px solid ${pres.color}30`, borderRight: `1px solid ${pres.color}30`, zIndex: 4 }} />

      {/* Top diamond — sits on the inner frame's top edge */}
      <div
        className="absolute left-1/2 pointer-events-none"
        style={{ top: BORDER_INSET, transform: 'translate(-50%, -50%)', zIndex: 5 }}
      >
        <Diamond color={pres.color} />
      </div>

      {/* Bottom diamond */}
      <div
        className="absolute left-1/2 pointer-events-none"
        style={{ bottom: BORDER_INSET, transform: 'translate(-50%, 50%)', zIndex: 5 }}
      >
        <Diamond color={pres.color} opacity={0.45} lineWidth={12} />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 6 }}>

        {/* TOP: World name */}
        <div
          className="flex flex-col items-center text-center"
          style={{ paddingTop: topPad + BORDER_INSET, paddingBottom: 0, paddingLeft: 16, paddingRight: 16 }}
        >
          <p
            className="font-label uppercase"
            style={{
              fontSize:      '0.55rem',
              letterSpacing: '0.55em',
              color:         pres.color,
              opacity:       0.5,
              marginBottom:  6,
            }}
          >
            {compact ? 'World Cycle' : 'World Cycle Status'}
          </p>
          <h3
            className="font-headline font-black text-on-surface leading-none uppercase"
            style={{
              fontSize:      worldFont,
              letterSpacing: '0.1em',
              textShadow:    '0 1px 16px rgba(0,0,0,0.95)',
            }}
          >
            {cycle.name}
          </h3>
        </div>

        {/* CENTER: Timer + "UNTIL X" + medallion */}
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ padding: '12px 8px', gap: 0 }}
        >
          {/* ── Giant countdown ── */}
          <div
            style={{
              display:    'flex',
              alignItems: 'flex-end',
              gap:        'clamp(1px, 0.3vw, 5px)',
              marginBottom: 6,
              flexWrap:   'nowrap',
            }}
          >
            {[
              { val: h, unit: 'H' },
              { val: m, unit: 'M' },
              { val: s, unit: 'S' },
            ].map(({ val, unit }, i) => (
              <div key={unit} style={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                <span
                  style={{
                    fontFamily:        'var(--font-headline)',
                    fontWeight:        900,
                    fontSize:          timerFont,
                    lineHeight:        0.9,
                    color:             pres.color,
                    textShadow:        `0 0 50px ${pres.color}55, 0 2px 20px rgba(0,0,0,0.99)`,
                    fontVariantNumeric:'tabular-nums',
                    letterSpacing:     '-0.03em',
                  }}
                >
                  {val}
                </span>
                <span
                  style={{
                    fontFamily:  'var(--font-headline)',
                    fontWeight:  700,
                    fontSize:    unitFont,
                    color:       pres.color,
                    opacity:     0.5,
                    lineHeight:  1,
                    paddingBottom: '0.18em',
                    marginRight: i < 2 ? 'clamp(2px, 0.5vw, 10px)' : 0,
                  }}
                >
                  {unit}
                </span>
              </div>
            ))}
          </div>

          {/* UNTIL label */}
          <p
            className="font-label uppercase"
            style={{
              fontSize:      'clamp(0.5rem, 0.85vw, 0.75rem)',
              letterSpacing: '0.45em',
              color:         'rgba(198,198,199,0.45)',
              textShadow:    '0 1px 8px rgba(0,0,0,0.9)',
              marginBottom:  20,
            }}
          >
            {isExpired ? 'SYNCING…' : `UNTIL ${nextPres.badge}`}
          </p>

          {/* State medallion */}
          <div
            style={{
              width:           medallionSz,
              height:          medallionSz,
              borderRadius:    '50%',
              border:          `1.5px solid ${pres.color}50`,
              background:      `radial-gradient(circle at 38% 32%, ${pres.color}1A 0%, ${pres.color}07 65%, transparent 100%)`,
              boxShadow:       `0 0 40px ${pres.color}22, inset 0 0 30px ${pres.color}0A`,
              display:         'flex',
              flexDirection:   'column',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             6,
              flexShrink:      0,
            }}
          >
            <span
              aria-hidden
              style={{
                fontSize:  medalIconSz,
                lineHeight: 1,
                filter:    `drop-shadow(0 0 10px ${pres.color}99)`,
              }}
            >
              {pres.icon}
            </span>
            <span
              className="font-label font-bold uppercase"
              style={{
                fontSize:      'clamp(0.48rem, 0.72vw, 0.65rem)',
                letterSpacing: '0.22em',
                color:         pres.color,
              }}
            >
              {pres.badge}
            </span>
          </div>
        </div>

        {/* BOTTOM: bounties / loot info + progress bar */}
        <div style={{ padding: `0 ${BORDER_INSET + 8}px ${BORDER_INSET + 14}px`, flexShrink: 0 }}>

          {hasBounties ? (
            <div
              style={{
                maxHeight:      'clamp(90px, 20vh, 170px)',
                overflowY:      'auto',
                marginBottom:   10,
                scrollbarWidth: 'thin',
              }}
            >
              <BountyJobList
                jobs={syndicateMission!.jobs}
                accentColor={pres.color}
                expiryMs={syndicateMission!.expiryMs}
                now={now}
                maxJobsShown={3}
              />
            </div>
          ) : lootItems.length > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <p
                className="font-label uppercase"
                style={{ fontSize: '0.5rem', letterSpacing: '0.45em', color: pres.color, opacity: 0.38, marginBottom: 5 }}
              >
                Active Rewards
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {lootItems.map(item => (
                  <li
                    key={item}
                    className="font-label"
                    style={{
                      fontSize:    'clamp(0.52rem, 0.72vw, 0.65rem)',
                      color:       'rgba(198,198,199,0.5)',
                      display:     'flex',
                      alignItems:  'center',
                      gap:         6,
                    }}
                  >
                    <span style={{ color: pres.color, opacity: 0.4, fontSize: '0.35rem', flexShrink: 0 }}>▶</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Progress strip */}
          <div
            style={{
              width:           '100%',
              height:          3,
              background:      'rgba(255,255,255,0.06)',
              borderRadius:    2,
              overflow:        'hidden',
              position:        'relative',
            }}
          >
            <div
              style={{
                position:        'absolute',
                inset:           '0 auto 0 0',
                width:           `${progress * 100}%`,
                background:      pres.color,
                boxShadow:       `0 0 8px ${pres.color}`,
                transition:      'width 1s linear',
                borderRadius:    2,
              }}
            />
          </div>

          {/* State labels flanking the progress bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span
              className="font-label uppercase"
              style={{ fontSize: '0.48rem', letterSpacing: '0.3em', color: pres.color, opacity: 0.5 }}
            >
              {pres.badge}
            </span>
            <span
              className="font-label uppercase"
              style={{ fontSize: '0.48rem', letterSpacing: '0.3em', color: 'rgba(198,198,199,0.28)' }}
            >
              {nextPres.badge}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
