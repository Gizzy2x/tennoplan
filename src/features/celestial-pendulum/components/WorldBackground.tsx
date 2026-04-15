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
            /* Dim image so overlaid text is always legible */
            filter:         'brightness(0.52) saturate(0.80)',
            /* cpBgFadeIn defined in index.css */
            animation:      'cpBgFadeIn 0.45s ease forwards',
          }}
        />
      )}

      {/* ── Edge vignette ───────────────────────────────────────────────── */}
      {/* Covers all four edges so text in every corner stays readable.    */}
      <div
        aria-hidden
        style={{
          position:   'absolute',
          inset:      0,
          background: [
            /* Bottom — heaviest, content anchors here */
            'linear-gradient(to top,    rgba(0,0,0,0.92) 0%,  rgba(0,0,0,0.60) 28%, rgba(0,0,0,0) 55%)',
            /* Top — header area */
            'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%,  rgba(0,0,0,0.30) 18%, rgba(0,0,0,0) 40%)',
            /* Left — left column text */
            'linear-gradient(to right,  rgba(0,0,0,0.68) 0%,  rgba(0,0,0,0.20) 40%, rgba(0,0,0,0) 65%)',
            /* Right — right column text */
            'linear-gradient(to left,   rgba(0,0,0,0.55) 0%,  rgba(0,0,0,0.10) 35%, rgba(0,0,0,0) 60%)',
          ].join(', '),
          zIndex:        1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
