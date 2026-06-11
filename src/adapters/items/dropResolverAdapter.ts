/**
 * dropResolverAdapter — builds the codex-backed DropResolver + icon index from
 * Dexie.
 *
 * The resolver needs a name → uniqueName index over the WHOLE codex
 * (db.tennoplanItems, ~9k rows, including the synthetic currency entries). We
 * also build a uniqueName → iconUrl map in the same pass, because the codex
 * carries icons for items that `items-map.json` does NOT (warframe/weapon
 * component parts like "Gara Chassis", and the synthetic currencies). `ItemIcon`
 * consults that map so those entries show their real icon instead of a
 * placeholder.
 *
 * Both are cached and only rebuilt when the codex row count changes (i.e. after
 * a codex re-sync). `getDropResolver()` reads `db.tennoplanItems.count()` first
 * — a cheap indexed op. Called inside a Dexie `useLiveQuery`, that read also
 * makes the query reactive to codex syncs.
 */

import { db } from '@/adapters/storage/db';
import { buildDropResolver, type DropResolver } from '@/core/services/dropResolver';

interface CodexIndex {
  count:    number;
  resolver: DropResolver;
  icons:    Map<string, string>;   // uniqueName → iconUrl
}

let cache: CodexIndex | null = null;

const EMPTY: DropResolver = { resolve: () => null };

async function build(): Promise<CodexIndex> {
  const count = await db.tennoplanItems.count();
  if (count === 0) return { count: 0, resolver: EMPTY, icons: new Map() };
  if (cache && cache.count === count) return cache;

  const rows = await db.tennoplanItems.toArray();
  const resolver = buildDropResolver(
    rows.map((r) => ({ name: r.name, uniqueName: r.uniqueName })),
  );
  const icons = new Map<string, string>();
  for (const r of rows) if (r.iconUrl) icons.set(r.uniqueName, r.iconUrl);

  cache = { count, resolver, icons };
  return cache;
}

export async function getDropResolver(): Promise<DropResolver> {
  return (await build()).resolver;
}

/** Warm the cache so the sync `getCodexIconUrl` has data app-wide. */
export async function primeCodexIndex(): Promise<void> {
  await build();
}

/**
 * Sync read of a codex item's icon URL from the cached index. Returns undefined
 * until the index has been built at least once (callers fall back to items-map /
 * placeholder). Bounty tiles are safe: their `useLiveQuery` awaits `build()`
 * before rendering, so the cache is populated by the time they paint.
 */
export function getCodexIconUrl(uniqueName: string): string | undefined {
  return cache?.icons.get(uniqueName);
}

/** Test/maintenance hook — drop the cached index. */
export function clearDropResolverCache(): void {
  cache = null;
}
