// ---------------------------------------------------------------------------
// upload-codex.ts — Push a built codex blob to Cloudflare KV.
//
// Reads dist/codex/{current,metadata}.json produced by build-codex.ts and
// writes them to the TENNOPLAN_KV namespace via the Cloudflare REST API:
//
//   1. Copy the existing codex:current → codex:previous (rollback insurance)
//   2. PUT codex:current  ← new blob
//   3. PUT codex:metadata ← new metadata
//
// Each PUT is a separate REST call. The Cloudflare API accepts plain text
// bodies; we don't need to base64-encode anything.
//
// Required env vars (set as GitHub Actions secrets):
//   CLOUDFLARE_API_TOKEN   — token with "Workers KV Storage:Edit" permission
//   CLOUDFLARE_ACCOUNT_ID  — account ID
//   CLOUDFLARE_KV_NAMESPACE_ID — the TENNOPLAN_KV namespace (from wrangler.toml)
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = resolve(__dirname, '..', 'dist', 'codex');

const CURRENT_FILE  = resolve(OUT_DIR, 'current.json');
const METADATA_FILE = resolve(OUT_DIR, 'metadata.json');
const MANIFEST_FILE = resolve(OUT_DIR, 'manifest.json');

const R2_BUCKET = 'tennoplan-codex';

const TTL_SECONDS = 172_800; // 48h — matches worker's config.codex.kvTtlSeconds

// ─── Env ──────────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  // Strip ALL whitespace, not just edges — when a secret is pasted with a
  // soft wrap, the embedded \n breaks Headers.append. CF tokens, account IDs,
  // and namespace IDs are alphanumeric (+ hyphens / underscores) so this is
  // safe across all three secrets.
  const v = process.env[name]?.replace(/\s+/g, '');
  if (!v) {
    console.error(`[upload-codex] missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const TOKEN        = requireEnv('CLOUDFLARE_API_TOKEN');
const ACCOUNT_ID   = requireEnv('CLOUDFLARE_ACCOUNT_ID');
const NAMESPACE_ID = requireEnv('CLOUDFLARE_KV_NAMESPACE_ID');

const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}`;

// ─── KV REST helpers ──────────────────────────────────────────────────────────

async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(`${KV_BASE}/values/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`KV GET ${key} → ${res.status}: ${body}`);
  }
  return res.text();
}

async function kvPut(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const url = new URL(`${KV_BASE}/values/${encodeURIComponent(key)}`);
  if (ttlSeconds) url.searchParams.set('expiration_ttl', String(ttlSeconds));

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: value,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`KV PUT ${key} → ${res.status}: ${body}`);
  }
  console.error(`[upload-codex] wrote ${key} (${value.length} bytes${ttlSeconds ? `, ttl ${ttlSeconds}s` : ''})`);
}

// ─── R2 chunk publish (Phase B) ─────────────────────────────────────────────────

/** Put one object into R2 via wrangler. Authenticates off the same
 *  CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID env the KV calls use — the
 *  token must additionally carry R2 edit scope. CI-only (Linux runner). */
async function r2Put(key: string, filePath: string): Promise<void> {
  await execFileAsync(
    'npx',
    ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${key}`,
      '--file', filePath, '--content-type', 'application/json', '--remote'],
    { env: process.env, maxBuffer: 32 * 1024 * 1024 },
  );
}

interface ManifestShape { chunks: Array<{ key: string }>; }

/** Upload every chunk the new manifest references, then publish the manifest to
 *  KV (rotating the old one to :previous). Uploads are unconditional — chunk
 *  bodies are content-addressed and volatile-stripped, so re-PUTting an existing
 *  key writes identical bytes (idempotent); this is resilient to a partial prior
 *  deploy where the previous manifest referenced an object that never landed.
 *
 *  Ordering matters: the manifest is written ONLY after all chunk PUTs succeed,
 *  so codex:manifest never points at an object missing from R2. */
