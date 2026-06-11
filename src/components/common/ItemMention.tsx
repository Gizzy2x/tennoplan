/**
 * ItemMention — inline codex reference, styled as a wiki link.
 *
 * Use anywhere a piece of text mentions an item by name: mechanic notes,
 * synergy tags, guide content, bounty reward lists, ability descriptions.
 *
 * Interaction contract (mirrors PressTip's delay pattern):
 *   • Hover 280ms  → opens the global CodexQuickLook sheet (quick preview).
 *   • Click        → navigates directly to the full codex entry (closes sheet).
 *   • Touch tap    → opens CodexQuickLook (same as ItemIcon taps elsewhere).
 *   • Keyboard ↵/␣ → same as click.
 *
 * Color:
 *   • jade  (--color-accent-jade)  — default; standard rarity items.
 *   • gold  (--color-accent-gold)  — for Rare / Legendary items.
 *
 * An optional small icon can be shown inline when iconUrl is supplied —
 * useful for synergy tag chips, not for inline prose (leave showIcon out).
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuickLook } from '@/store/quickLook';
import { useNavigationStore } from '@/store/navigation';
import styles from './ItemMention.module.css';

const HOVER_DELAY_MS = 280;

interface ItemMentionProps {
  uniqueName:  string;
  /** Display name — required; shown even when the Dexie lookup hasn't resolved yet. */
  name:        string;
  /**
   * Controls the accent color.
   * Pass 'gold' for Rare / Legendary items; omit or pass 'jade' for everything else.
   */
  accent?:     'jade' | 'gold';
  /** Show a small 14×14 icon inline before the name. */
  showIcon?:   boolean;
  /** Icon URL to show when showIcon is true. */
  iconUrl?:    string;
  className?:  string;
}

export function ItemMention({
  uniqueName,
  name,
  accent = 'jade',
  showIcon = false,
  iconUrl,
  className,
}: ItemMentionProps) {
  const quickLookOpen  = useQuickLook((s) => s.open);
  const quickLookClose = useQuickLook((s) => s.close);
  const openCodexEntry = useNavigationStore((s) => s.openCodexEntry);

  const hoverTimer = useRef<number | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current != null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  // Clean up on unmount.
  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const handlePointerEnter = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(
      () => quickLookOpen(uniqueName, name),
      HOVER_DELAY_MS,
    );
  }, [uniqueName, name, quickLookOpen, clearHoverTimer]);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearHoverTimer();
    // Do not close the sheet — the user may have moved into it.
  }, [clearHoverTimer]);

  const handleClick = useCallback(() => {
    clearHoverTimer();
    quickLookClose();
    openCodexEntry(uniqueName, name);
  }, [uniqueName, name, quickLookClose, openCodexEntry, clearHoverTimer]);

  // Touch: tap once → open QuickLook (same as any other item tile).
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    quickLookOpen(uniqueName, name);
  }, [uniqueName, name, quickLookOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clearHoverTimer();
      quickLookClose();
      openCodexEntry(uniqueName, name);
    }
  }, [uniqueName, name, quickLookClose, openCodexEntry, clearHoverTimer]);

  return (
    <span
      role="button"
      tabIndex={0}
      className={[styles.mention, styles[accent], className].filter(Boolean).join(' ')}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open ${name} in Codex`}
    >
      {showIcon && iconUrl && (
        <img
          src={iconUrl}
          alt=""
          className={styles.icon}
          width={14}
          height={14}
          aria-hidden="true"
          draggable={false}
        />
      )}
      {name}
    </span>
  );
}
