// ---------------------------------------------------------------------------
// WorldstateService — pure functions, zero imports from React / Dexie / fetch
// ---------------------------------------------------------------------------

/**
 * Returns the age of a cache entry in milliseconds.
 * `now` defaults to Date.now() — pass an explicit value in tight render loops
 * to avoid redundant calls.
 */
export function getCacheAgeMs(cachedAt: number, now = Date.now()): number {
  return Math.max(0, now - cachedAt);
}

/**
 * Human-readable age string for the offline banner.
 * Examples: "just now" | "4m ago" | "2h ago" | "1d ago"
 */
export function formatCacheAge(ms: number): string {
  if (ms < 60_000)         return 'just now';
  if (ms < 3_600_000)      return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000)     return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

/**
 * Returns true when the Nightwave payload has at least one active challenge.
 * Used to distinguish "Nightwave active" from "between seasons / no data yet".
 */
export function isNightwaveActive(data: { challenges: unknown[] }): boolean {
  return data.challenges.length > 0;
}
