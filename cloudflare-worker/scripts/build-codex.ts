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
import { syntheticBuiltItems }  from '../src/codex/syntheticItems';
import { enrichCodex }          from '../src/codex/enricher';
import { loadPePlus }           from './lib/peplus';
import { applyPePlusAuthority } from './lib/peplusOverlay';
import { normalizeCodex }       from '../src/codex/normalizer';
import { validateCodex }        from '../src/codex/validator';
import { scanCodexTokens, formatUnknownTokens } from '../src/codex/tokenScanner';
import { loadKnownTokens }      from './lib/loadKnownTokens';
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

  // Inject synthetic codex entries for currencies WFCD doesn't model as items
  // (Endo, Credits, Kuva …) so live surfaces can deep-link to them. They flow
  // through enrich/normalize/validate as ordinary `component`-source rows.
  built.items.push(...syntheticBuiltItems());

  // ── 4. ENRICH ──
  const enriched = enrichCodex(built, parsed);

  // ── 4b. PUBLIC EXPORT PLUS AUTHORITY (Codex v2 phase A) ──
  // DE's own export overrides community-transcribed numbers on matched items
  // and synthesizes minimal entries for patch-day items WFCD hasn't shipped
  // yet. Layer-optional: package absent → identical WFCD-only build.
  // CI installs `warframe-public-export-plus@latest` right before this runs.
  const peplus = loadPePlus();
  if (peplus) {
    const overlay = applyPePlusAuthority(enriched.items, peplus);
    console.error(`[build-codex] PE+ v${overlay.peVersion}: matched ${JSON.stringify(overlay.matched)}, ` +
      `divergence ${JSON.stringify(overlay.statDivergence)}, synthesized ${overlay.synthesized} ` +
      `(gap ${JSON.stringify(overlay.peOnly)}), wfcd-only ${JSON.stringify(overlay.wfcdOnly)}`);
  } else {
    console.error('[build-codex] PE+ layer absent — WFCD-only build');
  }

  // ── 5. NORMALIZE ──
  const source: DataSource = peplus ? 'enriched' : 'wfcd';
  const version            = makeVersion(source);
  const generatedAt        = Date.now();
  const normalized         = normalizeCodex(enriched, { version, generatedAt, source });

  // ── 6. VALIDATE ──
  const validation = validateCodex(normalized);
  if (validation.report.fatal) {
    console.error('[build-codex] FATAL validation:', validation.report.notes);
    process.exit(1);
  }

  // ── 6b. TOKEN SCAN ──
  // Surface any `<CODE>` glyph tokens that appear in the data but aren't
  // wired in the frontend's tennoIconMap.ts. Fails the build so unknown
  // codes can't ship silently — see tokenScanner.ts for rationale.
  const knownTokens = loadKnownTokens();
  const scan        = scanCodexTokens(validation.items, knownTokens.all);
  console.error(`[build-codex] token scan: ${scan.totalUniqueCodes} unique codes (${scan.knownInUse.length} known, ${scan.unknown.length} unknown)`);
  if (scan.unknown.length > 0) {
    console.error('[build-codex] ' + formatUnknownTokens(scan.unknown));
    process.exit(1);
  }

  // ── 7. WRITE TO DISK ──
  const blob = JSON.stringify(validation.items);

  // SIZE GATE — KV rejects values over 27MiB (we saw 413s live). A healthy
  // filtered build is ~17MB; the blob only balloons when the warframestat
  // items API is down and the fetcher falls back to UNFILTERED GitHub-raw
  // payloads (2026-06-12: 31.8MB → 413 → failed publish). A fallback-bloated
  // build is degraded data anyway — fail it cleanly and keep serving the
  // last-good blob; the next post-recovery run publishes normally.
  const MAX_BLOB_BYTES = 24 * 1024 * 1024;
  if (blob.length > MAX_BLOB_BYTES) {
    console.error(`[build-codex] FATAL: blob ${blob.length} bytes exceeds ${MAX_BLOB_BYTES} ` +
      `(KV cap is 27MiB). This almost always means upstream primaries failed and the ` +
      `unfiltered GitHub fallback bloated the build — check the codex-fetcher warnings above. ` +
      `Refusing to publish degraded data.`);
    process.exit(1);
  }

  const etag = await makeEtag(blob);

  // Semantic content hash — the codex twin of the worldstate semantic etag.
  // The blob etag above moves EVERY build (normalizer stamps lastUpdated =
  // generatedAt on all 9k items), so it can't tell "new data" from "same
  // data, new build". Hashing with volatile fields zeroed and a stable sort
  // gives upload-codex a real change signal: identical data → identical
  // hash → skip the 17MB KV publish and clients keep 304ing.
  const semanticItems = validation.items
    .map((i) => ({ ...i, lastUpdated: 0, dataVersion: '' }))
    .sort((a, b) => a.uniqueName.localeCompare(b.uniqueName));
  const contentHash = await makeEtag(JSON.stringify(semanticItems));

  const metadata: SyncMetadata = {
    lastSync:   generatedAt,
    etag,
    version,
    source,
    quality:    validation.report.quality,
    errorCount: 0,
    itemCount:  validation.items.length,
    contentHash,
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
