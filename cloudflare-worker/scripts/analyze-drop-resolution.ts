// ---------------------------------------------------------------------------
// analyze-drop-resolution.ts — drop → codex coverage probe (Phase 0, 0b/0c).
//
// Runs the real pipeline (fetch → parse → build + synthetic injection), then
// resolves every distinct drop-reward name through the dropResolver cascade and
// reports coverage — overall AND for bounty-source rewards (Celestial Pendulum
// proving ground). Writes the full unresolved list to
// dist/codex/drop-resolution-report.json to seed aliases / synthetics.
//
// Read-only: mutates no shipped data.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchAllCodexSources } from '../src/codex/fetcher';
import { parseCodex }           from '../src/codex/parser';
import { buildCodex }           from '../src/codex/builder';
import { syntheticBuiltItems }  from '../src/codex/syntheticItems';
import { buildDropResolver, type ResolveVia } from '../src/codex/dropResolver';
import type { ParsedDrop }      from '../src/codex/parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = resolve(__dirname, '..', 'dist', 'codex', 'drop-resolution-report.json');

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');
const pct  = (n: number, d: number): string => (d === 0 ? '0.0%' : `${((n / d) * 100).toFixed(1)}%`);

interface UnresolvedRow { name: string; count: number; sources: string[]; inBounty: boolean }

async function main(): Promise<void> {
  console.error('[analyze] fetching sources…');
  const parsed = parseCodex(await fetchAllCodexSources());
  const built  = buildCodex(parsed);
  built.items.push(...syntheticBuiltItems());

  const resolver = buildDropResolver(built.items);

  // Aggregate distinct drop names with source buckets + counts.
  const byName = new Map<string, { count: number; sources: Set<string>; inBounty: boolean; orig: string }>();
  for (const d of parsed.allDrops as ParsedDrop[]) {
    const key = norm(d.itemName);
    const e = byName.get(key) ?? { count: 0, sources: new Set<string>(), inBounty: false, orig: d.itemName.trim() };
    e.count += 1;
    e.sources.add(d.source);
    if (d.source === 'bounty') e.inBounty = true;
    byName.set(key, e);
  }

  const viaCounts: Record<ResolveVia, number> = {
    exact: 0, synthetic: 0, quantity: 0, relic: 0, blueprint: 0, component: 0, alias: 0,
  };
  const unresolved: UnresolvedRow[] = [];
  let resolved = 0, bountyTotal = 0, bountyResolved = 0;

  for (const [, info] of byName) {
    if (info.inBounty) bountyTotal += 1;
    const r = resolver.resolve(info.orig);
    if (r) {
      resolved += 1;
      viaCounts[r.via] += 1;
      if (info.inBounty) bountyResolved += 1;
    } else {
      unresolved.push({ name: info.orig, count: info.count, sources: [...info.sources].sort(), inBounty: info.inBounty });
    }
  }

  unresolved.sort((a, b) => (a.inBounty !== b.inBounty ? (a.inBounty ? -1 : 1) : b.count - a.count));
  const total = byName.size;
  const bountyUnresolved = unresolved.filter((u) => u.inBounty);

  console.error('');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('  DROP → CODEX RESOLUTION (resolver cascade)');
  console.error('═══════════════════════════════════════════════════════════');
  console.error(`  Codex items (built + synthetic): ${built.items.length}`);
  console.error(`  Distinct drop reward names:      ${total}`);
  console.error(`  RESOLVED:                        ${resolved}  (${pct(resolved, total)})`);
  console.error(`  UNRESOLVED:                      ${unresolved.length}  (${pct(unresolved.length, total)})`);
  console.error('  ── by rule ──');
  for (const via of Object.keys(viaCounts) as ResolveVia[]) {
    console.error(`     ${via.padEnd(10)} ${viaCounts[via]}`);
  }
  console.error('  ─────────────────────────────────────────────────────────');
  console.error('  BOUNTY rewards (Celestial proving ground):');
  console.error(`     resolved:   ${bountyResolved}/${bountyTotal}  (${pct(bountyResolved, bountyTotal)})`);
  console.error(`     unresolved: ${bountyUnresolved.length}`);
  console.error('═══════════════════════════════════════════════════════════');
  console.error('');
  console.error('  Remaining unresolved (bounty-first, top 40):');
  for (const u of unresolved.slice(0, 40)) {
    console.error(`    [${u.inBounty ? 'BOUNTY' : '      '}] ×${String(u.count).padStart(3)}  ${u.name}   {${u.sources.join(',')}}`);
  }
  console.error('');

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    codexItems: built.items.length,
    distinctDropNames: total,
    resolved, unresolvedCount: unresolved.length,
    viaCounts,
    bounty: { total: bountyTotal, resolved: bountyResolved, unresolved: bountyUnresolved.length },
    unresolved,
  }, null, 2), 'utf8');
  console.error(`[analyze] full report → ${OUT_FILE}`);
}

main().catch((e) => { console.error('[analyze] FATAL', e); process.exit(1); });
