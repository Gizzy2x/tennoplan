/**
 * StaticDataService — codex consumer (Phase D.3).
 *
 * Talks to the Cloudflare Worker's /v1/codex endpoint and persists the
 * full TennoplanItem[] catalogue (~8k items, 2-3 MB JSON) into the
 * `tennoplanItems` Dexie table. Replaces the legacy DropDataService for
 * the items half of its responsibilities — DropDataService keeps writing
 * drop locations until D.4 retires the entire codepath.
 *
 * Lifecycle:
 *   • init()                    — boot-time staleness check; refresh if
 *                                 older than 12 h or never synced.
 *   • refreshCodex(onProgress)  — manual full sync (Settings button).
 *
 * Read API:
 *   • getItem(uniqueName)
 *   • findItems(query)          — category / search / masteryRank /
 *                                 vaulted, with pagination.
 *   • getCodexStatus()          — itemCount + ageMinutes + isStale flag.
 *
 * "Never overwrite good data with bad":
 *   The full-blob commit happens inside a single Dexie transaction
 *   (clear → bulkAdd → metadata upsert). Any exception rolls back and
 *   the previous codex stays intact. Network failures bump errorCount
 *   but never touch the items table.
 *
 * The Worker URL is required: VITE_WORLDSTATE_WORKER_URL (shared with
 * the worldstate sync). Without it, init() / refreshCodex() are no-ops
 * with a warning log.
 */

import { logger } from '@/core/utils/logger';
import { db } from '@/adapters/storage/db';
import {
  getCodexItem,
  findCodexItems,
  getCodexStatus,
  writeCodex,
  touchCodexMetadata,
  bumpCodexError,
  getCodexMetadata,
  CODEX_STALE_AFTER_MINUTES,
  type ItemQuery,
  type CodexStatus,
} from '@/adapters/storage/codexStore';
import type {
  TennoplanItem,
  ApiResponse,
  SyncMetadata,
  DataSource,
  DataQuality,
} from '@/core/domain/tennoplanApi';

const log = logger.scope('StaticDataService');

// ─── Endpoint config ──────────────────────────────────────────────────────────

const WORKER_BASE = (import.meta.env.VITE_WORLDSTATE_WORKER_URL as string | undefined)?.replace(/\/$/, '');
const ENDPOINT    = WORKER_BASE ? `${WORKER_BASE}/v1/codex` : null;

// ─── Tunables ─────────────────────────────────────────────────────────────────

/** Codex payload is 2–3 MB and downloaded once every several hours; keep
 *  the timeout generous to ride out CDN warm-up jitter. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Client-side codex schema version. Bump this whenever the TennoplanItem
 * shape adds or renames a field so that older Dexie caches are flushed on
 * the next app launch — without this, users running the app would keep
 * the stale-shape rows until the cache happened to expire on its own.
 *
 * Persisted in localStorage rather than Dexie so the check is synchronous
 * (no race with sync state). Bump rules:
 *   • New optional field added            → bump
 *   • Field renamed or semantics changed  → bump
 *   • Pipeline behaviour changed in a way that affects which rows / shapes
 *     are emitted (e.g. component name prefixing) → bump
 *
 * Version history:
 *   • '1' — initial TennoplanItem shape (Phase A, Apr 2026)
 *   • '2' — adds wikiUrl, introduced, patchHistory, transmutable,
 *           auraPolarity; WFCD warframes integration; resolved ability
 *           names; prefixed component names (May 2026)
 *   • '3' — WFCD-only pipeline. Calamity dropped entirely. Per-category
 *           parsers; new items in weapons/sentinels/pets/arcanes/relics/
 *           gear flow through directly from WFCD endpoints (May 2026)
 *   • '4' — adds passiveDescription (warframe/sentinel) + ability.imageName.
 *           These fields landed in the worker pipeline in late May 2026 but
 *           the schema bump was missed — caches built before the worker's
 *           ?only= filter was fixed (commit 54242bf, 2026-05-29) carry the
 *           field as undefined, so PassiveBlock never renders. This bump
 *           force-flushes those stale caches on next launch.
 *   • '5' — paired bump with `cache: 'no-cache'` on the codex fetch
 *           (2026-05-29). The v4 wipe + refetch could hit the browser's
 *           HTTP cache (worker sets max-age=21600) and repopulate Dexie
 *           with the very stale blob it was trying to escape. This bump
 *           guarantees the refetch goes all the way to the worker now
 *           that the cache directive is in place.
 *   • '6' — adds wiki-sourced warframe metadata (sex, subsumedAbility,
 *           tacticalAbility, progenitorElement, themes, playstyle,
 *           initialEnergy, sellPrice, statsRank30) sourced from
 *           wiki.warframe.com Module:Warframes/data. Pre-bump caches
 *           lack these fields → GeneralInformationBlock would render empty
 *           until the next natural refresh; the bump force-wipes so the
 *           block lights up immediately (2026-05-30).
 *   • '7' — adds weapon summary fields: rivenDisposition + accuracy + melee
 *           numerics on ItemStats; weaponTrigger + weaponNoise + damageTypes
 *           at top-level on TennoplanItem. Worker's ?only= filter widened
 *           to pass these through from WFCD /weapons. Pre-bump caches lack
 *           them → WeaponSummaryCard renders an incomplete card until the
 *           next natural refresh; force-flush instead (2026-05-31).
 */
