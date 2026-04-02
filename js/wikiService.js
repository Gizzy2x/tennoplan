// js/wikiService.js — Wiki data service. The backend pillar for all item/frame/concept lookups.
//
// Priority stack for any query:
//   1. Session memory cache  (Map, lives for page lifetime, zero latency)
//   2. localStorage cache    (6 h TTL, survives page reload)
//   3. wikiContent.json      (static curated data — resources, missions, factions, etc.)
//   4. warframestat.us       /items/search/{query}  (structured JSON, primary live source)
//   5. Fandom MediaWiki API  (intro extract — fallback for anything ws doesn't cover)
//
// Public API:
//   wikiLookup(query)              → Promise<WikiResult | null>   best single match
//   wikiSearch(query, {limit})     → Promise<WikiResult[]>        list for search UI
//   getStaticResource(name)        → WikiResult | null            instant, no network
//   clearWikiCache()               → void                         dev / manual reset

import { getWikiContent } from './wikiContent.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const WS_BASE      = 'https://api.warframestat.us';
const FANDOM_BASE  = 'https://warframe.fandom.com/api.php';
const CACHE_KEY    = 'wf-wikisvc-v1';
const CACHE_TTL    = 6 * 3600 * 1000;   // 6 hours
const FETCH_TIMEOUT = 8000;             // ms per request

// ── WikiResult shape ──────────────────────────────────────────────────────────
// Every lookup returns this shape (or null). Consumers only need to check for
// null — they never need to know whether the data came from ws, fandom, or static.
//
// {
//   name        : string
//   type        : string          e.g. 'Warframe', 'Misc', 'Resource', 'Melee', …
//   description : string | null
//   howToGet    : string | null   curated — where / how to obtain this item
//   howToUse    : string | null   curated — how to spend / equip / use this item
//   tradable    : boolean | null
//   masteryReq  : number | null
//   wikiUrl     : string
//   components  : string[]        crafting parts
//   drops       : DropEntry[]     from warframestat.us drops[]
//   abilities   : Ability[]       warframes only
//   stats       : FrameStats | null
//   source      : 'static' | 'ws' | 'fandom' | 'merged'
// }

// ── Session memory cache ──────────────────────────────────────────────────────
const _mem = new Map();

