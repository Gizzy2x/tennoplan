/**
 * EventLogPanel — visible debug surface for the central logger.
 *
 * Reads `db.eventLog` reactively (useLiveQuery) so new events appear
 * without a manual refresh. Filters by level + category. Clicking a row
 * with details toggles a JSON payload reveal. "Copy" places the filtered
 * entries on the clipboard as JSON; "Export" downloads them as a file;
 * "Clear" wipes db.eventLog.
 *
 * Styling: Panel chrome from the canonical primitives; event-specific
 * UI (rows, chips, banner) lives in SettingsPage.module.css.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { clearEventLog } from '@/adapters/logging/logger';
import { Panel, PanelHeader, PanelLabel, PanelBody } from '@/components/ui/Panel';
import {
  ALL_CATEGORIES,
  ALL_LEVELS,
  type EventCategory,
  type EventLevel,
  type EventLogEntry,
} from '@/core/domain/eventLog';
import styles from '../SettingsPage.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d   = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function relativeAge(ts: number): string {
  const ms = Date.now() - ts;
  const s  = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function downloadAsJson(events: EventLogEntry[]): void {
  const json = JSON.stringify(events, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tennoplan-eventlog-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PIP_FOR_LEVEL: Record<EventLevel, string> = {
  error: styles.eventPipError,
  warn:  styles.eventPipWarn,
  info:  styles.eventPipInfo,
};

const CAT_CLASS: Record<EventCategory, string> = {
  network:    styles.eventCatNetwork,
  icons:      styles.eventCatIcons,
  worldstate: styles.eventCatWorldstate,
  codex:      styles.eventCatCodex,
  parse:      styles.eventCatParse,
  storage:    styles.eventCatStorage,
  ui:         styles.eventCatUi,
  system:     styles.eventCatSystem,
};

// ─── Row ──────────────────────────────────────────────────────────────────────

function EventRow({ entry }: { entry: EventLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!entry.details;

  const toggle = () => hasDetails && setOpen((o) => !o);

  return (
    <div
      className={clsx(
        styles.eventRow,
        open       && styles.eventRowOpen,
        hasDetails && styles.eventRowClickable,
      )}
      onClick={toggle}
      onKeyDown={(e) => {
        if (!hasDetails) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      role={hasDetails ? 'button' : undefined}
      tabIndex={hasDetails ? 0 : -1}
      aria-expanded={hasDetails ? open : undefined}
    >
      <span className={clsx(styles.eventPip, PIP_FOR_LEVEL[entry.level])} aria-hidden="true" />
      <span className={styles.eventTime} title={new Date(entry.timestamp).toLocaleString()}>
        {formatTime(entry.timestamp)}
      </span>
      <span className={clsx(styles.eventCat, CAT_CLASS[entry.category])}>
        {entry.category}
      </span>
      <span className={styles.eventMsg}>{entry.message}</span>
      {entry.source && <span className={styles.eventSource}>{entry.source}</span>}
      {open && entry.details && (
        <pre className={styles.eventDetails}>{entry.details}</pre>
      )}
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function Chip({
  active, onClick, children, count,
}: {
  active:   boolean;
  onClick:  () => void;
  children: React.ReactNode;
  count?:   number;
}) {
  return (
    <button
      type="button"
      className={clsx(styles.chip, active && styles.chipActive)}
      onClick={onClick}
      aria-pressed={active}
    >
      <span>{children}</span>
      {count !== undefined && count > 0 && (
        <span className={styles.chipCount}>{count}</span>
      )}
    </button>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EventLogPanel() {
  const [levelFilter,    setLevelFilter]    = useState<EventLevel    | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');

  const events = useLiveQuery(
    () => db.eventLog.orderBy('timestamp').reverse().limit(300).toArray(),
    [],
    [] as EventLogEntry[],
  );

  const levelCounts = useMemo(() => {
    const c = { error: 0, warn: 0, info: 0 } as Record<EventLevel, number>;
    for (const e of events) c[e.level]++;
    return c;
  }, [events]);

  const filtered = useMemo(() => events.filter((e) =>
    (levelFilter    === 'all' || e.level    === levelFilter) &&
    (categoryFilter === 'all' || e.category === categoryFilter),
  ), [events, levelFilter, categoryFilter]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(filtered, null, 2));
    } catch {
      // Clipboard may be unavailable in some Tauri configurations
    }
  }, [filtered]);

  const handleExport = useCallback(() => { downloadAsJson(filtered); }, [filtered]);
  const handleClear  = useCallback(() => { void clearEventLog(); }, []);

  const staleWarning = useMemo(
    () => events.find(
      (e) => e.category === 'icons'
          && e.level    === 'warn'
          && e.message.startsWith('Items-map likely stale'),
    ),
    [events],
  );

  // Pulse the count badge briefly when new events arrive. We retrigger
  // the animation by toggling a key, which remounts the badge span.
  const prevCountRef = useRef(events.length);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (events.length > prevCountRef.current) {
      setPulseKey((k) => k + 1);
    }
    prevCountRef.current = events.length;
  }, [events.length]);

  return (
    <Panel>
      <PanelHeader>
        <PanelLabel>Event Log</PanelLabel>
        <span
          key={pulseKey}
          className={clsx(styles.headerBadge, pulseKey > 0 && styles.headerBadgePulse)}
        >
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </PanelHeader>
      <PanelBody>
        {staleWarning && (
          <div className={styles.eventBanner}>
            <strong>Items-map likely stale.</strong>{' '}
            {staleWarning.message}. Run{' '}
            <code>npm install @wfcd/items@latest && npm run generate-items</code>{' '}
            to refresh.
          </div>
        )}

        {/* Level filters */}
        <div className={styles.chipRow}>
          <Chip active={levelFilter === 'all'} onClick={() => setLevelFilter('all')}>All</Chip>
          {ALL_LEVELS.map((lvl) => (
            <Chip
              key={lvl}
              active={levelFilter === lvl}
              onClick={() => setLevelFilter(lvl)}
              count={levelCounts[lvl]}
            >
              {lvl}
            </Chip>
          ))}
        </div>

        {/* Category filters */}
        <div className={styles.chipRow}>
          <Chip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>All</Chip>
          {ALL_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Chip>
          ))}
        </div>

        {/* Event list */}
        <div className={styles.eventList}>
          {filtered.length === 0 ? (
            <p className={styles.eventEmpty}>
              {events.length === 0
                ? 'No events yet — the log fills up as the app runs.'
                : 'No events match these filters. Try clearing one.'}
            </p>
          ) : (
            filtered.map((e) => <EventRow key={e.id} entry={e} />)
          )}
        </div>

        {filtered.length > 0 && (
          <div className={styles.eventFooter}>
            Showing {filtered.length} of {events.length} event{events.length === 1 ? '' : 's'}
            {filtered[0] && ` · newest ${relativeAge(filtered[0].timestamp)}`}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={clsx(styles.btn, styles.btnGhost)} onClick={() => void handleCopy()}>
            <span className={styles.btnIcon}>⎘</span>
            <span>Copy filtered</span>
          </button>
          <button type="button" className={clsx(styles.btn, styles.btnGhost)} onClick={handleExport}>
            <span className={styles.btnIcon}>⇣</span>
            <span>Export JSON</span>
          </button>
          <button type="button" className={clsx(styles.btn, styles.btnGhost)} onClick={handleClear}>
            <span className={styles.btnIcon}>✕</span>
            <span>Clear log</span>
          </button>
        </div>
      </PanelBody>
    </Panel>
  );
}
