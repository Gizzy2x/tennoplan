/**
 * dropResolver — pure name → codex uniqueName resolution (frontend copy).
 *
 * This is the browser-side application of the SAME deterministic rule set proven
 * in CI (`cloudflare-worker/src/codex/dropResolver.ts`). It is NOT fuzzy name
 * matching — it is a fixed cascade of WFCD naming-convention transforms applied
 * against the canonical codex (db.tennoplanItems), producing a uniqueName that
 * every surface then keys on. Run once at drop read-time; the result is stamped
 * onto DropReward.uniqueName.
 *
 * ⚠ MIRROR of cloudflare-worker/src/codex/dropResolver.ts + syntheticItems.ts.
 * Keep the rule order and the synthetic table in sync with the CI copy. The CI
 * probe (analyze-drop-resolution.ts) is the coverage guardrail for the worker
 * side; this copy must encode the identical rules so browser and CI agree.
 *
 * Rule order (first hit wins), reported as `via`:
 *   exact → synthetic → quantity-strip → relic-state → blueprint-toggle →
 *   component-parent → alias
 */

import { SYNTHETIC_ITEMS } from '@/core/domain/syntheticItems';

export interface CodexNameEntry {
  name:       string;
  uniqueName: string;
}

export type ResolveVia =
  | 'exact'
  | 'synthetic'
  | 'quantity'
  | 'relic'
  | 'blueprint'
  | 'component'
  | 'alias';

export interface Resolution {
  uniqueName: string;
  via:        ResolveVia;
}

export interface DropResolver {
  resolve(rawName: string): Resolution | null;
}

// ─── Normalisation ──────────────────────────────────────────────────────────

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Strip leading quantity tokens, repeatedly: "2X 3,000 Credits Cache" →
 *  "credits cache". Real names starting with a number ("35mm Film") are safe —
 *  `\s+` needs whitespace after the count, and exact-match runs first. */
function stripQuantity(n: string): string {
  let s = n;
  for (;;) {
    const next = s.replace(/^\d[\d,]*\s*x?\s+/i, '').trim();
    if (next === s) return s;
    s = next;
  }
}

/** "meso x1 relic" → "meso x1 intact"; "lith c14 relic (radiant)" →
 *  "lith c14 radiant" (codex stores one entry per refinement state). */
const RELIC_RX = /^(lith|meso|neo|axi|requiem)\s+([a-z]+\d+)\s+relic(?:\s*\(([a-z]+)\))?$/i;
function relicToEntry(n: string): string | null {
  const m = RELIC_RX.exec(n);
  if (!m) return null;
  const state = (m[3] ?? 'intact').toLowerCase();
  return `${m[1]} ${m[2]} ${state}`;
}

/** Part nouns we can strip to fall back to the parent item. Longest first. */
const PART_SUFFIXES = [
  'left gauntlet', 'right gauntlet', 'lower limb', 'upper limb',
  'blueprint', 'neuroptics', 'systems', 'chassis', 'harness', 'wings',
  'carapace', 'cerebrum', 'barrel', 'receiver', 'stock', 'handle', 'blades',
  'blade', 'grip', 'string', 'link', 'chain', 'hilt', 'guard', 'rivet',
  'gauntlet', 'head', 'pouch', 'ornament', 'boots', 'boot', 'band', 'buckle',
  'disc', 'stars', 'star', 'limbs',
].sort((a, b) => b.length - a.length);

function stripPart(n: string): string | null {
  for (const p of PART_SUFFIXES) {
    if (n.endsWith(' ' + p)) return n.slice(0, n.length - p.length - 1).trim();
  }
  return null;
}

/** Synthetic codex entries (currencies WFCD doesn't model) — single source in
 *  core/domain/syntheticItems. Matched on the normalized + quantity-stripped
 *  drop name. */
const SYNTHETIC: ReadonlyArray<{ uniqueName: string; match: readonly RegExp[] }> =
  SYNTHETIC_ITEMS.map((s) => ({ uniqueName: s.uniqueName, match: s.match }));

/** Residual hand aliases — keep TINY. normalized name → uniqueName. */
const ALIASES: Record<string, string> = {};

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildDropResolver(items: readonly CodexNameEntry[]): DropResolver {
  const byName = new Map<string, string>();
  for (const it of items) {
    const k = norm(it.name);
    if (!byName.has(k)) byName.set(k, it.uniqueName);
  }

  function matchSynthetic(n: string): string | null {
    for (const s of SYNTHETIC) {
      for (const rx of s.match) if (rx.test(n)) return s.uniqueName;
    }
    return null;
  }

  function resolve(raw: string): Resolution | null {
    const n = norm(raw);
    const q = stripQuantity(n);
    let u: string | undefined;

    // 1. exact
    u = byName.get(n);
    if (u) return { uniqueName: u, via: 'exact' };

    // 2. synthetic (raw or quantity-stripped)
    const syn = matchSynthetic(n) ?? (q !== n ? matchSynthetic(q) : null);
    if (syn) return { uniqueName: syn, via: 'synthetic' };

    // 3. quantity-strip then exact
    if (q !== n) {
      u = byName.get(q);
      if (u) return { uniqueName: u, via: 'quantity' };
    }

    // 4. relic → refinement entry
    const relic = relicToEntry(n);
    if (relic) {
      u = byName.get(relic);
      if (u) return { uniqueName: u, via: 'relic' };
    }

    // 5. blueprint suffix toggle
    if (n.endsWith(' blueprint')) {
      u = byName.get(n.slice(0, -' blueprint'.length).trim());
      if (u) return { uniqueName: u, via: 'blueprint' };
    } else {
      u = byName.get(n + ' blueprint');
      if (u) return { uniqueName: u, via: 'blueprint' };
    }

    // 6. component parent fallback (raw + quantity-stripped)
    for (const cand of q !== n ? [n, q] : [n]) {
      const parent = stripPart(cand);
      if (parent) {
        u = byName.get(parent);
        if (u) return { uniqueName: u, via: 'component' };
      }
    }

    // 7. hand alias
    const a = ALIASES[n];
    if (a) return { uniqueName: a, via: 'alias' };

    return null;
  }

  return { resolve };
}
