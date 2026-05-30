// ---------------------------------------------------------------------------
// Wiki warframe ingest — pulls Module:Warframes/data from wiki.warframe.com
// and extracts per-frame general info that WFCD doesn't provide (or that the
// wiki maintains more authoritatively).
//
// Why this exists:
//   • Passive prose — WFCD's `passiveDescription` carries DE's raw |TOKEN|
//     placeholders; the wiki has them pre-resolved.
//   • General info — Sex, Progenitor element, Subsumed (Helminth) ability,
//     Tactical ability, Themes, Playstyle, InitialEnergy, SellPrice. None
//     of these live in WFCD's /warframes payload.
//
// Behaviour:
//   • Best-effort. Any failure (network, schema drift, parse error) returns
//     an empty Map; downstream falls back to whatever WFCD provides. The
//     codex build never blocks on this.
//   • Wiki refresh rides the codex CI cron (every 6 h). No extra ops.
//
// Module shape (verified 2026-05-30, ~119 entries in Warframes group):
//   return {
//     Warframes = {                                        ← group at indent 1
//       Ash = {                                            ← name at indent 2
//         Sex = "Male",                                    ← field at indent 3
//         Passive = "Bleed effects ..." ,
//         Progenitor = "Radiation",
//         Subsumed = "Shuriken",
//         Tactical = "Smoke Screen",
//         Themes = "Assassin, Ninja",
//         Playstyle = { "Stealth", "Damage" },
//         SellPrice = 10000,
//         InitialEnergy = 50,
//         Health = 455, HealthRank30 = nil-or-number,
//         Shield = 270, ShieldRank30 = nil-or-number,
//         Energy = 100, EnergyRank30 = nil-or-number,
//         Armor  = 105, ArmorRank30  = nil-or-number,
//         ...
//       },
//       ["Ash Prime"] = { ... },                           ← bracket-quoted for spaces
//     },
//     Archwings = { ... }, Necramechs = { ... }, Operators = { ... },
//   }
//
// Module-level `Mastery` field exists but is always 0 on the entries that
// have it — wiki doesn't track warframe MR locks here. Skipped.
// ---------------------------------------------------------------------------

import { config } from '../config';
import { logger } from '../logger';
import { fetchWithRetry } from '../utils/http';

const log  = (msg: string, data?: unknown) => logger.info('wiki-warframes', msg, data);
const warn = (msg: string, data?: unknown) => logger.warn('wiki-warframes', msg, data);

interface WikiApiResponse {
  query?: {
    pages?: Record<string, {
      revisions?: Array<{ slots?: { main?: { '*'?: string } } }>;
    }>;
  };
}

/**
 * One wiki record per warframe — every field is independently optional so the
 * enricher can pick over it field by field.
 */
export interface WikiWarframeRecord {
  /** Pre-resolved passive prose (no |TOKEN| placeholders). */
  passive?:         string;
  /** "Male" | "Female" | "Non-binary" — verbatim from wiki. */
  sex?:             string;
  /** Helminth Subsumed ability name (e.g. "Shuriken"). */
  subsumedAbility?: string;
  /** Tactical Ability name — shown in railjack / squad UI (e.g. "Smoke Screen"). */
  tacticalAbility?: string;
  /** Progenitor element — drives Lich/Sister weapon roll (e.g. "Radiation"). */
  progenitorElement?: string;
  /** Comma-separated themes string (e.g. "Assassin, Ninja"). Kept as-is so
   *  frontend can choose to split or display verbatim. */
  themes?:          string;
  /** Playstyle tags (e.g. ["Stealth", "Damage"]). */
  playstyle?:       string[];
  /** Starting energy on spawn — independent of max Energy. */
  initialEnergy?:   number;
  /** Credit value when sold. */
  sellPrice?:       number;
  /** Explicit Rank-30 stat overrides; only present when wiki bothered to
   *  list them (otherwise the standard ×3 / ×1.5 formula applies, which is
   *  the frontend's call to make if it wants to display rank-30 values). */
  healthRank30?:    number;
  shieldRank30?:    number;
  energyRank30?:    number;
  armorRank30?:     number;
}

/**
 * Fetch + parse the wiki Lua module. Returns warframe-name → record.
 * Empty map on any failure.
 */