// ── localStorage cache helpers ────────────────────────────────────────────────
function _readDisk() {
  try   { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function _writeDisk(store) {
  try   { localStorage.setItem(CACHE_KEY, JSON.stringify(store)); }
  catch { /* quota exceeded — keep in memory only */ }
}
function _getDisk(key) {
  const entry = _readDisk()[key];
  if (!entry || Date.now() - entry.ts > CACHE_TTL) return null;
  return entry.data;
}
function _setDisk(key, data) {
  const store = _readDisk();
  // Prune stale entries before writing to keep storage lean
  for (const k of Object.keys(store)) {
    if (Date.now() - store[k].ts > CACHE_TTL) delete store[k];
  }
  store[key] = { data, ts: Date.now() };
  _writeDisk(store);
}
function _memKey(query) {
  return String(query).toLowerCase().trim();
}

// ── Fetch with abort timeout ──────────────────────────────────────────────────
async function _tFetch(url, ms = FETCH_TIMEOUT) {
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch(e) {
    clearTimeout(t);
    throw e;
  }
}

// ── Normalise a warframestat.us item object into WikiResult shape ──────────────
function _normaliseWS(raw) {
  const wikiUrl = raw.wikiaUrl
    || `https://warframe.fandom.com/wiki/${encodeURIComponent((raw.name || '').replace(/\s+/g, '_'))}`;
  return {
    name:        raw.name         || raw.uniqueName || 'Unknown',
    type:        raw.type         || raw.category   || '',
    description: raw.description  ? String(raw.description).replace(/<[^>]+>/g, '').trim() : null,
    howToGet:    null,
    howToUse:    null,
    tradable:    raw.tradable      ?? null,
    masteryReq:  raw.masteryReq    ?? null,
    wikiUrl,
    components:  Array.isArray(raw.components)
      ? raw.components.map(c => c.name).filter(Boolean)
      : [],
    drops: Array.isArray(raw.drops)
      ? raw.drops.slice(0, 8).map(d => ({
          location: d.location || '',
          type:     d.type     || '',
          rarity:   d.rarity   || '',
          chance:   d.chance   ?? null,
        }))
      : [],
    abilities: Array.isArray(raw.abilities)
      ? raw.abilities.slice(0, 4).map(a => ({
          name:        a.name        || '',
          description: a.description ? String(a.description).replace(/<[^>]+>/g, '').trim() : '',
        }))
      : [],
    stats: raw.health != null ? {
      health: raw.health,
      shield: raw.shield ?? 0,
      armor:  raw.armor  ?? 0,
      energy: raw.energy ?? 0,
      sprint: raw.sprintSpeed ?? null,
    } : null,
    source: 'ws',
  };
}

// ── warframestat.us /items/search ─────────────────────────────────────────────
async function _wsSearch(query) {
  try {
    const data = await _tFetch(
      `${WS_BASE}/items/search/${encodeURIComponent(query)}?language=en`
    );
    return Array.isArray(data) ? data.map(_normaliseWS) : [];
  } catch(e) {
    console.warn('[wikiService] warframestat search failed:', e.message);
    return [];
  }
}

// ── Fandom MediaWiki intro extract ────────────────────────────────────────────
async function _fandomExtract(title) {
  try {
    const data = await _tFetch(
      `${FANDOM_BASE}?action=query&titles=${encodeURIComponent(title)}`
      + `&prop=extracts&exintro=true&exsentences=3&format=json&origin=*`,
      6000
    );
    const pages   = data?.query?.pages ?? {};
    const page    = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return null;
    const extract = (page.extract || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return extract || null;
  } catch(e) {
    console.warn('[wikiService] Fandom extract failed:', e.message);
    return null;
  }
}

// ── Static wikiContent.json lookup ───────────────────────────────────────────
// Checks the curated `resources` section — instant, no network call.
function _staticResource(query) {
  const wc = getWikiContent();
  if (!wc?.resources) return null;
  const lower = query.toLowerCase().trim();
  for (const [key, val] of Object.entries(wc.resources)) {
    if (key.toLowerCase() === lower) {
      return {
        name:        key,
        type:        val.type       || 'Resource',
        description: val.summary    || null,
        howToGet:    val.howToGet   || null,
        howToUse:    val.howToUse   || null,
        tradable:    val.tradable   ?? null,
        masteryReq:  null,
        wikiUrl:     val.wikiUrl
          || `https://warframe.fandom.com/wiki/${encodeURIComponent(key.replace(/\s+/g, '_'))}`,
        components: [],
        drops:      [],
        abilities:  [],
        stats:      null,
        source:     'static',
      };
    }
  }
  return null;
}

// Also expose static lookups for missionTypes / factions / worldCycles
// so other modules can drive Know More panels through this service too.
function _staticGeneric(query) {
  const wc = getWikiContent();
  if (!wc) return null;
  const lower = query.toLowerCase().trim();

  // mission types
  const mt = wc.missionTypes?.[query] || wc.missionTypes?.[
    Object.keys(wc.missionTypes || {}).find(k => k.toLowerCase() === lower)
  ];
  if (mt) return {
    name: query, type: 'Mission Type', description: mt.summary || null,
    howToGet: null, howToUse: null, tradable: null, masteryReq: null,
    wikiUrl: mt.wikiUrl || `https://warframe.fandom.com/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
    components: [], drops: [], abilities: [], stats: null, source: 'static',
  };

  // factions
  const fac = wc.factions?.[query] || wc.factions?.[
    Object.keys(wc.factions || {}).find(k => k.toLowerCase() === lower)
  ];
  if (fac) return {
    name: query, type: 'Faction', description: fac.summary || null,
    howToGet: null, howToUse: null, tradable: null, masteryReq: null,
    wikiUrl: `https://warframe.fandom.com/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
    components: [], drops: [], abilities: [], stats: null, source: 'static',
  };

  return null;
}

// ── Best-match picker ─────────────────────────────────────────────────────────
function _pickBest(query, results) {
  if (!results.length) return null;
  const lower = query.toLowerCase();
  return results.find(r => r.name.toLowerCase() === lower)
      || results.find(r => r.name.toLowerCase().startsWith(lower))
      || results[0];
}

// ── Public: wikiLookup ────────────────────────────────────────────────────────
/**
 * Get the best single wiki result for a query.
 * Used when clicking a known item name (reward chip, Steel Path reward, etc.)
 * @param {string} query
 * @returns {Promise<WikiResult | null>}
 */
export async function wikiLookup(query) {
  if (!query?.trim()) return null;
  const key = _memKey(query);

  // 1. Memory
  if (_mem.has(key)) return _mem.get(key);

  // 2. Disk
  const cached = _getDisk(key);
  if (cached) { _mem.set(key, cached); return cached; }

  // 3. Static resource (instant)
  const staticRes = _staticResource(query) || _staticGeneric(query);

  // 4. warframestat.us live search
  const wsResults = await _wsSearch(query);
  let result = null;

  if (wsResults.length) {
    result = _pickBest(query, wsResults);
    // Merge curated howToGet / howToUse from static if available
    if (staticRes) {
      result = {
        ...result,
        howToGet:    staticRes.howToGet    || result.howToGet,
        howToUse:    staticRes.howToUse    || result.howToUse,
        description: result.description   || staticRes.description,
        source:      'merged',
      };
    }
  } else if (staticRes) {
    // No live results — use static, optionally enrich description from Fandom
    result = staticRes;
    if (!result.description) {
      const extract = await _fandomExtract(query);
      if (extract) result = { ...result, description: extract, source: 'merged' };
    }
  } else {
    // 5. Fandom fallback
    const extract = await _fandomExtract(query);
    if (extract) {
      result = {
        name: query, type: '', description: extract,
        howToGet: null, howToUse: null, tradable: null, masteryReq: null,
        wikiUrl: `https://warframe.fandom.com/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
        components: [], drops: [], abilities: [], stats: null,
        source: 'fandom',
      };
    }
  }

  _mem.set(key, result);
  if (result) _setDisk(key, result);
  return result;
}

// ── Public: wikiSearch ────────────────────────────────────────────────────────
/**
 * Return up to `limit` results for a partial query.
 * Used by the search input in the wiki panel — returns a list, not a single match.
 * @param {string} query
 * @param {{ limit?: number }} opts
 * @returns {Promise<WikiResult[]>}
 */
export async function wikiSearch(query, { limit = 6 } = {}) {
  if (!query?.trim()) return [];
  const key = 'search:' + _memKey(query);

  if (_mem.has(key)) return _mem.get(key);
  const cached = _getDisk(key);
  if (cached) { _mem.set(key, cached); return cached; }

  const results = (await _wsSearch(query)).slice(0, limit);
  _mem.set(key, results);
  if (results.length) _setDisk(key, results);
  return results;
}

// ── Public: getStaticResource ─────────────────────────────────────────────────
/**
 * Synchronous lookup against wikiContent.json resources only.
 * Zero latency — use when you need instant data without waiting for a Promise.
 * Returns null if wikiContent hasn't loaded yet or item isn't in the static set.
 * @param {string} name
 * @returns {WikiResult | null}
 */
export function getStaticResource(name) {
  return _staticResource(name) || _staticGeneric(name);
}

// ── Public: clearWikiCache ────────────────────────────────────────────────────
export function clearWikiCache() {
  _mem.clear();
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
