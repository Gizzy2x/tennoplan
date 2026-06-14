/**
 * WorldstateSync — V2 worldstate sync service (Phase D.2).
 *
 * Talks ONLY to the Tennoplan Cloudflare Worker at /v1/worldstate. The
 * Worker runs every minute, manages its own multi-source fallback chain
 * (api.warframe.com → warframestat.us → cycle-math projection), and
 * serves a normalised ParsedWorldstate shape with Unix-ms timestamps.
 *
 * This service replaces the legacy SyncService.ts which speaks the old
 * warframestat.us shape directly. Both services coexist during Phase D
 * to avoid a half-broken intermediate state — D.4 retires the legacy
 * code path and flips this to be the default.
 *
 * Behaviour:
 *   • Two-stage poll (Pulse v1): a sub-KB /v1/pulse head every 5 min;
 *     the full /v1/worldstate body is fetched ONLY when the head's
 *     semanticEtag moves. Paused while the tab is hidden, immediate
 *     resync on visibility change.
 *   • ETag-based conditional GET on the body (If-None-Match / 304)
 *   • Rate-limited passive sync nudge (60-s cooldown) — cheap now, it
 *     usually resolves as a head check
 *   • HeartbeatStore status transitions: live | cached | stale | offline,
 *     with staleness derived from the WORKER's upstream sync age
 *
 * Storage:
 *   • ParsedWorldstate snapshot → db.worldstate (key='current'|'previous')
 *   • Sync metadata             → db.syncMetadata (id='worldstate')
 *
 * The Worker URL is required: VITE_WORLDSTATE_WORKER_URL. If unset, init()
 * logs an error and is a no-op — the legacy SyncService remains the only
 * active fetcher in that case.
 */

import { logger } from '@/core/utils/logger';
import { useHeartbeatStore } from '@/store/heartbeat';
import {
  getWorldstate,
  getWorldstateMetadata,
  writeWorldstate,
  touchWorldstateMetadata,
  bumpWorldstateError,
} from '@/adapters/storage/worldstateStore';
import type {
  ParsedWorldstate,
  ApiResponse,
  SyncMetadata,
  DataSource,
  DataQuality,
  PulseHead,
} from '@/core/domain/tennoplanApi';
import { WORKER_BASE } from '@/lib/config/workerBase';

const log = logger.scope('WorldstateSync');

// ─── Endpoint config ──────────────────────────────────────────────────────────

// WORKER_BASE carries a hardcoded production default (see workerBase.ts), so
// these endpoints are always non-null — the env var is an override, not a gate.
const ENDPOINT       = `${WORKER_BASE}/v1/worldstate`;
const PULSE_ENDPOINT = `${WORKER_BASE}/v1/pulse`;

// ─── Tunables ─────────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS       = 10_000;

/** Aligned to the Worker's every-5-min worldstate cron — KV only changes when
 *  the cron writes, so polling faster than 5 min is pure wasted 304s. Freshness
 *  on tab focus is covered by the visibilitychange passive sync below. */
const POLL_INTERVAL_MS         = 5 * 60_000;
const PASSIVE_SYNC_COOLDOWN_MS = 60_000;

/** Match the Worker's FALLBACK_STALENESS_WARNING (default 30 min) — past
 *  this age the heartbeat shows 'stale' rather than 'live', signalling the
 *  data may have been served via the Worker's cycle-math projection. */
const STALE_THRESHOLD_MS = 30 * 60_000;

// ─── Module state ─────────────────────────────────────────────────────────────

let _lastPassiveSyncAt = 0;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _visibilityHandler: (() => void) | null = null;

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, etag: string | null, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (etag) headers['If-None-Match'] = etag;
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

interface SyncOutcome {
  status:    'updated' | 'not-modified' | 'error';
  data?:     ParsedWorldstate;
  metadata?: SyncMetadata;
  error?:    string;
}

/**
 * Stage 1 of the two-stage poll: fetch the sub-KB pulse head. Returns null
 * on ANY failure (endpoint missing, network error, old worker without
 * /v1/pulse) — the caller then falls back to the full-body fetch, so a
 * pulse outage can never make the client blind.
 */
async function fetchPulseHead(): Promise<PulseHead | null> {
  if (!PULSE_ENDPOINT) return null;
  try {
    const res = await fetchWithTimeout(PULSE_ENDPOINT, null, REQUEST_TIMEOUT_MS);
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse<PulseHead>;
    if (!body.success || !body.data?.semanticEtag) return null;
    return body.data;
  } catch {
    return null;
  }
}

/**
 * Single network call. Returns the outcome without touching Dexie or
 * the heartbeat store — those side effects live in `sync()` so we can
 * keep this function pure and easy to reason about.
 */
