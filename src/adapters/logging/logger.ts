/**
 * Tennoplan event logger — central, persistent, categorized.
 *
 * Single source of truth for "something noteworthy happened anywhere in the app."
 * Every cross-cutting failure, sync attempt, render crash, or notable lifecycle
 * event flows through this. The Settings → Event Log panel reads from db.eventLog.
 *
 * Design rules:
 *  - Fire-and-forget: logger calls never block the caller, never throw.
 *  - Bounded: rolling buffer of MAX_LOG_ENTRIES; oldest pruned async.
 *  - Mirrored to console: easy to follow during dev too.
 *  - Detail payloads are JSON-stringified — readable in the UI, copy/exportable.
 *
 * Usage:
 *   logger.error('icons',     'HTTP 404 fetching icon', { url, status }, 'iconBlobCache');
 *   logger.warn ('worldstate','Falling back to cached snapshot', { ageMs });
 *   logger.info ('system',    'Icon sync complete', { cached: 13780, failed: 1 });
 */

import { db } from '@/adapters/storage/db';
import type {
  EventCategory,
  EventLevel,
  EventLogEntry,
} from '@/core/domain/eventLog';

// ─── Buffer config ───────────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 500;
/** Only run the prune query when count exceeds this — avoids constant queries. */
const PRUNE_THRESHOLD = 600;
/** Wait this long after a write before pruning (debounce). */
const PRUNE_DEBOUNCE_MS = 5000;

// ─── Pruning ─────────────────────────────────────────────────────────────────

let _pruneScheduled = false;

function schedulePrune(): void {
  if (_pruneScheduled) return;
  _pruneScheduled = true;
  setTimeout(() => { void prune(); }, PRUNE_DEBOUNCE_MS);
}

async function prune(): Promise<void> {
  try {
    const count = await db.eventLog.count();
    if (count > PRUNE_THRESHOLD) {
      const overflow   = count - MAX_LOG_ENTRIES;
      const oldestIds  = await db.eventLog.orderBy('timestamp').limit(overflow).primaryKeys();
      await db.eventLog.bulkDelete(oldestIds as number[]);
    }
  } catch {
    // Pruning is best-effort — never let it crash the app
  } finally {
    _pruneScheduled = false;
  }
}

// ─── Core write ──────────────────────────────────────────────────────────────

function safeStringify(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  try {
    if (v instanceof Error) {
      return JSON.stringify({
        name:    v.name,
        message: v.message,
        stack:   v.stack?.split('\n').slice(0, 8).join('\n'),
      });
    }
    return JSON.stringify(v, (_k, val) => {
      if (val instanceof Error) {
        return { name: val.name, message: val.message };
      }
      return val;
    });
  } catch {
    return String(v);
  }
}

async function write(
  category: EventCategory,
  level:    EventLevel,
  message:  string,
  details?: unknown,
  source?:  string,
): Promise<void> {
  try {
    const entry: EventLogEntry = {
      timestamp: Date.now(),
      category,
      level,
      message,
      details: safeStringify(details),
      source,
    };
    await db.eventLog.add(entry);
    schedulePrune();
  } catch {
    // Logging must never crash. If Dexie is unavailable, we still
    // get the console mirror below.
  }
}

// ─── Console mirror ───────────────────────────────────────────────────────────

function mirrorToConsole(
  level:    EventLevel,
  category: EventCategory,
  message:  string,
  details?: unknown,
): void {
  const prefix = `[${category}]`;
  const fn = level === 'error' ? console.error
           : level === 'warn'  ? console.warn
           :                     console.info;
  if (details !== undefined) {
    fn(prefix, message, details);
  } else {
    fn(prefix, message);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  error(category: EventCategory, message: string, details?: unknown, source?: string): void {
    void write(category, 'error', message, details, source);
    mirrorToConsole('error', category, message, details);
  },
  warn(category: EventCategory, message: string, details?: unknown, source?: string): void {
    void write(category, 'warn', message, details, source);
    mirrorToConsole('warn', category, message, details);
  },
  info(category: EventCategory, message: string, details?: unknown, source?: string): void {
    void write(category, 'info', message, details, source);
    mirrorToConsole('info', category, message, details);
  },
};

// ─── Read API ────────────────────────────────────────────────────────────────

export interface EventLogFilters {
  category?: EventCategory;
  level?:    EventLevel;
  /** Max number of entries to return (default 200). */
  limit?:    number;
}

/** Recent-first list for the Settings panel. */
export async function getRecentEvents(filters: EventLogFilters = {}): Promise<EventLogEntry[]> {
  const limit = filters.limit ?? 200;
  try {
    const all = await db.eventLog.orderBy('timestamp').reverse().limit(limit * 2).toArray();
    return all
      .filter((e) =>
        (!filters.category || e.category === filters.category) &&
        (!filters.level    || e.level    === filters.level),
      )
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function clearEventLog(): Promise<void> {
  try {
    await db.eventLog.clear();
  } catch {
    // If Dexie is wedged, clearing is impossible — silent is fine
  }
}

/** Count of entries — useful for the Settings panel header. */
export async function getEventCount(filters: EventLogFilters = {}): Promise<number> {
  try {
    if (filters.category && filters.level) {
      return await db.eventLog
        .where('[category+level]')
        .equals([filters.category, filters.level])
        .count();
    }
    if (filters.category) return await db.eventLog.where('category').equals(filters.category).count();
    if (filters.level)    return await db.eventLog.where('level').equals(filters.level).count();
    return await db.eventLog.count();
  } catch {
    return 0;
  }
}
