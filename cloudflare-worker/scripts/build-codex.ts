// ---------------------------------------------------------------------------
// build-codex.ts — Node-runnable codex builder.
//
// Why this exists:
//   The codex pipeline (fetch → parse → build → enrich → normalize → validate)
//   exceeds Cloudflare Workers' Free-plan CPU budget (~10ms per invocation)
//   when run as a scheduled handler. Moving the build into a CI environment
//   (GitHub Actions, unlimited CPU) sidesteps that constraint while keeping
//   the same source-of-truth pipeline code.
//
// What it does:
//   1. Run the existing pipeline modules end-to-end.
//   2. Write the produced blob + metadata to ./dist/codex/{current,metadata}.json
//   3. CI workflow then uploads these via `wrangler kv key put --remote` to
//      the same KV namespace the worker already reads from.
//
// The worker still serves /v1/codex (unchanged) — it just stops doing the
// build itself.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchAllCodexSources } from '../src/codex/fetcher';
import { parseCodex }           from '../src/codex/parser';
import { buildCodex }           from '../src/codex/builder';
import { enrichCodex }          from '../src/codex/enricher';
import { normalizeCodex }       from '../src/codex/normalizer';
import { validateCodex }        from '../src/codex/validator';
import { makeEtag, makeVersion } from '../src/storage/metadata';
import type { SyncMetadata, DataSource } from '../src/types';

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = resolve(__dirname, '..', 'dist', 'codex');
const CURRENT_FILE  = resolve(OUT_DIR, 'current.json');
const METADATA_FILE = resolve(OUT_DIR, 'metadata.json');

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const t0 = Date.now();
  console.error('[build-codex] starting');

  // ── 1. FETCH ──
  const tFetch = Date.now();
  const blobs = await fetchAllCodexSources();
  console.error(`[build-codex] fetched all sources in ${Date.now() - tFetch}ms`);

  // ── 2. PARSE ──
  const parsed = parseCodex(blobs);

  // ── 3. BUILD ──
  const built = buildCodex(parsed);

  // ── 4. ENRICH ──
  const enriched = enrichCodex(built, parsed);

  // ── 5. NORMALIZE ──
  const source: DataSource = 'wfcd';
  const version            = makeVersion(source);
  const generatedAt        = Date.now();
  const normalized         = normalizeCodex(enriched, { version, generatedAt, source });

  // ── 6. VALIDATE ──
  const validation = validateCodex(normalized);
  if (validation.report.fatal) {
    console.error('[build-codex] FATAL validation:', validation.report.notes);
    process.exit(1);
  }

  // ── 7. WRITE TO DISK ──
  const blob = JSON.stringify(validation.items);
  const etag = await makeEtag(blob);
  const metadata: SyncMetadata = {
    lastSync:   generatedAt,
    etag,
    version,
    source,
    quality:    validation.report.quality,
    errorCount: 0,
    itemCount:  validation.items.length,
    syncMode:   'normal',
    retryCount: 0,
    aggressiveSyncsLeft: 0,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(CURRENT_FILE,  blob,                       'utf8');
  await writeFile(METADATA_FILE, JSON.stringify(metadata),   'utf8');

  console.error(`[build-codex] wrote ${CURRENT_FILE}  (${blob.length} bytes)`);
  console.error(`[build-codex] wrote ${METADATA_FILE} (${metadata.itemCount} items, quality=${metadata.quality})`);
  console.error(`[build-codex] total ${Date.now() - t0}ms`);
}

main().catch((e) => {
  console.error('[build-codex] FATAL', e);
  process.exit(1);
});
