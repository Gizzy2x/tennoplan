// ---------------------------------------------------------------------------
// Tennoplan Worldstate Worker  (Hybrid, parser-based fallback)
//
// Architecture:
//   Scheduled cron (every 1 min) → fetch warframestat.us  → store in KV
//                                  ↳ on empty/fail: fetch api.warframe.com
//                                    → run warframe-worldstate-parser
//                                    → store parsed (warframestat.us-shape) in KV
//   HTTP GET from clients        → serve from KV + ETag conditional GET
//
// This means upstream APIs are hit AT MOST once per minute, regardless of
// how many Tennoplan users are online. All clients read from KV + edge cache.
//
// Fallback is transparent: clients receive identical JSON shape in either
// case. The only visible difference is the `X-Data-Source` response header
// (`warframestat` | `official`), surfaced in the UI via DataSourceBadge.
// ---------------------------------------------------------------------------

import { WorldState } from 'warframe-worldstate-parser';

export interface Env {
  WORLDSTATE: KVNamespace;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PRIMARY_URL    = 'https://api.warframestat.us/pc/';               // trailing slash is required — /pc 301→/pc/ and the 301 body is empty
const FALLBACK_URL   = 'https://api.warframe.com/cdn/worldState.php';   // official DE endpoint — raw worldstate JSON

const KV_DATA_KEY    = 'data';
const KV_ETAG_KEY    = 'etag';
const KV_SOURCE_KEY  = 'source';                                        // 'warframestat' | 'official'
const KV_TTL_SECONDS = 300;                                             // 5-min safety net; cron refreshes every 60s

const FETCH_TIMEOUT_MS = 10_000;

type DataSource = 'warframestat' | 'official';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'If-None-Match',
  'Access-Control-Expose-Headers': 'ETag, X-Data-Source, X-Tennoplan-Source',
};

