// ---------------------------------------------------------------------------
// Tennoplan Worldstate Worker
//
// Architecture:
//   Scheduled cron (every 1 min) → fetch warframestat.us → store in KV
//   HTTP GET from clients        → serve from KV + ETag conditional GET
//
// This means warframestat.us is hit AT MOST once per minute, regardless of
// how many Tennoplan users are online. 200k simultaneous users = 200k KV
// reads, not 200k upstream API calls.
// ---------------------------------------------------------------------------

export interface Env {
  WORLDSTATE: KVNamespace;
}

const UPSTREAM_URL    = 'https://api.warframestat.us/pc';
const KV_DATA_KEY     = 'data';
const KV_ETAG_KEY     = 'etag';
const KV_TTL_SECONDS  = 300; // 5-min safety net; cron refreshes every 60s

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'If-None-Match',
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

  const storedEtag  = await env.WORLDSTATE.get(KV_ETAG_KEY);
  const clientEtag  = request.headers.get('If-None-Match');

  // Conditional GET — return 304 if client already has the latest version.
  // Client skips the ~2 MB JSON parse entirely.
  if (clientEtag && storedEtag && clientEtag === storedEtag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...CORS_HEADERS,
        'ETag':          storedEtag,
        'Cache-Control': 'public, max-age=60',
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
      },
    });
  }

  // KV miss (cold Worker start or KV TTL expired) — fetch upstream and populate.
  try {
    const { text, etag } = await fetchAndStore(env);
    return new Response(text, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':        'application/json',
        'ETag':                etag,
        'Cache-Control':       'public, max-age=60',
        'X-Tennoplan-Source':  'origin',
      },
    });
  } catch (err) {
    console.error('KV miss + upstream fetch failed:', err);
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
    const { changed, etag } = await fetchAndStore(env);
    console.log(`Scheduled refresh complete. ETag: ${etag}. Changed: ${changed}`);
  } catch (err) {
    console.error('Scheduled refresh failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Shared fetch + KV write logic
// ---------------------------------------------------------------------------
async function fetchAndStore(env: Env): Promise<{ text: string; etag: string; changed: boolean }> {
  const res = await fetch(UPSTREAM_URL, {
    headers: {
      'User-Agent': 'Tennoplan/1.0 Worldstate Worker',
      'Accept':     'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Upstream returned HTTP ${res.status}`);
  }

  const text    = await res.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Upstream returned empty body');
  }
  // Validate it's parseable before we store garbage in KV
  try {
    JSON.parse(text);
  } catch {
    throw new Error(`Upstream returned malformed JSON (${text.length} bytes)`);
  }

  const etag    = `"${await sha1Short(text)}"`;
  const current = await env.WORLDSTATE.get(KV_ETAG_KEY);
  const changed = etag !== current;

  if (changed) {
    await Promise.all([
      env.WORLDSTATE.put(KV_DATA_KEY, text, { expirationTtl: KV_TTL_SECONDS }),
      env.WORLDSTATE.put(KV_ETAG_KEY, etag, { expirationTtl: KV_TTL_SECONDS }),
    ]);
  }

  return { text, etag, changed };
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
