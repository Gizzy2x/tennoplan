/**
 * Sheet — overlay surface that adapts to viewport.
 *
 *   • Wide (≥540px): centered card with a backdrop scrim. Spring
 *     fade + scale enter, same transition shape as other overlays
 *     so motion rhythm stays consistent.
 *
 *   • Narrow (<540px): full-width bottom sheet that slides up from
 *     the bottom edge with a drag-handle and rounded top corners.
 *
 * Single component, single mental model. Replaces center-aligned
 * modals that break on phones and bottom-drawer code that breaks on
 * desktop. Consumers don't pick — Sheet picks for them based on the
 * viewport at open time.
 *
 * Behaviour:
 *   • Scrim click  → close
 *   • Escape key   → close
 *   • Auto-focuses the panel for screen readers; restores focus
 *     to the previously-focused element on close.
 *
 * Usage:
 *   <Sheet open={open} onClose={close} title="Voruna Prime">
 *     <p>Splendor and ferocity reach their savage apex…</p>
 *   </Sheet>
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { springFirm, fade, fadeQuick, fadeScale } from '@/lib/motion';
import styles from './Sheet.module.css';

/**
 * Sheet sizes (desktop only; on phone every Sheet is full-width
 * bottom drawer regardless of size).
 *   sm — 420px, light dialogs (confirmations, simple pickers)
 *   md — 560px, default
 *   lg — 760px, content-rich detail views (mod detail, item popup)
 */
export type SheetSize = 'sm' | 'md' | 'lg';

interface SheetProps {
  open:    boolean;
  onClose: () => void;
  /** Optional title rendered in the sheet header next to the close button. */
  title?:   ReactNode;
  /** Body content. Scrolls inside the sheet if it overflows. */
  children: ReactNode;
  /**
   * Optional footer (CTAs etc.) anchored to the sheet bottom — sits
   * outside the scrollable body region.
   */
  footer?:  ReactNode;
  /** ARIA label when no visible title is provided. */
  ariaLabel?: string;
  /** Desktop panel width preset. Default 'md'. */
  size?: SheetSize;
}

export function Sheet({ open, onClose, title, children, footer, ariaLabel, size = 'md' }: SheetProps) {
  const panelRef    = useRef<HTMLDivElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Capture the element that had focus before open, and restore it on close.
  useEffect(() => {
    if (open) {
      lastFocused.current = (document.activeElement as HTMLElement) ?? null;
      // Defer focus until after motion mounts the panel.
      requestAnimationFrame(() => panelRef.current?.focus());
    } else if (lastFocused.current) {
      lastFocused.current.focus();
      lastFocused.current = null;
    }
  }, [open]);

  // Lock background scroll while open. Preserves the previous overflow
  // value so opening a sheet doesn't permanently strip body styles if
  // the consumer was already managing overflow themselves.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close. Capture phase so the sheet beats page-level handlers.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.scrim}
            variants={fade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fadeQuick}
            onClick={onClose}
            aria-hidden
          />
          {/* Desktop: centered + scale-in. Mobile: bottom + slide-up.
              Both variants share the panel element; layout-side CSS
              picks the right anchor via @media (max-width: 540px). */}
          {/* Centering layer — non-animated, flex-centered. The motion
              panel inside is free to drive its own transform without
              fighting the centering offset. */}
          <div className={styles.center}>
          <motion.div
            ref={panelRef}
            className={styles.panel}
            data-size={size}
            variants={fadeScale}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springFirm}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? (typeof title === 'string' ? title : 'Dialog')}
          >
            <span className={styles.handle} aria-hidden />

            <header className={styles.header}>
              <div className={styles.title}>{title}</div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </header>

            <div className={styles.body}>
              {children}
            </div>

            {footer && (
              <footer className={styles.footer}>{footer}</footer>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
