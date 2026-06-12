import type { Env } from '../types';
import { handleHealth } from './handlers/health';
import { handleWorldstate } from './handlers/worldstate';
import { handleCodex } from './handlers/codex';
import { handlePulse } from './handlers/pulse';
import { corsResponse, handleOptions } from '../middleware/cors';

export async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  if (request.method !== 'GET') {
    return corsResponse(
      JSON.stringify({ success: false, error: 'Method Not Allowed', code: 'INVALID_REQUEST' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { pathname } = new URL(request.url);

  if (pathname === '/v1/health')             return handleHealth(request, env);
  if (pathname === '/v1/pulse')              return edgeCached(request, ctx, () => handlePulse(request, env));
  if (pathname.startsWith('/v1/worldstate')) return edgeCached(request, ctx, () => handleWorldstate(request, env));
  if (pathname.startsWith('/v1/codex'))      return handleCodex(request, env);

  return corsResponse(
    JSON.stringify({ success: false, error: 'Not Found', code: 'INVALID_REQUEST' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  );
}

// ─── Edge Cache API wrapper ────────────────────────────────────────────────────
//
// Absorbs the client poll stampede: N clients polling on the same cron tick
// hit the per-PoP edge cache (60s TTL from the handler's Cache-Control), not
// KV. This is what makes the system affordable at scale — KV reads stay at
// ~1/min per PoP instead of 1 per client.
//
// ⚠ The Cache API is a NO-OP on *.workers.dev domains (cache.match never
// hits). It only engages once the worker is served from a custom domain /
// route on a Cloudflare zone. The code degrades gracefully to today's
// behavior until then.
//
// The cache key strips query strings (origin + pathname) so ?foo=bar can't
// fragment the cache, but keeps the original headers so Cloudflare's native
// If-None-Match revalidation against the cached ETag still answers 304s.

async function edgeCached(
  request: Request,
  ctx: ExecutionContext,
  handler: () => Promise<Response>,
): Promise<Response> {
  const url      = new URL(request.url);
  const cacheKey = new Request(`${url.origin}${url.pathname}`, request);
  const cache    = caches.default;

  try {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch { /* cache unavailable — fall through to the handler */ }

  const res = await handler();

  // Only cache successful full responses — never 304s or errors.
  if (res.status === 200) {
    try { ctx.waitUntil(cache.put(cacheKey, res.clone())); } catch { /* ignore */ }
  }
  return res;
}
