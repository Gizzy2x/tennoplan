/**
 * Toaster — mounted once in AppShell, renders the live toast queue.
 *
 * Stacks toasts in the bottom-right corner (top-right on phone if
 * the bottom-right would conflict with system gestures). Each toast
 * slides in from below with a spring; auto-dismisses after its
 * configured duration; user can dismiss early via the close button.
 *
 * Designed to be visually quiet — toasts are the LAST resort for
 * feedback. The richer-context inline affordances (status text near
 * the action, optimistic UI updates, etc.) carry the bulk of the
 * communication load.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useToastStore, type Toast as ToastModel } from '@/store/toasts';
import { springFirm, slideFromBottom } from '@/lib/motion';
import styles from './Toaster.module.css';

const enterFrom = slideFromBottom(24);

export function Toaster() {
  const toasts  = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return createPortal(
    <div className={styles.stack} aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

const VARIANT_ICON = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   AlertCircle,
} as const;

interface ToastItemProps {
  toast:     ToastModel;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = VARIANT_ICON[toast.variant];

  // Auto-dismiss timer. Pauses when the tab is hidden so the user
  // doesn't return to find every toast already gone.
  useEffect(() => {
    if (toast.durationMs <= 0) return;
    let remaining = toast.durationMs;
    let startedAt = Date.now();
    let timeoutId: number | null = null;

    const arm = () => {
      startedAt = Date.now();
      timeoutId = window.setTimeout(onDismiss, remaining);
    };
    const pause = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
        remaining -= Date.now() - startedAt;
      }
    };
    const onVisibility = () => {
      if (document.hidden) pause();
      else arm();
    };

    arm();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      pause();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [toast.durationMs, onDismiss]);

  return (
    <motion.div
      className={styles.toast}
      data-variant={toast.variant}
      variants={enterFrom}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={springFirm}
      role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
      layout
    >
      <span className={styles.icon} aria-hidden>
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X size={14} strokeWidth={2.25} />
      </button>
    </motion.div>
  );
}
