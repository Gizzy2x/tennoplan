// js/wikiContent.js — Static knowledge base loader.
// Loads wikiContent.json once at startup, caches it, exposes safe lookup functions.
// All functions return null (never throw) if the requested key doesn't exist.

let _cache = null;
let _loadPromise = null;

export async function loadWikiContent() {
  if (_cache) return _cache;
  if (_loadPromise) return _loadPromise;
  _loadPromise = fetch('./wikiContent.json')
    .then(r => { if (!r.ok) throw new Error('wikiContent fetch failed: ' + r.status); return r.json(); })
    .then(data => { _cache = data; _loadPromise = null; return data; })
    .catch(err => { console.error('[Tennoplan] wikiContent load failed:', err.message); _loadPromise = null; return null; });
  return _loadPromise;
}

// Returns the full wikiContent object, or null if not loaded yet.
export function getWikiContent() {
  return _cache;
}

// Get info for a mission type. key = 'Capture', 'Exterminate', etc.
export function getMissionType(key) {
  if (!_cache || !key) return null;
  return _cache.missionTypes?.[key] ?? null;
}

// Get info for a fissure tier. key = 'Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Omnia'
export function getFissureTier(key) {
  if (!_cache || !key) return null;
  return _cache.fissureTiers?.[key] ?? null;
}

// Get info for an enemy faction. key = 'Grineer', 'Corpus', 'Infested', etc.
export function getFaction(key) {
  if (!_cache || !key) return null;
  return _cache.factions?.[key] ?? null;
}

// Get info for a top-level game mode. key = 'voidFissures', 'arbitration', 'nightwave', etc.
export function getGameMode(key) {
  if (!_cache || !key) return null;
  return _cache.gameModes?.[key] ?? null;
}

// Get world cycle state info. location = 'cetus'|'vallis'|'cambion', state = 'day'|'night'|'warm'|'cold'|'fass'|'vome'
export function getCycleState(location, state) {
  if (!_cache || !location || !state) return null;
  return _cache.worldCycles?.[location]?.[state.toLowerCase()] ?? null;
}

// Get Nightwave act type info. key = 'daily'|'weekly'|'weekly elite'
export function getNightwaveActType(key) {
  if (!_cache || !key) return null;
  return _cache.nightwaveActTypes?.[key] ?? null;
}

// Get resource info. key = 'VoidTraces', 'VitusEssence', 'SteelEssence', 'Ducats', etc.
export function getResource(key) {
  if (!_cache || !key) return null;
  return _cache.resources?.[key] ?? null;
}

// Get the recommended frame list for a mission type, with live override support.
// Returns { frames: string[], reason: string, isLive: boolean } or null.
// liveOverrideFrames: optional string[] injected at runtime from arbitration buff data.
export function getRecommendedFrames(missionTypeKey, liveOverrideFrames = null) {
  if (!_cache || !missionTypeKey) return null;
  const mt = _cache.missionTypes?.[missionTypeKey];
  if (!mt?.recommendedFrames) return null;
  const rf = mt.recommendedFrames;
  if (liveOverrideFrames && liveOverrideFrames.length) {
    return { frames: liveOverrideFrames, reason: rf.reason, isLive: true };
  }
  return { frames: rf.general ?? [], reason: rf.reason ?? '', isLive: false };
}
