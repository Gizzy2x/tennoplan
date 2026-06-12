/**
 * PressTip — tooltip primitive that works on both pointer kinds.
 *
 *   • Desktop (mouse / pointer:fine): hover for 280ms → show. Leave → hide.
 *   • Touch (pointer:coarse):         long-press for 480ms → show. Tap
 *                                     again or release without holding → hide.
 *
 * One component handles both, so consumers can drop `title="..."` and
 * use this anywhere they want a tooltip. No floating-ui dependency —
 * the tooltip is absolutely-positioned via `getBoundingClientRect()`
 * inside a portal, with simple top/bottom flipping when the trigger
 * is too close to the viewport edge.
 *
 * Usage:
 *   <PressTip content="Vaulted in Update 35">
 *     <span className="badge">VAULTED</span>
 *   </PressTip>
 */

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './PressTip.module.css';

const HOVER_DELAY_MS    = 280;
const PRESS_DELAY_MS    = 480;
const PRESS_MOVE_THRESHOLD_PX = 8;

export type TipPlacement = 'top' | 'bottom';

interface PressTipProps {
  /** Tooltip content — string or any node (icons, formatted text). */
  content:   ReactNode;
  /** Preferred placement; flips if there's no room. */
  placement?: TipPlacement;
  /** The trigger element. Must accept a ref + pointer event props. */
  children:  ReactElement<{
    ref?: Ref<HTMLElement>;
    onPointerEnter?: (e: React.PointerEvent) => void;
    onPointerLeave?: (e: React.PointerEvent) => void;
    onPointerDown?:  (e: React.PointerEvent) => void;
    onPointerUp?:    (e: React.PointerEvent) => void;
    onPointerMove?:  (e: React.PointerEvent) => void;
    onPointerCancel?: (e: React.PointerEvent) => void;
  }>;
}

interface TipPosition {
  top:       number;
  left:      number;
  placement: TipPlacement;
}

export function PressTip({ content, placement = 'top', children }: PressTipProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tipRef     = useRef<HTMLDivElement | null>(null);
  const showTimer  = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<TipPosition | null>(null);

  const clearTimer = () => {
    if (showTimer.current != null) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  };

  const computePosition = useCallback((): TipPosition | null => {
    const trig = triggerRef.current;
    const tip  = tipRef.current;
    if (!trig || !tip) return null;
    const tr = trig.getBoundingClientRect();
    const th = tip.getBoundingClientRect();

    // Horizontal: center over the trigger, clamped to viewport.
    const left = clamp(
      tr.left + tr.width / 2 - th.width / 2,
      8,
      window.innerWidth - th.width - 8,
    );

    // Vertical: prefer requested placement; flip if there's no room.
    const wantTop    = placement === 'top';
    const fitsTop    = tr.top - th.height - 8 >= 0;
    const fitsBottom = tr.bottom + th.height + 8 <= window.innerHeight;
    const finalPlace: TipPlacement =
      wantTop && fitsTop    ? 'top' :
      !wantTop && fitsBottom ? 'bottom' :
      fitsTop ? 'top' : 'bottom';

    const top = finalPlace === 'top'
      ? tr.top    - th.height - 8
      : tr.bottom + 8;

    return { top, left, placement: finalPlace };
  }, [placement]);

  // Recompute position whenever the tip opens or its content changes
  // (the rect isn't known until the tip is mounted with its content).
  useLayoutEffect(() => {
    if (!open) return;
    const p = computePosition();
    if (p) setPos(p);
  }, [open, computePosition, content]);

  // Re-position on scroll/resize while open.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const p = computePosition();
      if (p) setPos(p);
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, computePosition]);

  // Cleanup any pending timer on unmount.
  useEffect(() => () => clearTimer(), []);

  // ── Trigger handlers ───────────────────────────────────────────

  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return; // touch is handled by down/up
    clearTimer();
    showTimer.current = window.setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  };

  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimer();
    setOpen(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return; // mouse uses hover path
    pressStart.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    showTimer.current = window.setTimeout(() => setOpen(true), PRESS_DELAY_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pressStart.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (Math.hypot(dx, dy) > PRESS_MOVE_THRESHOLD_PX) {
      clearTimer();
      pressStart.current = null;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    clearTimer();
    pressStart.current = null;
    // If the tip was already shown by a long-press, leave it briefly
    // so the user can read it; close on next touch anywhere.
    if (open) {
      const closeOnce = () => { setOpen(false); document.removeEventListener('pointerdown', closeOnce); };
      requestAnimationFrame(() => document.addEventListener('pointerdown', closeOnce));
    }
  };

  const onPointerCancel = () => {
    clearTimer();
    pressStart.current = null;
    setOpen(false);
  };

  // ── Compose handlers onto the child ────────────────────────────
  if (!isValidElement(children)) return children;

  const composed = cloneElement(children, {
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el;
      // Forward to any existing ref the child had.
      const existing = (children as unknown as { ref?: Ref<HTMLElement> }).ref;
      if (typeof existing === 'function') existing(el);
      else if (existing && 'current' in existing) {
        (existing as { current: HTMLElement | null }).current = el;
      }
    },
    onPointerEnter:  chain(children.props.onPointerEnter,  onPointerEnter),
    onPointerLeave:  chain(children.props.onPointerLeave,  onPointerLeave),
    onPointerDown:   chain(children.props.onPointerDown,   onPointerDown),
    onPointerUp:     chain(children.props.onPointerUp,     onPointerUp),
    onPointerMove:   chain(children.props.onPointerMove,   onPointerMove),
    onPointerCancel: chain(children.props.onPointerCancel, onPointerCancel),
  });

  return (
    <>
      {composed}
      {open && createPortal(
        <div
          ref={tipRef}
          className={styles.tip}
          data-placement={pos?.placement ?? placement}
          style={pos
            ? { top: pos.top, left: pos.left, opacity: 1 }
            : { top: -9999,   left: -9999,    opacity: 0 }}
          role="tooltip"
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function chain<E extends React.SyntheticEvent>(
  a: ((e: E) => void) | undefined,
  b: (e: E) => void,
): (e: E) => void {
  return (e: E) => {
    if (a) a(e);
    if (!e.defaultPrevented) b(e);
  };
}