const CODEX_SCHEMA_VERSION = '7';
const SCHEMA_VERSION_KEY    = 'tennoplan:codex-schema-version';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RefreshProgress {
  /** Short, user-facing status string. Safe to render directly. */
  status:  string;
  /** 0–100 percent complete, or null for indeterminate phases. */
  percent: number | null;
}

export interface RefreshResult {
  /** Whether the sync replaced rows ('updated') or short-circuited at 304. */
  outcome:    'updated' | 'not-modified' | 'unchanged';
  itemCount:  number;
  durationMs: number;
}

export interface RefreshOptions {
  onProgress?: (progress: RefreshProgress) => void;
  /** When true, ignores the stored ETag — forces a fresh full payload. */
  force?:      boolean;
}

// ─── Schema version guard ────────────────────────────────────────────────────

/**
 * Compare the cached codex's client-schema version against the current
 * compile-time constant. On mismatch, wipe the codex rows + metadata so
 * the next `init()` sync starts clean — old rows would be missing the
 * fields the new UI expects (e.g. wikiUrl, auraPolarity, prefixed
 * component names).
 *
 * Defensive: errors inside the wipe are swallowed and logged. We'd
 * rather ship the app with a stale cache than refuse to boot because a
 * Dexie operation failed at startup.
 */
async function ensureSchemaVersion(): Promise<void> {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(SCHEMA_VERSION_KEY);
  } catch {
    // localStorage may be unavailable in some embedded contexts (Tauri
    // sandboxed iframes, private modes). Skip the guard rather than
    // blocking startup.
    return;
  }

  if (stored === CODEX_SCHEMA_VERSION) return;

  log.info(`Codex schema version changed (${stored ?? 'none'} → ${CODEX_SCHEMA_VERSION}) — flushing cached items.`);
  try {
    await db.tennoplanItems.clear();
    await db.syncMetadata.delete('codex');
  } catch (e) {
    log.warn('Schema-version wipe failed — will rely on staleness path', errMsg(e));
  }

  try {
    localStorage.setItem(SCHEMA_VERSION_KEY, CODEX_SCHEMA_VERSION);
  } catch {
    // Persistence failed but the wipe succeeded — the next launch will
    // re-flush, idempotent. Acceptable.
  }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, etag: string | null, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (etag) headers['If-None-Match'] = etag;
    // cache: 'no-cache' bypasses the browser's HTTP cache and forces a
    // revalidation hit to the worker every time. We can't trust the
    // browser's HTTP cache here because the worker sets a 6h max-age
    // on /v1/codex — without revalidation, a refetch triggered by a
    // schema-version bump would silently return the old blob and the
    // freshly-wiped Dexie would be repopulated with stale data. Our
    // own ETag handling (via If-None-Match) gives us the 304 short-
    // circuit when nothing has actually changed.
    return await fetch(url, { signal: controller.signal, headers, cache: 'no-cache' });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Sync implementation ──────────────────────────────────────────────────────

interface SyncOutcome {
  status:    'updated' | 'not-modified' | 'error';
  items?:    TennoplanItem[];
  metadata?: SyncMetadata;
  error?:    string;
}

