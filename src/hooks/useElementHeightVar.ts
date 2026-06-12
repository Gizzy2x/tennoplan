/**
 * useElementHeightVar — write an element's measured height to a CSS
 * custom property so the rest of the layout can offset against it
 * without hardcoding a magic number.
 *
 * The header used to be a hardcoded `--header-h: 64px`. With this
 * hook the header measures itself on mount + on resize and writes
 * the live value to the variable. Pages can stay
 * `padding-top: var(--header-h)` and never drift when the header's
 * actual height changes (PWA window controls overlay, safe-area
 * insets, theme density toggles, etc).
 */

import { useEffect, useRef, type RefObject } from 'react';

export function useElementHeightVar<T extends HTMLElement>(
  varName: string,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const write = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(varName, `${h}px`);
    };

    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => ro.disconnect();
  }, [varName]);

  return ref;
}
