// ---------------------------------------------------------------------------
// loadKnownTokens — extracts the set of known `<CODE>` tokens from the
// frontend's tennoIconMap.ts source file.
//
// Why source-scan instead of import:
//   tennoIconMap.ts pulls .png/.gif/.svg assets via Vite's path syntax;
//   Node/tsx can't resolve those imports during CI. Source-scanning the
//   three exported declarations (TENNOICON_MAP keys, TENNOICON_TEXT_TOKENS
//   keys, TENNOICON_FLAG_CODES) gives us the canonical code list without
//   executing the file.
//
// The regex is anchored to the exact syntactic shape used in the source.
// If the file is ever restructured (e.g. split, or shifted to a JSON
// import), update this loader in lockstep — there's an integration test
// that asserts the loader returns at least the damage-type baseline.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default path: this file lives in cloudflare-worker/scripts/lib/, the
 *  frontend map lives in the repo's src/lib/tennoicons/. Resolve relative
 *  to this file so the tool works regardless of cwd. */
const DEFAULT_MAP_PATH = resolve(__dirname, '..', '..', '..', 'src', 'lib', 'tennoicons', 'tennoIconMap.ts');

const RECORD_RE = (varName: string): RegExp =>
  new RegExp(`export const ${varName}[^=]*=\\s*\\{([\\s\\S]*?)^\\}`, 'm');

const SET_RE = (varName: string): RegExp =>
  new RegExp(`export const ${varName}\\s*=\\s*new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)`, 'm');

/** Pull single-quoted `<...>` literals out of a source fragment. */
function extractCodes(source: string, re: RegExp): string[] {
  const m = re.exec(source);
  if (!m) return [];
  return [...m[1].matchAll(/'(<[^>']+>)'/g)].map((x) => x[1]);
}

export interface KnownTokens {
  mapped:  Set<string>;
  textual: Set<string>;
  flags:   Set<string>;
  /** Union of all three — the convenient one to hand the scanner. */
  all:     Set<string>;
}

export function loadKnownTokens(mapPath: string = DEFAULT_MAP_PATH): KnownTokens {
  const src = readFileSync(mapPath, 'utf8');

  const mapped  = new Set(extractCodes(src, RECORD_RE('TENNOICON_MAP')));
  const textual = new Set(extractCodes(src, RECORD_RE('TENNOICON_TEXT_TOKENS')));
  const flags   = new Set(extractCodes(src, SET_RE('TENNOICON_FLAG_CODES')));
  const all     = new Set<string>([...mapped, ...textual, ...flags]);

  if (mapped.size === 0) {
    // Catastrophic: regex failed and the source file shape probably
    // changed. Better to fail loudly than to silently treat every token
    // in the data as unknown.
    throw new Error(
      `loadKnownTokens: extracted 0 TENNOICON_MAP entries from ${mapPath}. ` +
      `tennoIconMap.ts shape may have changed — update the loader regex.`,
    );
  }

  return { mapped, textual, flags, all };
}
