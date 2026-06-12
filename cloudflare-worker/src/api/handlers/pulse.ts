// ---------------------------------------------------------------------------
// GET /v1/pulse
//
// The sub-KB worldstate head. Clients poll THIS at cron cadence and fetch
// the full /v1/worldstate body only when data.semanticEtag moves — the
// two-stage poll that makes 60k clients affordable.
//
// One KV read (worldstate:metadata, small), no blob parse. The ETag header
// is the SEMANTIC etag, so If-None-Match → 304 works even though the raw
// worldstate blob changes every cron tick.
//
// data.lastSync is the worker's last successful UPSTREAM sync — if
// warframestat dies, this freezes while /v1/pulse keeps serving 200s, and
// clients surface "data is N min old" without a full fetch.
// ---------------------------------------------------------------------------

import type { Env, ApiResponse, PulseHead, SyncMetadata } from '../../types';
import { ErrorCode } from '../../types';
import { getWorldstateMeta } from '../../storage/kv';
import { ageSeconds } from '../../utils/date';
import { CORS_HEADERS, corsResponse } from '../../middleware/cors';

export async function handlePulse(request: Request, env: Env): Promise<Response> {
  const meta = await getWorldstateMeta(env);

  if (!meta) {
    const body: ApiResponse<never> = {
      success: false,
      error:   ErrorCode.OFFLINE,
      code:    ErrorCode.OFFLINE,
      message: 'Worldstate cache cold — try again in a few seconds',
    };
    return corsResponse(JSON.stringify(body), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const head = meta.pulse ?? synthesizeHead(meta);

  // 304 against the SEMANTIC etag.
  const clientEtag = request.headers.get('If-None-Match');
  if (clientEtag && clientEtag === head.semanticEtag) {
    return new Response(null, { status: 304, headers: pulseHeaders(head, meta) });
  }

  const body: ApiResponse<PulseHead> = {
    success: true,
    data: head,
    metadata: {
      source:     meta.source,
      ageSeconds: ageSeconds(meta.lastSync),
      version:    meta.version,
      timestamp:  Date.now(),
    },
  };

  return corsResponse(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...pulseHeaders(head, meta) },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pulseHeaders(head: PulseHead, meta: SyncMetadata): Record<string, string> {
  return {
    ...CORS_HEADERS,
    'ETag':          head.semanticEtag,
    'X-Data-Source': meta.source,
    'X-Data-Age':    String(ageSeconds(meta.lastSync)),
    // Edge Cache API picks this up; absorbs the client poll stampede.
    'Cache-Control': 'public, max-age=60',
  };
}

/**
 * Pre-pulse metadata (written before this deploy's first cron tick) has no
 * embedded head. Synthesize a degenerate one from the blob etag — clients
 * will full-fetch once, then the next cron tick writes a real head. Window
 * is at most 5 minutes.
 */
function synthesizeHead(meta: SyncMetadata): PulseHead {
  return {
    semanticEtag: meta.etag,
    lastChange:   meta.lastSync,
    lastSync:     meta.lastSync,
    seq:          0,
    counts:       { fissures: 0, alerts: 0, invasions: 0 },
    events:       [],
  };
}
