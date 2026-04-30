// ---------------------------------------------------------------------------
// GET /v1/codex
//
// Two-tier response model (no synthetic-projection tier — codex isn't
// time-evolving, so cycle-math fallback doesn't apply):
//
//   enriched / calamity-plus  — fresh data served from codex:current,
//                               labelled with the source the updater
//                               recorded in metadata.
//   cached                    — current is missing but previous exists
//                               (rollback after a failed sync wipe).
//
// 503 paths:
//   • Cold worker (no metadata) — never synced
//   • Both current AND previous gone (KV TTL elapsed without successful
//     sync). Frontend falls back to its own Dexie cache.
//
// ETag handling:
//   • Client sends If-None-Match: "<etag>"
//   • Match → 304 Not Modified (no body — saves the ~52 KiB gzip download)
//   • Always echoes ETag header back
//
// Body assembly:
//   The KV blob is already a TennoplanItem[] JSON string. We splice it into
//   the ApiResponse envelope via string concatenation rather than parse +
//   re-stringify — saves ~150 ms CPU on a 2–3 MB body.
// ---------------------------------------------------------------------------

import type { Env, ApiResponse, SyncMetadata, DataSource, TennoplanItem, ResponseMetadata } from '../../types';
import { ErrorCode } from '../../types';
import {
  getCodexCurrent,
  getCodexPrevious,
  getCodexMeta,
} from '../../storage/kv';
import { ageSeconds } from '../../utils/date';
import { CORS_HEADERS, corsResponse } from '../../middleware/cors';

const CODEX_MAX_AGE_SECONDS = 21_600; // 6 hours, matches sync cadence

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function handleCodex(request: Request, env: Env): Promise<Response> {
  const meta = await getCodexMeta(env);

  // ── No metadata at all (cold worker, never synced) ──
  if (!meta) {
    return error503(ErrorCode.CODEX_UNAVAILABLE, 'Codex cache cold — first sync pending');
  }

  // ── 304 Not Modified ──
  const clientEtag = request.headers.get('If-None-Match');
  if (clientEtag && clientEtag === meta.etag) {
    return notModified(meta);
  }

  // ── Live: serve current ──
  const current = await getCodexCurrent(env);
  if (current) {
    return serve(current, meta, /*isCached*/ false);
  }

  // ── Rollback: serve previous (current vanished, previous still around) ──
  const previous = await getCodexPrevious(env);
  if (previous) {
    return serve(previous, meta, /*isCached*/ true);
  }

  // ── Nothing stored ──
  return error503(ErrorCode.CODEX_UNAVAILABLE, 'Codex blob missing — sync may have failed');
}

// ─── Response builders ────────────────────────────────────────────────────────

/**
 * Splice the items[] blob (already a JSON string) into the ApiResponse
 * envelope without parsing it. The combined body is well-formed JSON
 * because `blob` is a JSON value (an array), surrounded by the rest of
 * the wrapper object.
 */
function serve(blob: string, meta: SyncMetadata, isCached: boolean): Response {
  const responseSource: DataSource = isCached ? 'cached' : (meta.source ?? 'enriched');

  const responseMeta: ResponseMetadata = {
    source:     responseSource,
    ageSeconds: ageSeconds(meta.lastSync),
    version:    meta.version,
    timestamp:  Date.now(),
    ...(meta.itemCount !== undefined ? { itemCount: meta.itemCount } : {}),
  };

  // String-concat envelope — no re-parse. The shape exactly matches
  // ApiResponse<TennoplanItem[]> when the blob is a valid array literal.
  const envelopeMeta = JSON.stringify(responseMeta);
  const body = `{"success":true,"data":${blob},"metadata":${envelopeMeta}}`;

  // Type-assertion only — runtime body is the concatenated string.
  void (null as unknown as ApiResponse<TennoplanItem[]>);

  return corsResponse(body, {
    status: 200,
    headers: {
      'Content-Type':  'application/json',
      'ETag':          meta.etag,
      'X-Data-Source': responseSource,
      'X-Data-Age':    String(ageSeconds(meta.lastSync)),
      ...(meta.itemCount !== undefined ? { 'X-Item-Count': String(meta.itemCount) } : {}),
      'Cache-Control': `public, max-age=${CODEX_MAX_AGE_SECONDS}`,
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
      ...(meta.itemCount !== undefined ? { 'X-Item-Count': String(meta.itemCount) } : {}),
      'Cache-Control': `public, max-age=${CODEX_MAX_AGE_SECONDS}`,
    },
  });
}

function error503(code: ErrorCode, message: string): Response {
  const body: ApiResponse<never> = { success: false, error: code, code, message };
  return corsResponse(JSON.stringify(body), {
    status: 503,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function metaToResponseSource(s: DataSource): DataSource {
  // 'enriched' / 'calamity-plus' / 'wfcd' all surface as their own
  // attribution to the frontend so it can show data-source provenance.
  // The handler only collapses to 'cached' when explicitly serving the
  // rollback blob.
  return s;
}
