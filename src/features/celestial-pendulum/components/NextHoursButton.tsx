/**
 * NextHoursButton — click-to-open popover wrapper for the per-world "next hours"
 * cycle view. Per design direction, this must NOT sit inline eating space; it's a
 * tool you open from the world hero. The view itself (Next6Hours) is computed
 * only when the popover opens (it mounts on demand). Closes on outside-click/Esc.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { WorldCycle } from '@/core/domain/cycles';
import { Next6Hours } from './Next6Hours';
import styles from './NextHoursButton.module.css';

export function NextHoursButton({ cycle, accent }: { cycle: WorldCycle; accent: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Re-anchor on world change: close so it recomputes fresh next time.
  useEffect(() => { setOpen(false); }, [cycle.id]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        data-open={open || undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.triggerDot} aria-hidden="true" />
        Upcoming cycle
        <span className={styles.chev} aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.popover}
            role="dialog"
            aria-label="Upcoming cycle"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <Next6Hours cycle={cycle} accent={accent} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