async function publishChunks(): Promise<void> {
  let manifestText: string;
  try {
    manifestText = await readFile(MANIFEST_FILE, 'utf8');
  } catch {
    console.error('[upload-codex] no manifest.json — skipping chunk publish (monolith already published)');
    return;
  }

  const manifest = JSON.parse(manifestText) as ManifestShape;
  console.error(`[upload-codex] uploading ${manifest.chunks.length} chunks to R2 bucket ${R2_BUCKET}`);
  for (const { key } of manifest.chunks) {
    await r2Put(key, resolve(OUT_DIR, key));
    console.error(`[upload-codex] R2 put ${key}`);
  }

  // Manifest is published last — every referenced chunk now exists in R2.
  const oldManifest = await kvGet('codex:manifest');
  if (oldManifest) await kvPut('codex:manifest:previous', oldManifest, TTL_SECONDS);
  await kvPut('codex:manifest', manifestText, undefined);
  console.error('[upload-codex] published codex:manifest');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

interface RemoteMeta {
  lastSync?:    number;
  etag?:        string;
  itemCount?:   number;
  contentHash?: string;
  [key: string]: unknown;
}

/** Refuse to publish when the item count collapses vs what's live — a broken
 *  upstream (empty WFCD category, dead endpoint) must not evict good data.
 *  Override with FORCE_PUBLISH=1 for intentional shrinks. */
const COUNT_DROP_FLOOR = 0.95;

async function main(): Promise<void> {
  const t0 = Date.now();
  console.error('[upload-codex] starting');

  const [blob, metadataText] = await Promise.all([
    readFile(CURRENT_FILE,  'utf8'),
    readFile(METADATA_FILE, 'utf8'),
  ]);
  const metadata = JSON.parse(metadataText) as RemoteMeta;
  console.error(`[upload-codex] read ${blob.length} bytes blob + ${metadataText.length} bytes metadata`);

  // ── Compare against what's live before writing anything ──
  let remote: RemoteMeta | null = null;
  const remoteText = await kvGet('codex:metadata');
  if (remoteText) {
    try { remote = JSON.parse(remoteText) as RemoteMeta; } catch { remote = null; }
  }

  // GATE 1 — count-drop guard ("never overwrite good data with bad").
  const newCount    = metadata.itemCount ?? 0;
  const remoteCount = remote?.itemCount ?? 0;
  if (remoteCount > 0 && newCount < remoteCount * COUNT_DROP_FLOOR && process.env.FORCE_PUBLISH !== '1') {
    console.error(`[upload-codex] REFUSING to publish: item count dropped ${remoteCount} → ${newCount} ` +
      `(> ${(1 - COUNT_DROP_FLOOR) * 100}% shrink). An upstream source likely broke. ` +
      `Set FORCE_PUBLISH=1 to override if the shrink is intentional.`);
    process.exit(1);
  }

  // GATE 2 — skip-unchanged. The blob etag moves every build (timestamps),
  // but contentHash only moves when data actually changed. When unchanged we
  // refresh ONLY metadata.lastSync (1 tiny KV write instead of 3, two of
  // them 17MB) and keep the remote etag so it still matches the stored blob
  // — clients keep getting 304s, freshness stays honest.
  if (remote?.contentHash && remote.contentHash === metadata.contentHash) {
    // Content unchanged ⇒ skip the expensive 17MB blob rewrite; just bump
    // metadata.lastSync (1 tiny KV write) so clients keep 304ing.
    const refreshed = { ...remote, lastSync: metadata.lastSync ?? Date.now() };
    await kvPut('codex:metadata', JSON.stringify(refreshed), undefined);

    // Chunks/manifest normally move in lockstep with the monolith, so they'd be
    // current too. EXCEPT on bootstrap (Phase B just shipped — no manifest yet)
    // or drift (a manifest from before chunking, or a half-published run): the
    // monolith hash can match while chunks are absent/stale. Publish them when
    // the live manifest's hash doesn't match this build's. publishChunks is
    // idempotent (content-addressed), so this is safe to run unconditionally
    // here — the hash check just avoids re-uploading when nothing's missing.
    let manifestCurrent = false;
    const liveManifest = await kvGet('codex:manifest');
    if (liveManifest) {
      try { manifestCurrent = (JSON.parse(liveManifest) as { contentHash?: string }).contentHash === metadata.contentHash; }
      catch { /* malformed — treat as not current, republish */ }
    }
    if (manifestCurrent) {
      console.error(`[upload-codex] content unchanged (hash ${metadata.contentHash}) — ` +
        `blob + chunks already current, freshness bumped. done in ${Date.now() - t0}ms`);
    } else {
      console.error('[upload-codex] content unchanged but manifest missing/stale — bootstrapping chunk publish');
      await publishChunks();
      console.error(`[upload-codex] done in ${Date.now() - t0}ms`);
    }
    return;
  }

  // ── Full publish ──
  // 1. Roll the current blob into previous as rollback insurance.
  const existing = await kvGet('codex:current');
  if (existing) {
    await kvPut('codex:previous', existing, TTL_SECONDS);
  } else {
    console.error('[upload-codex] no prior codex:current — skipping previous rotation');
  }

  // 2. Write the new blob + metadata. codex:current carries NO TTL: with
  //    skip-unchanged publishes, a stable codex can legitimately go days
  //    without a blob rewrite, and an upstream outage must never let the
  //    last-good data evaporate ("never overwrite good data with bad" also
  //    means "never let it expire"). codex:previous keeps a TTL — it's
  //    rollback insurance, not a serving path. Metadata has no TTL either.
  await kvPut('codex:current',  blob,         undefined);
  await kvPut('codex:metadata', metadataText, undefined);

  // 3. Publish the Phase B per-category chunks to R2 + the manifest to KV.
  //    Runs after the monolith publish so a chunk-upload failure (e.g. token
  //    lacks R2 scope) leaves the always-served monolith fresh — graceful.
  await publishChunks();

  console.error(`[upload-codex] done in ${Date.now() - t0}ms`);
}

main().catch((e) => {
  console.error('[upload-codex] FATAL', e);
  process.exit(1);
});