async function performNetworkSync(force: boolean): Promise<SyncOutcome> {
  if (!ENDPOINT) {
    return { status: 'error', error: 'VITE_WORLDSTATE_WORKER_URL not configured' };
  }

  const stored = await getCodexMetadata();
  const etag   = force ? null : stored?.etag ?? null;

  let res: Response;
  try {
    res = await fetchWithTimeout(ENDPOINT, etag, REQUEST_TIMEOUT_MS);
  } catch (e) {
    return { status: 'error', error: errMsg(e) };
  }

  if (res.status === 304) {
    return { status: 'not-modified' };
  }

  if (!res.ok) {
    return { status: 'error', error: `HTTP ${res.status} from ${ENDPOINT}` };
  }

  let body: ApiResponse<TennoplanItem[]>;
  try {
    body = (await res.json()) as ApiResponse<TennoplanItem[]>;
  } catch (e) {
    return { status: 'error', error: `Invalid JSON: ${errMsg(e)}` };
  }

  if (!body.success) {
    return { status: 'error', error: body.error || 'Worker reported failure' };
  }

  if (!Array.isArray(body.data) || body.data.length === 0) {
    return { status: 'error', error: 'Worker returned an empty codex' };
  }

  // Source / quality attribution. Worker's /v1/codex sets X-Data-Source
  // explicitly per response tier (enriched / calamity-plus / cached).
  const headerSource = res.headers.get('X-Data-Source') as DataSource | null;
  const source: DataSource = headerSource ?? body.metadata?.source ?? 'enriched';

  const quality: DataQuality =
    source === 'fallback'      ? 'low'
    : source === 'cached'      ? 'medium'
    : source === 'calamity-plus' ? 'medium'  // calamity-only means WFCD failed; degraded
    : 'high';

  const meta: SyncMetadata = {
    lastSync:   Date.now(),
    etag:       res.headers.get('ETag') ?? stored?.etag ?? '',
    version:    body.metadata?.version ?? 'unknown',
    source,
    quality,
    errorCount: 0,
    itemCount:  body.data.length,
  };

  return { status: 'updated', items: body.data, metadata: meta };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const StaticDataService = {
  /**
   * Boot-time check: refresh the codex if it's older than the staleness
   * threshold OR has never synced. Silent — the user sees a "Codex
   * outdated" banner if it fails, never a blocking error.
   *
   * Safe to call multiple times; concurrent calls are de-duplicated via
   * the Dexie transaction (the second one waits and finds fresh data).
   */
  async init(): Promise<void> {
    if (!ENDPOINT) {
      log.warn('VITE_WORLDSTATE_WORKER_URL not configured — codex sync disabled');
      return;
    }

    // Schema-version guard runs BEFORE the staleness check. When the
    // client-side schema bumps, we flush the cached codex regardless of
    // its age — old rows won't have the fields the new UI expects, and
    // staleness alone wouldn't trigger a flush since rows under 12h old
    // would be considered "fresh" by the regular path.
    await ensureSchemaVersion();

    const status = await getCodexStatus();
    const shouldSync =
      status.itemCount === 0 ||
      status.ageMinutes >= CODEX_STALE_AFTER_MINUTES ||
      status.errorCount > 0;

    if (!shouldSync) {
      log.info(`Codex fresh (${status.itemCount} items, ${status.ageMinutes}m old) — skipping init sync.`);
      return;
    }

    log.info(`Codex stale (${status.itemCount} items, ${status.ageMinutes}m old) — auto-refreshing…`);
    try {
      await this.refreshCodex();
    } catch (e) {
      log.warn('Auto codex refresh failed — staleness banner will surface', errMsg(e));
    }
  },

  /**
   * Manual full sync. Resolves with the outcome — caller can use this to
   * close progress modals, surface toasts, etc. Errors bubble up so the
   * caller can present them; the Dexie state is preserved on failure.
   */
  async refreshCodex(opts: RefreshOptions = {}): Promise<RefreshResult> {
    const t0 = Date.now();
    const onProgress = opts.onProgress ?? (() => {});

    onProgress({ status: 'Fetching codex…', percent: 5 });
    const outcome = await performNetworkSync(opts.force === true);

    if (outcome.status === 'error') {
      onProgress({ status: 'Sync failed', percent: null });
      log.warn('Codex refresh failed:', outcome.error);
      await bumpCodexError(outcome.error ?? 'unknown');
      throw new Error(outcome.error ?? 'Codex refresh failed');
    }

    if (outcome.status === 'not-modified') {
      onProgress({ status: 'Codex unchanged', percent: 100 });
      await touchCodexMetadata();
      const itemCount = (await getCodexStatus()).itemCount;
      log.info(`Codex unchanged (304). ${itemCount} items remain.`);
      return {
        outcome:    'not-modified',
        itemCount,
        durationMs: Date.now() - t0,
      };
    }

    // updated — write to Dexie atomically.
    if (!outcome.items || !outcome.metadata) {
      // Defensive: should never happen given the SyncOutcome shape.
      throw new Error('Codex sync reported success but produced no items');
    }

    onProgress({ status: 'Writing to local cache…', percent: 70 });
    try {
      await writeCodex(outcome.items, outcome.metadata);
    } catch (e) {
      const msg = errMsg(e);
      log.error('Codex Dexie write failed — previous codex preserved', msg);
      await bumpCodexError(`Dexie write failed: ${msg}`);
      throw new Error(`Failed to persist codex: ${msg}`);
    }

    onProgress({ status: `Synced ${outcome.items.length} items`, percent: 100 });
    log.success(`Codex synced — ${outcome.items.length} items, source=${outcome.metadata.source}, version=${outcome.metadata.version}`);

    return {
      outcome:    'updated',
      itemCount:  outcome.items.length,
      durationMs: Date.now() - t0,
    };
  },

  // ─── Read pass-throughs ─────────────────────────────────────────────────────
  // Thin wrappers over codexStore so consumers import a single service rather
  // than reaching into the storage adapter directly.

  async getItem(uniqueName: string): Promise<TennoplanItem | null> {
    return getCodexItem(uniqueName);
  },

  async findItems(query: ItemQuery = {}): Promise<TennoplanItem[]> {
    return findCodexItems(query);
  },

  async getCodexStatus(): Promise<CodexStatus> {
    return getCodexStatus();
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
