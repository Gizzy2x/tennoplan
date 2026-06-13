// ---------------------------------------------------------------------------
// GET /v1/codex/chunk/<key>
//
// Streams one content-addressed per-category codex chunk from R2. The key is
// the manifest's `key` minus the `chunks/` prefix, e.g.
//   /v1/codex/chunk/Mod-a1b2c3d4.json
//
// The body is a raw TennoplanItem[] (no ApiResponse envelope) — the delta
// client parses it straight into an array.
//
// Chunks are content-addressed and immutable: a given key's bytes never change
// (the semantic hash IS the cache-buster). So Cache-Control is max, immutable —
// once an edge/browser holds a chunk version it never refetches it, and an
// unchanged category costs zero bytes on the next sync.
//
// Key validation is pinned to the real ItemCategory enum (not a loose regex) so
// the URL contract stays explicit and traversal/garbage keys are rejected 400.
// ---------------------------------------------------------------------------

import type { Env } from '../../types';
import { ITEM_CATEGORIES } from '../../types';
import { corsResponse } from '../../middleware/cors';

const CHUNK_PREFIX = 'chunks/';
const CHUNK_MAX_AGE_SECONDS = 31_536_000; // 1 year — content-addressed, immutable

// e.g. ^(Warframe|Weapon|...|Equipment)-[a-f0-9]+\.json$
const KEY_PATTERN = new RegExp(`^(?:${ITEM_CATEGORIES.join('|')})-[a-f0-9]+\\.json$`);

export async function handleCodexChunk(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const key = decodeURIComponent(pathname.slice('/v1/codex/chunk/'.length));

  if (!KEY_PATTERN.test(key)) {
    return corsResponse(
      JSON.stringify({ success: false, error: 'Invalid chunk key', code: 'INVALID_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    );
  }

  const object = await env.CODEX_BUCKET.get(CHUNK_PREFIX + key);
  if (!object) {
    return corsResponse(
      JSON.stringify({ success: false, error: 'Chunk not found', code: 'CODEX_UNAVAILABLE' }),
      { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    );
  }

  // ETag = the key itself (which embeds the content hash) → immutable hit.
  return corsResponse(object.body, {
    status: 200,
    headers: {
      'Content-Type':  'application/json',
      ETag:            `"${key}"`,
      'Cache-Control': `public, max-age=${CHUNK_MAX_AGE_SECONDS}, immutable`,
    },
  });
}
