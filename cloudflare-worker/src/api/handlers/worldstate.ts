// ---------------------------------------------------------------------------
// GET /v1/worldstate
//
// Three-tier response model:
//   official  — fresh data, age < FALLBACK_STALENESS_WARNING (default 30 min)
//   cached    — data exists but age > 30 min and < MAX_STALENESS (default 60 min)
//   fallback  — current is missing/very stale → project cycle timers from
//               worldstate:previous via fallback.projectFromCache()
//
// ETag handling:
//   • Client sends If-None-Match: "<etag>"
//   • If matches stored metadata.etag → 304 Not Modified (no body)
//   • Always echoes ETag header back to clients
//
// Response headers:
//   ETag, X-Data-Source, X-Data-Age, Cache-Control: public, max-age=60
// ---------------------------------------------------------------------------

import type { Env, ParsedWorldstate, ApiResponse, SyncMetadata, DataSource } from '../../types';
import { ErrorCode } from '../../types';
import {
  getWorldstateCurrent,
  getWorldstatePrevious,
  getWorldstateMeta,
} from '../../storage/kv';
import { ageSeconds, ageMinutes } from '../../utils/date';
import { config } from '../../config';
import { CORS_HEADERS, corsResponse } from '../../middleware/cors';
import { projectFromCache } from '../../worldstate/fallback';
import { makeEtag } from '../../storage/metadata';

export async function handleWorldstate(request: Request, env: Env): Promise<Response> {
  const meta = await getWorldstateMeta(env);

  // ── No metadata at all (cold worker, never synced) ──
  if (!meta) {
    return errorResponse(503, ErrorCode.OFFLINE, 'Worldstate cache cold — try again in a few seconds');
  }

  // ── 304 Not Modified ──
  const clientEtag = request.headers.get('If-None-Match');
  if (clientEtag && clientEtag === meta.etag) {
    return notModified(meta);
  }

  // Determine response tier from age
  const stalenessThresholdMin = numFromEnv(env.FALLBACK_STALENESS_WARNING, config.fallbackStalenessWarningMinutes);
  const maxStalenessMin       = numFromEnv(env.MAX_STALENESS_MINUTES,      config.maxStalenessMinutes);
  const ageMin                = ageMinutes(meta.lastSync);

  // ── FRESH — official / community ──
  if (ageMin < stalenessThresholdMin) {
    const current = await getWorldstateCurrent(env);
    if (current) return live(current, meta);
  }

  // ── CACHED — data exists, getting old but still serveable ──
  if (ageMin < maxStalenessMin) {
    const current = await getWorldstateCurrent(env);
    if (current) return live(current, meta, 'cached');
  }

  // ── FALLBACK — project cycle timers from previous snapshot ──
  return await fallback(env, meta);
}

// ─── Response builders ────────────────────────────────────────────────────────

function live(blob: string, meta: SyncMetadata, overrideSource?: DataSource): Response {
  // The body is exactly what was stored — already a ParsedWorldstate JSON.
  // We wrap it in the ApiResponse shape on the way out so the client gets
  // metadata too, while still benefiting from KV's atomic blob.
  let parsed: ParsedWorldstate;
  try {
    parsed = JSON.parse(blob);
  } catch {
    return errorResponse(500, ErrorCode.PARSE_ERROR, 'Stored worldstate is corrupt');
  }

  const responseSource: DataSource = overrideSource
    ?? (meta.source === 'official' ? 'official' : 'official');  // both 'official' and 'warframestat' surface as 'official' to the frontend

  const body: ApiResponse<ParsedWorldstate> = {
    success: true,
    data: parsed,
    metadata: {
      source:     responseSource,
      ageSeconds: ageSeconds(meta.lastSync),
      version:    meta.version,
      timestamp:  Date.now(),
    },
  };

  return corsResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type':  'application/json',
      'ETag':          meta.etag,
      'X-Data-Source': responseSource,
      'X-Data-Age':    String(ageSeconds(meta.lastSync)),
      'Cache-Control': 'public, max-age=60',
    },
  });
}

async function fallback(env: Env, meta: SyncMetadata): Promise<Response> {
  const previousBlob = await getWorldstatePrevious(env) ?? await getWorldstateCurrent(env);
  if (!previousBlob) {
    return errorResponse(503, ErrorCode.STALE_DATA, 'No cached worldstate available for projection');
  }

  let cached: ParsedWorldstate;
  try {
    cached = JSON.parse(previousBlob);
  } catch {
    return errorResponse(500, ErrorCode.PARSE_ERROR, 'Stored worldstate is corrupt');
  }

  const projected = projectFromCache(cached);
  const blob      = JSON.stringify(projected);
  // Recompute an ETag for the projected payload so client caches don't
  // collide with the (now invalid) live ETag in metadata.
  const etag = await makeEtag(blob);

  const body: ApiResponse<ParsedWorldstate> = {
    success: true,
    data: projected,
    metadata: {
      source:     'fallback',
      ageSeconds: ageSeconds(meta.lastSync),
      version:    `${meta.version}-projected`,
      timestamp:  Date.now(),
    },
  };

  return corsResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type':  'application/json',
      'ETag':          etag,
      'X-Data-Source': 'fallback',
      'X-Data-Age':    String(ageSeconds(meta.lastSync)),
      'Cache-Control': 'public, max-age=60',
    },
  });
}

function notModified(meta: SyncMetadata): Response {
  return new Response(null, {
    status: 304,
    headers: {
      ...CORS_HEADERS,
      'ETag':          meta.etag,
      'X-Data-Source': metaToResponseSource(meta.source),
      'X-Data-Age':    String(ageSeconds(meta.lastSync)),
      'Cache-Control': 'public, max-age=60',
    },
  });
}

function errorResponse(status: number, code: ErrorCode, message: string): Response {
  const body: ApiResponse<never> = { success: false, error: code, code, message };
  return corsResponse(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function metaToResponseSource(s: DataSource): DataSource {
  // Internal labels collapse to the public-facing trio: official | cached | fallback
  if (s === 'fallback') return 'fallback';
  if (s === 'cached')   return 'cached';
  return 'official';
}

function numFromEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
