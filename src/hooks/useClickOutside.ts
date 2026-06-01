/**
 * useClickOutside — invoke a handler when a pointerdown lands
 * outside the referenced element(s).
 *
 * Two flavours:
 *   • Single ref:   useClickOutside(ref, onOutside)
 *   • Multi-ref:    useClickOutside([panelRef, toggleRef], onOutside)
 *                   — useful when you want clicks on the TOGGLE
 *                     that opened the panel to fall through to its
 *                     own handler instead of being treated as
 *                     "outside" (which would re-close immediately).
 *
 * Enabled-by-default; pass `{ enabled: false }` to suspend the
 * listener (e.g. when the surface that uses it isn't open). Defers
 * to capture-phase pointerdown so the handler runs BEFORE bubble
 * handlers on the trigger element.
 *
 * Touch-friendly: listens on `pointerdown` rather than `mousedown`
 * so finger taps register without a 300ms delay.
 */

import { useEffect, type RefObject } from 'react';

type RefLike = RefObject<HTMLElement | null>;

interface Options {
  enabled?: boolean;
}

export function useClickOutside(
  refOrRefs: RefLike | RefLike[],
  onOutside: (e: PointerEvent) => void,
  { enabled = true }: Options = {},
): void {
  useEffect(() => {
    if (!enabled) return;

    const refs = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs];

    const handler = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      for (const ref of refs) {
        const el = ref.current;
        if (el && el.contains(target)) return;
      }
      onOutside(e);
    };

    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [refOrRefs, onOutside, enabled]);
}
