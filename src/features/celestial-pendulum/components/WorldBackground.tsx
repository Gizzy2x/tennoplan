/**
 * WorldBackground
 * ───────────────────────────────────────────────────────────────────────────
 * Fixed-position, full-bleed cinematic background for the Celestial Pendulum.
 *
 * WHY FIXED?
 *   position: fixed keeps the background locked to the window bounds at all
 *   times. No matter how tall the content grows, or whether the page is in a
 *   scrollable container, the image never moves or scales unexpectedly.
 *
 * SIDEBAR ADAPTATION
 *   The background starts at left: var(--sidebar-w, 280px). To support a
 *   collapsible sidebar in the future, simply update --sidebar-w on :root
 *   (see index.css). This component needs zero changes.
 *
 * BACKGROUND REGISTRY
 *   The URL comes from worldAssets.ts — the single source of truth for all
 *   world background images. Swap or add images there, never here.
 *
 * BOTTOM GRADIENT
 *   A subtle 5–10 % black-to-transparent gradient is permanently applied at
 *   the bottom edge of every world tab for visual consistency.
 *
 * PERFORMANCE
 *   One <img> per active world. object-cover handles any aspect ratio.
 *   The key animation (cpBgFadeIn) is defined in index.css and keeps
 *   transitions smooth on world tab switches.
 */

interface WorldBackgroundProps {
  /** Resolved image URL from worldAssets.ts */
  url: string;
  /** CSS color / gradient shown before the image loads or when url is empty */
  fallbackColor?: string;
}

export function WorldBackground({ url, fallbackColor = '#131313' }: WorldBackgroundProps) {
  return (
    <div
      aria-hidden
      style={{
        position:      'fixed',
        top:           0,
        left:          'var(--sidebar-w, 280px)',
        right:         0,
        bottom:        0,
        zIndex:        0,
        background:    fallbackColor,
        overflow:      'hidden',
        pointerEvents: 'none',
        userSelect:    'none',
      }}
    >
      {/* ── World image ─────────────────────────────────────────────────── */}
      {url && (
        <img
          key={url}
          src={url}
          alt=""
          draggable={false}
          style={{
            position:       'absolute',
            inset:          0,
            width:          '100%',
            height:         '100%',
            objectFit:      'cover',
            objectPosition: 'center',
            display:        'block',
            /* cpBgFadeIn defined in index.css */
            animation:      'cpBgFadeIn 0.45s ease forwards',
          }}
        />
      )}

      {/* ── Edge vignette ───────────────────────────────────────────────── */}
      {/* Top and bottom darkening lives HERE on the fixed background so   */}
      {/* it naturally covers the full viewport. Panel-level overlays only */}
      {/* handle left/right text-readability gradients.                    */}
      <div
        aria-hidden
        style={{
          position:   'absolute',
          inset:      0,
          /* Bottom fade + 45° diagonal sweep from bottom-left (slightly lighter) */
          background: [
            'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.70) 25%, rgba(0,0,0,0) 50%)',
            'linear-gradient(45deg,  rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 48%)',
          ].join(', '),
          zIndex:        1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
