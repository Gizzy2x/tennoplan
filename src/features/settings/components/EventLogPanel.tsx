/**
 * EventLogPanel — visible debug surface for the central logger.
 *
 * Reads `db.eventLog` reactively (useLiveQuery) so new events appear without
 * a manual refresh. Filters by level + category. Click a row to expand the
 * details JSON. "Copy" puts the visible (filtered) entries on the clipboard
 * as JSON; "Export" downloads them as a file. "Clear" wipes db.eventLog.
 */

import { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { clearEventLog } from '@/adapters/logging/logger';
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
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function relativeAge(ts: number): string {
  const ms = Date.now() - ts;
  const s  = Math.floor(ms / 1000);
  if (s < 60)        return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)        return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)        return `${h}h ago`;
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

// ─── Row ──────────────────────────────────────────────────────────────────────

function EventRow({ entry }: { entry: EventLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!entry.details;
  const levelClass = styles[`event-pip--${entry.level}`];
  const catClass = styles[`event-cat--${entry.category}`];

  return (
    <div
      className={clsx(
        styles['event-row'],
        levelClass,
        open && styles['event-row--open'],
        hasDetails && styles['event-row--clickable']
      )}
      onClick={() => hasDetails && setOpen((o) => !o)}
      role={hasDetails ? 'button' : undefined}
      tabIndex={hasDetails ? 0 : -1}
    >
      <span className={clsx(styles['event-pip'], levelClass)} aria-hidden="true" />
      <span className={styles['event-time']} title={new Date(entry.timestamp).toLocaleString()}>
        {formatTime(entry.timestamp)}
      </span>
      <span className={clsx(styles['event-cat'], catClass)}>{entry.category}</span>
      <span className={styles['event-msg']}>{entry.message}</span>
      {entry.source && <span className={styles['event-source']}>{entry.source}</span>}
      {open && entry.details && (
        <pre className={styles['event-details']}>{entry.details}</pre>
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
      className={clsx(styles['event-chip'], active && styles['event-chip--active'])}
      onClick={onClick}
    >
      <span className="typo-label-xs">{children}</span>
      {count !== undefined && count > 0 && (
        <span className={styles['event-chip-count']}>{count}</span>
      )}
    </button>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EventLogPanel() {
  const [levelFilter, setLevelFilter]       = useState<EventLevel    | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');

  // Live recent-first query — auto-rerenders when new events are written.
  // We oversample (300) and apply filters in memory; far simpler than swapping
  // queries based on the active filter combination.
  const events = useLiveQuery(
    () => db.eventLog.orderBy('timestamp').reverse().limit(300).toArray(),
    [],
    [] as EventLogEntry[],
  );

  // Per-level counts for chip badges
  const levelCounts = useMemo(() => {
    const c = { error: 0, warn: 0, info: 0 } as Record<EventLevel, number>;
    for (const e of events) c[e.level]++;
    return c;
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) =>
      (levelFilter    === 'all' || e.level    === levelFilter) &&
      (categoryFilter === 'all' || e.category === categoryFilter),
    );
  }, [events, levelFilter, categoryFilter]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(filtered, null, 2));
    } catch {
      // Clipboard may be unavailable in some Tauri configurations
    }
  }, [filtered]);

  const handleExport = useCallback(() => {
    downloadAsJson(filtered);
  }, [filtered]);

  const handleClear = useCallback(() => {
    void clearEventLog();
  }, []);

  // Most recent stale-items-map warning, surfaced as a banner
  const staleWarning = useMemo(
    () => events.find(
      (e) => e.category === 'icons'
          && e.level    === 'warn'
          && e.message.startsWith('Items-map likely stale'),
    ),
    [events],
  );

  return (
    <div className={clsx(styles['settings-panel'], styles['settings-panel--full'])}>
      <div className={styles['settings-panel-header']}>
        <span className={clsx(styles['settings-panel-title'], 'typo-label-xs')}>EVENT LOG</span>
        <span className={clsx(styles['settings-panel-badge'], 'typo-label-xs')}>
          {events.length} EVENT{events.length === 1 ? '' : 'S'}
        </span>
      </div>

      {staleWarning && (
        <div className={clsx(styles['event-banner'])}>
          <strong>Items-map likely stale.</strong>{' '}
          {staleWarning.message}. Run{' '}
          <code>npm install @wfcd/items@latest && npm run generate-items</code>{' '}
          to refresh.
        </div>
      )}

      {/* Level filters */}
      <div className={styles['event-filter-row']}>
        <Chip active={levelFilter === 'all'}   onClick={() => setLevelFilter('all')}>All</Chip>
        {ALL_LEVELS.map((lvl) => (
          <Chip
            key={lvl}
            active={levelFilter === lvl}
            onClick={() => setLevelFilter(lvl)}
            count={levelCounts[lvl]}
          >
            {lvl.toUpperCase()}
          </Chip>
        ))}
      </div>

      {/* Category filters */}
      <div className={clsx(styles['event-filter-row'], styles['event-filter-row--cats'])}>
        <Chip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
          all
        </Chip>
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
      <div className={styles['event-list']}>
        {filtered.length === 0 ? (
          <p className={clsx(styles['event-empty'], 'typo-label-xs')}>
            {events.length === 0
              ? 'No events recorded yet. The log fills up as the app runs.'
              : 'No events match the current filter.'}
          </p>
        ) : (
          filtered.map((e) => <EventRow key={e.id} entry={e} />)
        )}
      </div>

      {filtered.length > 0 && (
        <div className={clsx(styles['event-footer'], 'typo-label-xs')}>
          Showing {filtered.length} of {events.length} entries
          {filtered[0] && ` · newest ${relativeAge(filtered[0].timestamp)}`}
        </div>
      )}

      <div className={styles['icon-sync-actions']}>
        <button className={clsx(styles['settings-btn'], styles['settings-btn--ghost'])} onClick={() => void handleCopy()}>
          <span className={styles['settings-btn-icon']}>⎘</span>
          <span className="typo-label-xs">Copy filtered</span>
        </button>
        <button className={clsx(styles['settings-btn'], styles['settings-btn--ghost'])} onClick={handleExport}>
          <span className={styles['settings-btn-icon']}>⇣</span>
          <span className="typo-label-xs">Export JSON</span>
        </button>
        <button className={clsx(styles['settings-btn'], styles['settings-btn--ghost'])} onClick={handleClear}>
          <span className={styles['settings-btn-icon']}>✕</span>
          <span className="typo-label-xs">Clear log</span>
        </button>
      </div>
    </div>
  );
}