async function performNetworkSync(head?: PulseHead | null): Promise<SyncOutcome> {
  if (!ENDPOINT) {
    return { status: 'error', error: 'VITE_WORLDSTATE_WORKER_URL not configured' };
  }

  const stored = await getWorldstateMetadata();
  const etag   = stored?.etag ?? null;

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

  let body: ApiResponse<ParsedWorldstate>;
  try {
    body = (await res.json()) as ApiResponse<ParsedWorldstate>;
  } catch (e) {
    return { status: 'error', error: `Invalid JSON: ${errMsg(e)}` };
  }

  if (!body.success) {
    return { status: 'error', error: body.error || 'Worker reported failure' };
  }

  // Source attribution: prefer the X-Data-Source header (the Worker sets
  // this explicitly per response tier), then the metadata block, then a
  // safe default.
  const headerSource = res.headers.get('X-Data-Source') as DataSource | null;
  const source: DataSource = headerSource ?? body.metadata?.source ?? 'official';

  // Quality grade: derive from the source. The /v1/worldstate handler
  // doesn't surface a per-response quality field today, so we infer:
  //   official / warframestat / enriched → 'high'
  //   cached                              → 'medium'
  //   fallback                            → 'low' (cycle-math projection)
  const quality: DataQuality =
    source === 'fallback' ? 'low'
    : source === 'cached' ? 'medium'
    : 'high';

  const meta: SyncMetadata = {
    lastSync:   Date.now(),
    etag:       res.headers.get('ETag') ?? stored?.etag ?? '',
    version:    body.metadata?.version ?? 'unknown',
    source,
    quality,
    errorCount: 0,
    // Remember which pulse head this snapshot was fetched under — the next
    // poll skips the body when the head still carries this etag.
    ...(head ? { pulseEtag: head.semanticEtag, upstreamLastSync: head.lastSync } : {}),
  };

  return { status: 'updated', data: body.data, metadata: meta };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const WorldstateSync = {
  /**
   * Run one sync cycle — two-stage (Pulse v1).
   *
   * Stage 1: poll the sub-KB /v1/pulse head. If its semanticEtag matches
   * the one our snapshot was fetched under, nothing meaningful changed —
   * touch metadata, set the heartbeat from the head's upstream sync age,
   * and return the cached snapshot without downloading the body.
   *
   * Stage 2: only when the head moved (or is unavailable, or force=true)
   * fetch the full /v1/worldstate body.
   *
   * `force` bypasses the head gate — manual refresh buttons and the System
   * Pulse always pull a fresh body.
   */
  async sync(opts: { force?: boolean } = {}): Promise<ParsedWorldstate | null> {
    const hb = useHeartbeatStore.getState();

    // ── Stage 1: head check ──
    let head: PulseHead | null = null;
    if (!opts.force) {
      head = await fetchPulseHead();
      if (head) {
        const stored = await getWorldstateMetadata();
        if (stored?.pulseEtag && stored.pulseEtag === head.semanticEtag) {
          const cached = await getWorldstate('current');
          if (cached) {
            await touchWorldstateMetadata({ upstreamLastSync: head.lastSync });
            // Staleness from the WORKER's upstream sync age — if warframestat
            // dies, head.lastSync freezes and this correctly degrades to
            // 'stale' even though the head itself keeps answering 200.
            const status = ageMs(head.lastSync) > STALE_THRESHOLD_MS ? 'stale' : 'live';
            hb.setSync(status, head.lastSync);
            log.info(`Pulse head unchanged (seq ${head.seq}) — body fetch skipped.`);
            return cached;
          }
        }
      }
    }

    // ── Stage 2: full body ──
    const outcome = await performNetworkSync(head);

    // ── Fresh data ──
    if (outcome.status === 'updated' && outcome.data && outcome.metadata) {
      await writeWorldstate(outcome.data, outcome.metadata);
      const status = ageMs(outcome.metadata.lastSync) > STALE_THRESHOLD_MS ? 'stale' : 'live';
      hb.setSync(status, outcome.metadata.lastSync);
      log.success(`Worldstate synced (${outcome.metadata.source}, ${outcome.metadata.version}).`);
      return outcome.data;
    }

    // ── 304 Not Modified — cached data is still authoritative ──
    if (outcome.status === 'not-modified') {
      await touchWorldstateMetadata();
      hb.setSync('live', Date.now());
      log.info('Worldstate unchanged (304).');
      return getWorldstate('current');
    }

    // ── Error — keep cached data, report stale/offline ──
    log.warn(`Sync failed: ${outcome.error ?? 'unknown error'}`);
    await bumpWorldstateError(outcome.error ?? 'unknown');

    const cached = await getWorldstate('current');
    const meta   = await getWorldstateMetadata();
    if (cached && meta) {
      const status = ageMs(meta.lastSync) > STALE_THRESHOLD_MS ? 'stale' : 'cached';
      hb.setSync(status, meta.lastSync);
    } else {
      hb.setSync('offline');
    }
    return cached;
  },

  /**
   * Rate-limited nudge — safe to call from rendering code on every clock
   * tick. Triggered when a fissure / invasion / cycle expires so the UI
   * doesn't have to wait the full 60 s for the next poll.
   */
  requestPassiveSync(): void {
    const now = Date.now();
    if (now - _lastPassiveSyncAt < PASSIVE_SYNC_COOLDOWN_MS) return;
    _lastPassiveSyncAt = now;
    log.info('Passive sync triggered by expiration event.');
    void this.sync();
  },

  /**
   * Bootstrap the polling engine. Call exactly once in AppShell when V2
   * is enabled. Fires an immediate sync, then polls every 60 s while the
   * tab is visible.
   */
  init(): void {
    if (!ENDPOINT) {
      log.error('VITE_WORLDSTATE_WORKER_URL not configured — V2 sync disabled');
      return;
    }

    void this.sync();

    const startPoll = () => {
      _pollTimer = setInterval(() => {
        void WorldstateSync.sync();
      }, POLL_INTERVAL_MS);
    };
    startPoll();

    _visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Re-focus: immediate burst, restart loop
        if (_pollTimer) clearInterval(_pollTimer);
        void WorldstateSync.sync();
        startPoll();
      } else if (_pollTimer) {
        clearInterval(_pollTimer);
        _pollTimer = null;
      }
    };
    document.addEventListener('visibilitychange', _visibilityHandler);

    log.info(`WorldstateSync polling ${ENDPOINT} every ${POLL_INTERVAL_MS / 1000}s.`);
  },

  /**
   * Tear down the polling engine. Call from AppShell cleanup.
   */
  destroy(): void {
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
    if (_visibilityHandler) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
      _visibilityHandler = null;
    }
    log.info('WorldstateSync stopped.');
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageMs(timestamp: number): number {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  return Date.now() - timestamp;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
