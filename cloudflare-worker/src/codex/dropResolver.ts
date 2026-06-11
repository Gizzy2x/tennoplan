// ---------------------------------------------------------------------------
// dropResolver.ts — name → codex uniqueName resolution (Phase 0, step 0c).
//
// THE join. A live surface (bounty board, fissure reward, …) only ever knows a
// reward's DISPLAY NAME. The codex is keyed by uniqueName. This module turns the
// 32% exact-match gap (measured in analyze-drop-resolution.ts) into ~98% by
// applying a small, deterministic rule cascade — NOT a hand-curated lookup.
//
// Rule order (first hit wins), with the `via` it reports:
//   1. exact      — name matches a codex entry verbatim
//   2. synthetic  — Endo / Credits / Kuva etc. (see syntheticItems.ts)
//   3. quantity   — strip a leading count: "2X Gallium"→Gallium, "5,000 X"→X
//   4. relic      — "Meso X1 Relic" → the "Meso X1 Intact" entry
//   5. blueprint  — toggle a trailing " Blueprint" suffix
//   6. component  — strip a part noun → parent item ("Fang Prime Handle"→Fang Prime)
//   7. alias      — residual hand map for true oddities (kept tiny + visible)
//
// Pure + dependency-light: built once from the codex item list, then `resolve()`
// is O(1)-ish per name. The unresolved remainder is surfaced as a report so the
// alias map / synthetic list stay bounded (same model as tokenScanner).
// ---------------------------------------------------------------------------

import type { BuiltItem } from './builder';
import { SYNTHETIC_ITEMS } from './syntheticItems';

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

/** Strip leading quantity tokens, repeatedly: handles stacked prefixes like
 *  "2X 3,000 Credits Cache" → "credits cache". A real name starting with a
 *  number ("35mm Film") is untouched — `\s+` requires whitespace after the
 *  count, and exact-match runs before this anyway. */
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

/** Part nouns we can strip to fall back to the parent item. Longest first so
 *  "left gauntlet" is tried before "gauntlet". */
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

/** Residual hand aliases — keep this TINY. normalized name → uniqueName. */
const ALIASES: Record<string, string> = {
  // (intentionally empty at first; the unresolved report seeds genuine entries)
};

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildDropResolver(items: readonly BuiltItem[]): DropResolver {
  const byName = new Map<string, string>();
  for (const it of items) {
    const k = norm(it.name);
    if (!byName.has(k)) byName.set(k, it.uniqueName);
  }

  function matchSynthetic(n: string): string | null {
    for (const s of SYNTHETIC_ITEMS) {
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

    // 6. component parent fallback (try both raw + quantity-stripped)
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
