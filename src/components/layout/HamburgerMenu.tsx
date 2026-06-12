/**
 * HamburgerMenu — left-side slide-in nav dropdown.
 *
 * At narrow widths the header's toggle reveals a full-height panel
 * listing every nav destination. Spring physics with bounce: 0
 * (smooth deceleration, no tacky bounce).
 *
 * Active tab gets a thick left-tab accent (`border-left: 4px`)
 * instead of the desktop bar's thin underline — different chrome
 * per orientation, same data.
 *
 * Closes automatically on:
 *   • outside click          (mousedown listener)
 *   • Escape key             (keydown listener)
 *   • route change           (effect on activeTab)
 *   • any nav-link click     (onSelect)
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings } from 'lucide-react';
import { NAV_ITEMS, useNavigationStore } from '@/store/navigation';
import { useClickOutside } from '@/hooks/useClickOutside';
import { springFirm, fade, fadeQuick, slideFromLeft } from '@/lib/motion';
import styles from './HamburgerMenu.module.css';

const PANEL_WIDTH = 260;
const slideVariants = slideFromLeft(PANEL_WIDTH);

interface HamburgerMenuProps {
  open:    boolean;
  onClose: () => void;
}

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const activeTab    = useNavigationStore((s) => s.activeTab);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);
  const panelRef     = useRef<HTMLDivElement | null>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Close on outside click via the shared hook (touch-friendly,
  // capture-phase, can hold multiple refs if we ever need to
  // exempt a toggle that lives outside the panel).
  useClickOutside(panelRef, onClose, { enabled: open });

  // Close when the active tab actually changes (e.g. user clicked a
  // nav link or used a keyboard shortcut). The handler below also
  // closes proactively on link click, but this catches every path.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const select = (id: typeof activeTab) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim — quiet, just enough to anchor the panel against the
              page beneath. Click-anywhere-on-scrim closes the panel. */}
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

          {/* Panel — spring slide from the left. Shared motion vocab
              (springFirm + slideFromLeft) so every drawer in the app
              moves with the same rhythm. */}
          <motion.aside
            ref={panelRef}
            className={styles.panel}
            style={{ width: PANEL_WIDTH }}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springFirm}
            role="dialog"
            aria-label="Navigation"
          >
            <nav className={styles.nav}>
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.link}
                    data-active={isActive}
                    onClick={() => select(item.id)}
                  >
                    <Icon size={16} strokeWidth={1.5} className={styles.linkIcon} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <hr className={styles.divider} />

            <nav className={styles.nav}>
              <button
                type="button"
                className={styles.link}
                data-active={activeTab === 'settings'}
                onClick={() => select('settings')}
              >
                <Settings size={16} strokeWidth={1.5} className={styles.linkIcon} />
                <span>Settings</span>
              </button>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
