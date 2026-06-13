// ---------------------------------------------------------------------------
// GET /v1/codex/manifest
//
// Serves the Phase B chunk manifest (codex:manifest) from KV. The manifest
// lists every per-category chunk's semantic hash + R2 key so a client can diff
// against what it holds and fetch only the categories that changed.
//
// ETag = the manifest's contentHash (the overall semantic hash). It moves only
// when chunk data actually changed, so a client's If-None-Match gets a clean
// 304 across the (every-build) version/generatedAt churn.
//
// Missing manifest → 503. The client treats that as "Phase B not live yet" and
// falls back to the monolithic GET /v1/codex, so this never strands a client.
// ---------------------------------------------------------------------------

import type { Env, ApiResponse, CodexManifest } from '../../types';
import { ErrorCode } from '../../types';
import { getCodexManifest } from '../../storage/kv';
import { CORS_HEADERS, corsResponse } from '../../middleware/cors';

const MANIFEST_MAX_AGE_SECONDS = 300; // short — the manifest moves when chunks do

export async function handleCodexManifest(request: Request, env: Env): Promise<Response> {
  const text = await getCodexManifest(env);
  if (!text) {
    const body: ApiResponse<never> = {
      success: false,
      error:   ErrorCode.CODEX_UNAVAILABLE,
      code:    ErrorCode.CODEX_UNAVAILABLE,
      message: 'Codex manifest not published yet',
    };
    return corsResponse(JSON.stringify(body), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // Pull the etag out of the manifest body. It's small (≤16 chunk refs), so a
  // parse is cheap and keeps the ETag tied to the real content hash.
  let etag = '';
  try {
    etag = (JSON.parse(text) as CodexManifest).contentHash ?? '';
  } catch {
    /* malformed manifest — serve it anyway with no etag; client will refetch */
  }

  if (etag && request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...CORS_HEADERS,
        ETag: etag,
        'Cache-Control': `public, max-age=${MANIFEST_MAX_AGE_SECONDS}`,
      },
    });
  }

  return corsResponse(text, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...(etag ? { ETag: etag } : {}),
      'Cache-Control': `public, max-age=${MANIFEST_MAX_AGE_SECONDS}`,
    },
  });
}
