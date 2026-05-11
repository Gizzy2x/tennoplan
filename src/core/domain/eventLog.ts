/**
 * Event log domain types — pure, no Dexie/React imports.
 *
 * Every cross-cutting failure or noteworthy event in the app flows through
 * this shape. The Settings → Event Log panel reads from db.eventLog and
 * groups/filters by these fields.
 */

export type EventLevel = 'error' | 'warn' | 'info';

export type EventCategory =
  | 'network'      // HTTP failures, CORS, plugin load issues
  | 'icons'        // icon download failures, Cache API issues
  | 'worldstate'   // worldstate sync errors
  | 'codex'        // codex sync errors
  | 'parse'        // data parsing/validation errors
  | 'storage'      // Dexie / IndexedDB errors
  | 'ui'           // React render errors caught by ErrorBoundary
  | 'system';      // app lifecycle, config issues, version mismatches

export interface EventLogEntry {
  /** Auto-increment Dexie primary key. Set by Dexie on insert. */
  id?:        number;
  /** Unix ms when the event was created. */
  timestamp:  number;
  category:   EventCategory;
  level:      EventLevel;
  /** Short human-readable summary. One line. */
  message:    string;
  /** JSON-stringified context (URL, status, stack trace, payload). Optional. */
  details?:   string;
  /** Module that emitted the event (e.g. 'iconBlobCache'). Optional but helpful. */
  source?:    string;
}

export const ALL_CATEGORIES: EventCategory[] = [
  'network', 'icons', 'worldstate', 'codex', 'parse', 'storage', 'ui', 'system',
];

export const ALL_LEVELS: EventLevel[] = ['error', 'warn', 'info'];
