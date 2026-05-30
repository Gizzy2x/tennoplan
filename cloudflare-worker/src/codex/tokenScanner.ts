// ---------------------------------------------------------------------------
// Token scanner — sweeps the final codex blob for `<CODE>` glyph tokens
// (e.g. `<DT_SLASH_COLOR>`, `<HEALTH>`, `<RETRO_TM>`) and flags any that
// aren't registered in the frontend's `tennoIconMap.ts`.
//
// Purpose: the frontend silently strips unknown tokens. That's the right
// runtime behaviour (better than rendering broken markup) but it hides
// drift — if DE adds a new damage type or icon code, we wouldn't notice
// until a user reported "this row looks weird." The CI guard surfaces
// drift the day it appears in upstream data, so we can wire the missing
// glyph before it ever ships to users.
//
// Scope: every text field that the frontend renders prose into. Mirrors
// the audit tool that produced the initial coverage gap report.
//
// Output: list of unknown codes with per-code occurrence count and a
// sample item where each was found. Caller decides fail vs warn.
// ---------------------------------------------------------------------------

import type { TennoplanItem } from '../types';

/** Matches a single `<UPPER_SNAKE>` token. Anchored to the upper-case
 *  prefix so we don't pick up HTML tags. */
const TOKEN_RE = /<([A-Z][A-Z0-9_]*)>/g;

export interface UnknownTokenReport {
  /** The token as seen in the data, including angle brackets. */
  code:        string;
  /** How many times the token appears across all scanned text. */
  count:       number;
  /** Up to 3 item names where the token appears (for triage). */
  sampleItems: string[];
  /** A short surrounding-text excerpt (≤80 chars) for context. */
  sampleText:  string;
}

export interface TokenScanResult {
  /** Total unique codes seen in the scanned data (known + unknown). */
  totalUniqueCodes: number;
  /** Subset of the input known-set that actually appeared in data. */
  knownInUse:       string[];
  /** Codes seen but missing from the known-set. Empty = full coverage. */
  unknown:          UnknownTokenReport[];
}

/**
 * Scan every text field on every item for `<CODE>` tokens. Returns a
 * report; caller decides whether to fail / warn / ignore.
 */
export function scanCodexTokens(items: readonly TennoplanItem[], knownCodes: ReadonlySet<string>): TokenScanResult {
  const seen = new Map<string, { count: number; sampleItems: Set<string>; sampleText: string }>();

  const record = (code: string, itemName: string, text: string): void => {
    let rec = seen.get(code);
    if (!rec) {
      rec = { count: 0, sampleItems: new Set(), sampleText: '' };
      seen.set(code, rec);
    }
    rec.count++;
    if (rec.sampleItems.size < 3) rec.sampleItems.add(itemName);
    if (!rec.sampleText) {
      const ctx = new RegExp('.{0,30}<' + code.slice(1, -1) + '>.{0,30}').exec(text);
      if (ctx) rec.sampleText = ctx[0].replace(/\s+/g, ' ').trim();
    }
  };

  const scanText = (text: unknown, itemName: string): void => {
    if (typeof text !== 'string') return;
    TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      record(`<${m[1]}>`, itemName, text);
    }
  };

  for (const item of items) {
    const name = item.name ?? '(unknown)';
    scanText(item.description,        name);
    scanText(item.passiveDescription, name);

    if (Array.isArray(item.levelStats)) {
      for (const rank of item.levelStats) {
        if (!Array.isArray(rank)) continue;
        for (const line of rank) scanText(line, name);
      }
    }
    if (Array.isArray(item.abilities)) {
      for (const ab of item.abilities) {
        scanText(ab?.description, `${name} — ${ab?.name ?? '?'}`);
      }
    }
  }

  const all  = [...seen.keys()].sort();
  const known = all.filter((c) => knownCodes.has(c));

  const unknown: UnknownTokenReport[] = all
    .filter((c) => !knownCodes.has(c))
    .map((code) => {
      const rec = seen.get(code)!;
      return {
        code,
        count:       rec.count,
        sampleItems: [...rec.sampleItems],
        sampleText:  rec.sampleText,
      };
    })
    .sort((a, b) => b.count - a.count);

  return { totalUniqueCodes: all.length, knownInUse: known, unknown };
}

/**
 * Format an UnknownTokenReport[] as a human-readable string for CI logs.
 * Empty input → empty string (caller decides whether to surface).
 */
export function formatUnknownTokens(unknown: readonly UnknownTokenReport[]): string {
  if (unknown.length === 0) return '';
  const lines: string[] = [`Found ${unknown.length} unknown token code(s):`, ''];
  for (const r of unknown) {
    lines.push(`  ${r.code.padEnd(34)} ×${r.count}`);
    lines.push(`    appears in:  ${r.sampleItems.join(', ')}`);
    lines.push(`    context:     "${r.sampleText}"`);
    lines.push('');
  }
  lines.push('To resolve: drop the glyph into src/assets/tennoicons/<folder>/');
  lines.push('and add the code → asset URL entry in src/lib/tennoicons/tennoIconMap.ts.');
  lines.push('If the code is a flag (no glyph), add it to TENNOICON_FLAG_CODES instead.');
  return lines.join('\n');
}
