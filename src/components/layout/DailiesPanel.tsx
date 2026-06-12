/**
 * DailiesPanel — app-wide Dailies & Weeklies tracker popover.
 *
 * Anchored under the header's "Dailies" quick button (see Header.tsx).
 * Opens on ANY page — it's the persistent tracker, not a tab. Tick items
 * off here; live-data / persistence wiring is out of scope for now.
 *
 * Structure mirrors the wireframe prototype's `DailiesPanel`
 * (src/features/celestial-pendulum/wireframe/CelestialWireframe.tsx) but
 * is styled to the real Mutalist Glow design system.
 */

import { useEffect, useRef, useState } from 'react';
import { X, Check, Clock } from 'lucide-react';
import styles from './DailiesPanel.module.css';

interface TrackerItem {
  /** Stable key + visible label. */
  t: string;
  /** Small right-aligned meta. */
  meta: string;
}

const DAILY: TrackerItem[] = [
  { t: 'Sortie', meta: '3 missions' },
  { t: 'Archon Hunt (this week)', meta: 'shard' },
  { t: 'Syndicate dailies ×6', meta: 'standing cap' },
  { t: 'Nightwave dailies', meta: '3 acts' },
  { t: 'Teshin / Steel Path', meta: 'Steel Essence' },
];

const WEEKLY: TrackerItem[] = [
  { t: 'Nightwave weeklies', meta: '7 acts' },
  { t: 'Netracell ×5', meta: 'arcanes' },
  { t: 'Deep/Temporal Archimedea', meta: 'research' },
  { t: "Kahl's Garrison", meta: 'Stock' },
  { t: 'Circuit · Duviri', meta: 'Incarnon' },
];

const TOTAL = DAILY.length + WEEKLY.length;

export function DailiesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [done, setDone] = useState<Set<string>>(
    () => new Set(['Archon Hunt (this week)', "Kahl's Garrison"]),
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = (t: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Outside-click closes. Guard against the panel itself and the trigger
  // button (the button toggles open/closed on its own click).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      const trigger = (target as Element | null)?.closest?.('[data-dailies-trigger]');
      if (trigger) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      role="dialog"
      aria-label="Dailies & Weeklies"
    >
      <div className={styles.head}>
        <h2 className={styles.title}>Dailies &amp; Weeklies</h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <p className={styles.subtitle}>
        Your app-wide tracker — open it from the header on any page and tick
        things off as you go.
      </p>

      <div className={styles.resets}>
        <span className={styles.resetChip}>
          <Clock size={11} strokeWidth={1.75} aria-hidden />
          Daily reset 6h 12m
        </span>
        <span className={styles.resetChip}>
          <Clock size={11} strokeWidth={1.75} aria-hidden />
          Weekly reset 2d 6h
        </span>
        <span className={styles.counter}>
          {done.size} / {TOTAL} done
        </span>
      </div>

      <div className={styles.cols}>
        <TrackerColumn label="Daily" items={DAILY} done={done} onToggle={toggle} />
        <TrackerColumn label="Weekly" items={WEEKLY} done={done} onToggle={toggle} />
      </div>
    </div>
  );
}

function TrackerColumn({
  label,
  items,
  done,
  onToggle,
}: {
  label: string;
  items: TrackerItem[];
  done: Set<string>;
  onToggle: (t: string) => void;
}) {
  return (
    <div className={styles.col}>
      <div className={`typo-section-label ${styles.colHead}`}>{label}</div>
      <ul className={styles.list}>
        {items.map((item) => {
          const checked = done.has(item.t);
          return (
            <li key={item.t}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={styles.row}
                data-done={checked || undefined}
                onClick={() => onToggle(item.t)}
              >
                <span className={styles.check} aria-hidden>
                  {checked ? <Check size={11} strokeWidth={2.5} /> : null}
                </span>
                <span className={styles.rowLabel}>{item.t}</span>
                <span className={styles.rowMeta}>{item.meta}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