export async function fetchWikiWarframes(): Promise<Map<string, WikiWarframeRecord>> {
  const t0 = Date.now();
  try {
    const res = await fetchWithRetry(config.codex.wikiWarframesDataUrl, {
      timeoutMs: config.codex.fetchTimeoutMs,
      retries:   2,
    });
    const json = JSON.parse(res.text) as WikiApiResponse;
    const lua  = extractModuleSource(json);
    if (!lua) {
      warn('wiki response lacked module source — falling back to WFCD only');
      return new Map();
    }
    const map = parseWikiWarframes(lua);
    log('fetched wiki warframes', { ms: Date.now() - t0, count: map.size });
    return map;
  } catch (e) {
    warn('wiki warframes fetch failed — falling back to WFCD only', {
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
 * 2), accumulates fields at indent 3, flushes on the next opener. Exported
 * for unit-test access.
 */
export function parseWikiWarframes(lua: string): Map<string, WikiWarframeRecord> {
  const out = new Map<string, WikiWarframeRecord>();
  let currentOwner: string | null = null;
  let currentRecord: WikiWarframeRecord | null = null;

  const ownerRe = /^\t\t(?:([A-Za-z][\w]*)|\[\s*["']([^"']+)["']\s*\])\s*=\s*\{\s*$/;

  const flush = (): void => {
    if (currentOwner && currentRecord && hasAnyField(currentRecord)) {
      out.set(currentOwner, currentRecord);
    }
  };

  for (const line of lua.split('\n')) {
    const owner = ownerRe.exec(line);
    if (owner) {
      flush();
      currentOwner  = owner[1] ?? owner[2] ?? null;
      currentRecord = currentOwner ? {} : null;
      continue;
    }
    if (!currentRecord) continue;
    applyField(line, currentRecord);
  }
  flush();
  return out;
}

function hasAnyField(r: WikiWarframeRecord): boolean {
  return Object.keys(r).length > 0;
}

// ─── Field extractors ─────────────────────────────────────────────────────────
//
// All indent-3 fields. Each regex is anchored to indent 3 + field name so we
// don't pick up the same key on a different table. Quote-aware for strings;
// numeric for stats. Unknown / unsupported fields are ignored.

const STRING_FIELDS: Array<[RegExp, 'passive' | 'sex' | 'subsumedAbility' | 'tacticalAbility' | 'progenitorElement' | 'themes']> = [
  [/^\t\t\tPassive\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/,      'passive'],
  [/^\t\t\tSex\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/,           'sex'],
  [/^\t\t\tSubsumed\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/,      'subsumedAbility'],
  [/^\t\t\tTactical\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/,      'tacticalAbility'],
  [/^\t\t\tProgenitor\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/,    'progenitorElement'],
  [/^\t\t\tThemes\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/,        'themes'],
];

const NUMBER_FIELDS: Array<[RegExp, 'initialEnergy' | 'sellPrice' | 'healthRank30' | 'shieldRank30' | 'energyRank30' | 'armorRank30']> = [
  [/^\t\t\tInitialEnergy\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*$/,   'initialEnergy'],
  [/^\t\t\tSellPrice\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*$/,       'sellPrice'],
  [/^\t\t\tHealthRank30\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*$/,    'healthRank30'],
  [/^\t\t\tShieldRank30\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*$/,    'shieldRank30'],
  [/^\t\t\tEnergyRank30\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*$/,    'energyRank30'],
  [/^\t\t\tArmorRank30\s*=\s*(-?\d+(?:\.\d+)?)\s*,?\s*$/,     'armorRank30'],
];

// `Playstyle = { "Stealth", "Damage" }` — Lua array of strings.
const PLAYSTYLE_RE = /^\t\t\tPlaystyle\s*=\s*\{([^}]*)\}\s*,?\s*$/;

function applyField(line: string, record: WikiWarframeRecord): void {
  for (const [re, key] of STRING_FIELDS) {
    const m = re.exec(line);
    if (m && m[1].length > 0) {
      record[key] = unescapeLua(m[1]);
      return;
    }
  }
  for (const [re, key] of NUMBER_FIELDS) {
    const m = re.exec(line);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) record[key] = n;
      return;
    }
  }
  const ps = PLAYSTYLE_RE.exec(line);
  if (ps) {
    const items = [...ps[1].matchAll(/"((?:\\.|[^"\\])*)"/g)]
      .map(m => unescapeLua(m[1]))
      .filter(s => s.length > 0);
    if (items.length > 0) record.playstyle = items;
  }
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
