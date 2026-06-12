/**
 * motion.ts — canonical motion vocabulary.
 *
 * Every motion.div / AnimatePresence / transition in the app should
 * pull its `transition` and (when applicable) its `variants` from
 * this file. The goal is rhythm: if every overlay slides in with the
 * same spring shape, the app feels coherent without anyone having to
 * think about timing every time they add an animation.
 *
 * Three timing primitives:
 *   • springFirm  — type:spring, duration:0.30s, bounce:0. The
 *                   default for panels/sheets/drawers/dropdowns. No
 *                   tacky overshoot; smooth deceleration into rest.
 *   • springSoft  — slightly slower, slightly bouncier. For
 *                   delight-y entrances (toasts, success states).
 *   • fadeQuick   — duration:0.18s, no spring. Use for scrim/fade
 *                   transitions where physical motion doesn't apply.
 *
 * And four common variant sets ready to spread onto a motion.*
 * component:
 *   • fadeScale       — for centered modals / cheat sheets / popups
 *   • slideFromLeft   — for left-edge drawers (hamburger nav)
 *   • slideFromRight  — for right-edge drawers (filters, settings)
 *   • slideFromBottom — for bottom sheets on mobile
 *
 * motion/react automatically respects `prefers-reduced-motion`; no
 * extra guards needed at call sites.
 */

import type { Transition, Variants } from 'motion/react';

// ─── Timing primitives ─────────────────────────────────────────

export const springFirm: Transition = {
  type:     'spring',
  duration: 0.30,
  bounce:   0,
};

export const springSoft: Transition = {
  type:     'spring',
  duration: 0.42,
  bounce:   0.10,
};

export const fadeQuick: Transition = {
  duration: 0.18,
};

export const fadeMedium: Transition = {
  duration: 0.28,
};

// ─── Variant kits ──────────────────────────────────────────────

/** Centered fade-in with a hair of scale. Pair with springFirm. */
export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1,    y: 0 },
  exit:    { opacity: 0, scale: 0.98, y: 6 },
};

/** Pure opacity fade. Pair with fadeQuick (no spring). */
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

/**
 * Slide-in factory: produces variants for a side-anchored drawer.
 * The `distance` argument is the drawer's width (or height for
 * top/bottom). The drawer ENTERS from that offset and EXITS back to
 * it, so a 260px-wide left drawer should call slideFromLeft(260).
 */
export function slideFromLeft(distance: number): Variants {
  return {
    initial: { x: -distance },
    animate: { x: 0 },
    exit:    { x: -distance },
  };
}

export function slideFromRight(distance: number): Variants {
  return {
    initial: { x: distance },
    animate: { x: 0 },
    exit:    { x: distance },
  };
}

export function slideFromBottom(distance: number): Variants {
  return {
    initial: { y: distance, opacity: 0 },
    animate: { y: 0,        opacity: 1 },
    exit:    { y: distance, opacity: 0 },
  };
}

// ─── Easing strings for non-motion-library use ─────────────────

/** Use in CSS `transition` declarations for non-motion-library elements. */
export const easing = {
  outQuart: 'cubic-bezier(0.25, 1,    0.5,  1)',
  outExpo:  'cubic-bezier(0.16, 1,    0.3,  1)',
  outQuint: 'cubic-bezier(0.22, 1,    0.36, 1)',
  inOut:    'cubic-bezier(0.4,  0,    0.2,  1)',
} as const;
