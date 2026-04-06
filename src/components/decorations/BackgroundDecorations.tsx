import { useMemo } from "react";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0;
    return s / 4294967296;
  };
}

export function BackgroundDecorations() {
  const stars = useMemo(() => {
    const rand = seededRandom(9182736);
    return Array.from({ length: 160 }, () => ({
      cx: rand() * 100,
      cy: rand() * 100,
      r: 0.12 + rand() * 1.0,
      opacity: 0.07 + rand() * 0.52,
      gold: rand() > 0.91,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden">

      {/* ── Deep space atmosphere ─────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            /* Orokin void-gold glow rising from below */
            "radial-gradient(ellipse 130% 65% at 50% 130%, rgba(193,163,85,0.10) 0%, rgba(193,163,85,0.03) 38%, transparent 60%)",
            /* Cold blue-violet nebula — upper left */
            "radial-gradient(ellipse 65% 55% at 8% 18%, rgba(186,195,254,0.04) 0%, transparent 55%)",
            /* Warm amber trace — upper right */
            "radial-gradient(ellipse 50% 40% at 92% 8%, rgba(193,163,85,0.03) 0%, transparent 50%)",
            /* Secondary gold bloom — lower right */
            "radial-gradient(ellipse 55% 45% at 88% 85%, rgba(193,163,85,0.04) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      {/* ── Star field ────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.25" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {stars.map((star, i) => (
          <circle
            key={i}
            cx={star.cx}
            cy={star.cy}
            r={star.r * 0.13}
            fill={star.gold ? "#E3C372" : "#e5e2e1"}
            opacity={star.opacity}
            filter={star.r > 0.85 ? "url(#star-glow)" : undefined}
          />
        ))}
      </svg>

      {/* ── Orokin geometric overlay ──────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Diagonal somatic lines */}
        <line x1="0"    y1="280"  x2="560"  y2="0"    stroke="#E3C372" strokeWidth="0.4" opacity="0.06" />
        <line x1="0"    y1="560"  x2="960"  y2="0"    stroke="#E3C372" strokeWidth="0.4" opacity="0.04" />
        <line x1="880"  y1="900"  x2="1440" y2="210"  stroke="#E3C372" strokeWidth="0.4" opacity="0.06" />
        <line x1="360"  y1="900"  x2="1440" y2="60"   stroke="#E3C372" strokeWidth="0.3" opacity="0.03" />
        <line x1="1200" y1="900"  x2="1440" y2="580"  stroke="#E3C372" strokeWidth="0.3" opacity="0.04" />

        {/* Top-left Orokin corner bracket */}
        <path
          d="M0,0 L140,0 L140,8 L8,8 L8,140 L0,140 Z"
          fill="none" stroke="#E3C372" strokeWidth="0.6" opacity="0.08"
        />
        <path
          d="M36,0 L36,36 L0,36"
          fill="none" stroke="#E3C372" strokeWidth="0.4" opacity="0.05"
        />

        {/* Bottom-right Orokin corner bracket */}
        <path
          d="M1440,900 L1300,900 L1300,892 L1432,892 L1432,760 L1440,760 Z"
          fill="none" stroke="#E3C372" strokeWidth="0.6" opacity="0.08"
        />
        <path
          d="M1404,900 L1404,864 L1440,864"
          fill="none" stroke="#E3C372" strokeWidth="0.4" opacity="0.05"
        />

        {/* Central Orokin void sigil — octagonal frame, barely visible */}
        <polygon
          points="760,310 820,335 840,395 820,455 760,480 700,455 680,395 700,335"
          fill="none" stroke="#E3C372" strokeWidth="0.35" opacity="0.045"
        />
        <polygon
          points="760,340 808,360 824,408 808,456 760,476 712,456 696,408 712,360"
          fill="none" stroke="#E3C372" strokeWidth="0.2" opacity="0.025"
        />

        {/* Top-right subtle tick marks */}
        <line x1="1380" y1="0"  x2="1380" y2="32" stroke="#E3C372" strokeWidth="0.4" opacity="0.06" />
        <line x1="1410" y1="0"  x2="1410" y2="18" stroke="#E3C372" strokeWidth="0.4" opacity="0.04" />
        <line x1="1440" y1="0"  x2="1440" y2="48" stroke="#E3C372" strokeWidth="0.4" opacity="0.06" />
      </svg>

      {/* ── Edge vignette ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 110% 100% at 50% 50%, transparent 42%, rgba(10,10,10,0.65) 100%)",
        }}
      />

      {/* ── Orokin gold ambient rise (void gate below) ────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[40%]"
        style={{
          background:
            "radial-gradient(ellipse 75% 100% at 50% 100%, rgba(193,163,85,0.07) 0%, transparent 68%)",
        }}
      />
    </div>
  );
}
