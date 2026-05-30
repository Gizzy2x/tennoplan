// ---------------------------------------------------------------------------
// Wiki passive ingest — pulls Module:Warframes/data from wiki.warframe.com
// and extracts pre-resolved passive prose per warframe.
//
// Why this exists:
//   WFCD's `passiveDescription` carries DE's raw |TOKEN| placeholders
//   ("Receive |STRENGTH|% Ability Strength..."). The wiki maintainers
//   resolve those into in-game prose ("Receive 5% Ability Strength..."), so
//   overriding with the wiki value gives readers the description they'd see
//   on the frame's actual passive tooltip.
//
// Behaviour:
//   • Best-effort. Any failure (network, schema drift, parse error) returns
//     an empty Map; the enricher falls back to WFCD's placeholder text.
//     The codex build never blocks on this.
//   • Wiki refresh rides the codex CI cron (every 6 h). No extra ops.
//
// Module shape (verified 2026-05-30, 119 warframes):
//   return {
//     Warframes = {                       ← group at indent 1
//       Ash = {                           ← name at indent 2
//         Passive = "Bleed effects ..." , ← field at indent 3
//         ...
//       },
//       ["Ash Prime"] = { ... },          ← bracket-quoted form for names with spaces
//     },
//     Archwings = { ... },
//     Necramechs = { ... },
//     Operators = { ... },
//   }
// ---------------------------------------------------------------------------

import { config } from '../config';
import { logger } from '../logger';
import { fetchWithRetry } from '../utils/http';

const log  = (msg: string, data?: unknown) => logger.info('wiki-passives', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn('wiki-passives', msg, data);

interface WikiApiResponse {
  query?: {
    pages?: Record<string, {
      revisions?: Array<{ slots?: { main?: { '*'?: string } } }>;
    }>;
  };
}

/**
 * Fetch + parse the wiki Lua module. Returns warframe-name → passive-prose.
 * Empty map on any failure — callers should treat absence as "no override,
 * use WFCD value".
 */
export async function fetchWikiPassives(): Promise<Map<string, string>> {
  const t0 = Date.now();
  try {
    const res = await fetchWithRetry(config.codex.wikiWarframesDataUrl, {
      timeoutMs: config.codex.fetchTimeoutMs,
      retries:   2,
    });
    const json = JSON.parse(res.text) as WikiApiResponse;
    const lua  = extractModuleSource(json);
    if (!lua) {
      warn('wiki response lacked module source — falling back to WFCD placeholders');
      return new Map();
    }
    const map = parsePassives(lua);
    log('fetched wiki passives', { ms: Date.now() - t0, count: map.size });
    return map;
  } catch (e) {
    warn('wiki passives fetch failed — falling back to WFCD placeholders', {
      error: e instanceof Error ? e.message : String(e),
    });
    return new Map();
  }
}

function extractModuleSource(json: WikiApiResponse): string | null {
  const pages = json.query?.pages;
  if (!pages) return null;
  for (const p of Object.values(pages)) {
    const text = p.revisions?.[0]?.slots?.main?.['*'];
    if (text) return text;
  }
  return null;
}

/**
 * Single forward scan. Tracks the most recent warframe-name opener (indent
 * 2). When a `Passive = "..."` field appears at indent 3, records
 * (owner → text). Exported for unit-test direct access.
 */
export function parsePassives(lua: string): Map<string, string> {
  const out = new Map<string, string>();
  let currentOwner: string | null = null;

  // Indent 2 (two tabs). Either bareword or bracket-quoted name.
  const ownerRe   = /^\t\t(?:([A-Za-z][\w]*)|\[\s*["']([^"']+)["']\s*\])\s*=\s*\{\s*$/;
  // Indent 3 (three tabs). Standard Lua string with backslash escapes.
  const passiveRe = /^\t\t\tPassive\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/;

  for (const line of lua.split('\n')) {
    const owner = ownerRe.exec(line);
    if (owner) {
      currentOwner = owner[1] ?? owner[2] ?? null;
      continue;
    }
    if (!currentOwner) continue;
    const passive = passiveRe.exec(line);
    if (passive && passive[1].length > 0) {
      out.set(currentOwner, unescapeLua(passive[1]));
    }
  }
  return out;
}

/**
 * Decode the handful of Lua string escapes that appear in wiki module text.
 * Single-pass so escaped backslashes don't decompose into spurious escapes.
 */
function unescapeLua(s: string): string {
  return s.replace(/\\([ntr"\\])/g, (_, c: string) => {
    switch (c) {
      case 'n':  return '\n';
      case 't':  return '\t';
      case 'r':  return '\r';
      case '"':  return '"';
      case '\\': return '\\';
      default:   return c;
    }
  });
}