// ---------------------------------------------------------------------------
// HTTP handler — serves KV cache to Tennoplan clients
// ---------------------------------------------------------------------------
async function handleFetch(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const storedEtag   = await env.WORLDSTATE.get(KV_ETAG_KEY);
  const storedSource = (await env.WORLDSTATE.get(KV_SOURCE_KEY)) as DataSource | null;
  const clientEtag   = request.headers.get('If-None-Match');

  // Conditional GET — return 304 if client already has the latest version.
  // Client skips the ~2 MB JSON parse entirely.
  if (clientEtag && storedEtag && clientEtag === storedEtag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...CORS_HEADERS,
        'ETag':           storedEtag,
        'Cache-Control':  'public, max-age=60',
        'X-Data-Source':  storedSource ?? 'warframestat',
      },
    });
  }

  // Serve from KV (the happy path — sub-millisecond read at edge)
  const data = await env.WORLDSTATE.get(KV_DATA_KEY, 'text');
  if (data && storedEtag) {
    return new Response(data, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':        'application/json',
        'ETag':                storedEtag,
        'Cache-Control':       'public, max-age=60',
        'X-Tennoplan-Source':  'kv',
        'X-Data-Source':       storedSource ?? 'warframestat',
      },
    });
  }

  // KV miss (cold Worker start or KV TTL expired) — fetch upstream and populate.
  try {
    const { text, etag, source } = await fetchAndStore(env);
    return new Response(text, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':        'application/json',
        'ETag':                etag,
        'Cache-Control':       'public, max-age=60',
        'X-Tennoplan-Source':  'origin',
        'X-Data-Source':       source,
      },
    });
  } catch (err) {
    console.error('KV miss + all upstreams failed:', err);
    return new Response(JSON.stringify({ error: 'Upstream unavailable', details: String(err) }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

// ---------------------------------------------------------------------------
// Scheduled handler — the "pull once" engine
// Runs every minute via wrangler.toml cron trigger.
// Only writes to KV when the data actually changed (hash diff).
// ---------------------------------------------------------------------------
async function handleScheduled(env: Env): Promise<void> {
  try {
    const { etag, source, changed } = await fetchAndStore(env);
    console.log(`Scheduled refresh complete. Source: ${source}. ETag: ${etag}. Changed: ${changed}`);
  } catch (err) {
    console.error('Scheduled refresh failed (both sources):', err);
  }
}

// ---------------------------------------------------------------------------
// Shared fetch + KV write logic — tries primary, falls back to official+parser
// ---------------------------------------------------------------------------
async function fetchAndStore(env: Env): Promise<{
  text: string;
  etag: string;
  source: DataSource;
  changed: boolean;
}> {
  let text: string;
  let source: DataSource;

  try {
    text   = await fetchPrimary();
    source = 'warframestat';
  } catch (primaryErr) {
    console.warn('Primary (warframestat.us) failed — falling back to official API:', primaryErr);
    text   = await fetchFallback();
    source = 'official';
  }

  const etag    = `"${await sha1Short(text)}"`;
  const current = await env.WORLDSTATE.get(KV_ETAG_KEY);
  const changed = etag !== current;

  if (changed) {
    await Promise.all([
      env.WORLDSTATE.put(KV_DATA_KEY,   text,   { expirationTtl: KV_TTL_SECONDS }),
      env.WORLDSTATE.put(KV_ETAG_KEY,   etag,   { expirationTtl: KV_TTL_SECONDS }),
      env.WORLDSTATE.put(KV_SOURCE_KEY, source, { expirationTtl: KV_TTL_SECONDS }),
    ]);
  } else {
    // ETag unchanged but source may have flipped (e.g. primary recovered) —
    // refresh the source tag without reuploading the (identical) body.
    await env.WORLDSTATE.put(KV_SOURCE_KEY, source, { expirationTtl: KV_TTL_SECONDS });
  }

  return { text, etag, source, changed };
}

// ---------------------------------------------------------------------------
// Primary: warframestat.us/pc/  (already parsed, preferred)
// Throws on any failure, empty body, or unparseable JSON — caller falls back.
// ---------------------------------------------------------------------------
async function fetchPrimary(): Promise<string> {
  const res = await fetchWithTimeout(PRIMARY_URL, {
    headers: {
      'User-Agent': 'Tennoplan/1.0 Worldstate Worker',
      'Accept':     'application/json',
    },
  }, FETCH_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(`warframestat.us returned HTTP ${res.status}`);
  }

  const text = await res.text();

  if (!text || text.trim().length === 0) {
    // This is the bug we originally hit: 200 OK with Content-Length: 0.
    throw new Error('warframestat.us returned empty body');
  }

  try {
    JSON.parse(text);
  } catch {
    throw new Error(`warframestat.us returned malformed JSON (${text.length} bytes)`);
  }

  return text;
}

// ---------------------------------------------------------------------------
// Fallback: api.warframe.com  (raw game worldstate) + warframe-worldstate-parser
// Produces identical shape to warframestat.us so clients can't tell the difference.
// ---------------------------------------------------------------------------
async function fetchFallback(): Promise<string> {
  const res = await fetchWithTimeout(FALLBACK_URL, {
    headers: {
      'User-Agent': 'Tennoplan/1.0 Worldstate Worker',
      'Accept':     'application/json',
    },
  }, FETCH_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(`api.warframe.com returned HTTP ${res.status}`);
  }

  const rawJsonString = await res.text();

  if (!rawJsonString || rawJsonString.trim().length === 0) {
    throw new Error('api.warframe.com returned empty body');
  }

  // Parse raw DE worldstate into the community-standard warframestat.us shape.
  // WorldState.build takes the raw JSON STRING (not a parsed object) and returns
  // an instance whose JSON.stringify output matches warframestat.us's /pc response.
  const ws = await WorldState.build(rawJsonString, { locale: 'en' });

  return JSON.stringify(ws);
}

// ---------------------------------------------------------------------------
// fetch() with a timeout — AbortController cleans up dangling connections.
// ---------------------------------------------------------------------------
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// SHA-1 short hash — 16 hex chars, sufficient for ETag uniqueness
// ---------------------------------------------------------------------------
async function sha1Short(text: string): Promise<string> {
  const encoded    = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoded);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Worker entrypoint
// ---------------------------------------------------------------------------
export default {
  fetch:     handleFetch,
  scheduled: (_event: ScheduledEvent, env: Env) => handleScheduled(env),
};
