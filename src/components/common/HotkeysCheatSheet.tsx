/**
 * HotkeysCheatSheet — floating panel listing every registered hotkey.
 *
 * Press ? to toggle. Subscribes to the hotkeys registry so the list
 * stays live as components mount/unmount. Grouped by scope, with the
 * active scope listed first.
 *
 * The cheat sheet registers its OWN hotkey (`?` to toggle, Escape to
 * close), and skips fields so the user can still type ? in a search
 * input without the panel popping open.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import {
  listHotkeys,
  subscribeHotkeys,
  useHotkeys,
  getHotkeyScope,
  type HotkeyDef,
} from '@/hooks/useHotkeys';
import { springFirm, fade, fadeQuick, fadeScale } from '@/lib/motion';
import styles from './HotkeysCheatSheet.module.css';

function useHotkeySnapshot(): HotkeyDef[] {
  return useSyncExternalStore(
    subscribeHotkeys,
    listHotkeys,
    listHotkeys,
  );
}

function formatCombo(combo: string): string[] {
  // Splits "ctrl+k" → ["Ctrl", "K"]; single keys map to one chip.
  // Capitalizes single letters; renames "escape" → "Esc".
  return combo.split('+').map((p) => {
    const t = p.trim();
    if (t.length === 0) return t;
    if (t.toLowerCase() === 'escape') return 'Esc';
    if (t.toLowerCase() === 'arrowleft')  return '←';
    if (t.toLowerCase() === 'arrowright') return '→';
    if (t.toLowerCase() === 'arrowup')    return '↑';
    if (t.toLowerCase() === 'arrowdown')  return '↓';
    if (t.length === 1) return t.toUpperCase();
    return t[0].toUpperCase() + t.slice(1);
  });
}

export function HotkeysCheatSheet() {
  const [open, setOpen] = useState(false);
  const hotkeys         = useHotkeySnapshot();
  const currentScope    = getHotkeyScope();

  useHotkeys([
    {
      combo:       '?',
      description: 'Show keyboard shortcuts',
      handler:     (e) => { e.preventDefault(); setOpen((v) => !v); },
    },
  ]);

  // Close on Escape from anywhere (panel-scoped).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  // Group by scope; active scope first, then 'global', then everything else.
  const grouped = new Map<string, HotkeyDef[]>();
  for (const h of hotkeys) {
    const k = h.scope ?? 'global';
    const list = grouped.get(k);
    if (list) list.push(h);
    else grouped.set(k, [h]);
  }
  const scopes = [...grouped.keys()].sort((a, b) => {
    if (a === currentScope) return -1;
    if (b === currentScope) return 1;
    if (a === 'global') return -1;
    if (b === 'global') return 1;
    return a.localeCompare(b);
  });

  return (
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
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* Centering layer — non-animated, flex-centered. Keeps
              the panel's motion transform free of centering offsets. */}
          <div className={styles.center}>
          <motion.div
            className={styles.panel}
            variants={fadeScale}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springFirm}
            role="dialog"
            aria-label="Keyboard shortcuts"
          >
            <header className={styles.header}>
              <h2 className={styles.title}>Keyboard Shortcuts</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </header>

            <div className={styles.body}>
              {scopes.length === 0 && (
                <p className={styles.empty}>No shortcuts registered yet.</p>
              )}
              {scopes.map((scope) => (
                <section key={scope} className={styles.group}>
                  <h3 className={styles.groupTitle}>
                    {scope === 'global' ? 'Global' : scope}
                  </h3>
                  <dl className={styles.list}>
                    {grouped.get(scope)!.map((h) => (
                      <div key={`${scope}:${h.combo}`} className={styles.row}>
                        <dt className={styles.combo}>
                          {formatCombo(h.combo).map((chip, i) => (
                            <kbd key={i} className={styles.kbd}>{chip}</kbd>
                          ))}
                        </dt>
                        <dd className={styles.desc}>{h.description}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>

            <footer className={styles.footer}>
              <kbd className={styles.kbd}>?</kbd>
              <span>toggles this panel · </span>
              <kbd className={styles.kbd}>Esc</kbd>
              <span>closes</span>
            </footer>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
