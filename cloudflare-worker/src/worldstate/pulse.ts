// ---------------------------------------------------------------------------
// Pulse diff engine — runs inside the cron commit, compares the previous
// worldstate snapshot against the new one and produces the PulseHead that
// rides worldstate:metadata (zero extra KV writes).
//
// Two jobs:
//
// 1. SEMANTIC ETAG. The raw blob etag changes every tick because the parser
//    embeds clock fields (timestamp, timeLeft, cyclesRemaining). A head built
//    on that etag would tell clients "something changed" every 5 minutes and
//    the two-stage poll would save nothing. So we hash a projection of the
//    UNPREDICTABLE fields only:
//      • fissure / alert / invasion id sets (not progress — it moves constantly)
//      • sortie / archon / arbitration / baro / nightwave / simaris identity
//      • bounty rotation expiries (per syndicate)
//      • Zariman + Duviri anchors (variable-period — anchors ARE information)
//    Fixed-period cycle anchors (Cetus/Vallis/Cambion/Earth) are EXCLUDED:
//    clients compute those locally from any past anchor + known durations.
//
// 2. SPAWN-ONLY EVENTS. Expiries are local math on the client (it already
//    holds the expiry timestamps), so disappearances never enter the diff.
//    Only genuinely new information becomes an event.
//
// Drift guard: if a fixed-period cycle's upstream anchor deviates from our
// own projection by more than DRIFT_TOLERANCE_MS (DE hotfix changed the
// schedule), the new anchor is pulled INTO the semantic hash and a
// cycle-anchor-changed event fires — clients refetch and re-anchor. This is
// the safety net that keeps local cycle math honest.
// ---------------------------------------------------------------------------

import type { ParsedWorldstate, CycleInfo, PulseHead, PulseEvent } from '../types';
import { makeEtag } from '../storage/metadata';
import { projectFromCache } from './fallback';

/** Max deviation between projected and upstream expiry before we re-anchor. */
const DRIFT_TOLERANCE_MS = 90_000;

/** Events ring cap — newest first. Sized to keep /v1/pulse comfortably sub-2KB. */
const MAX_EVENTS = 24;

// ─── Public entry ─────────────────────────────────────────────────────────────

/**
 * Build the new PulseHead. `prev`/`prevHead` are null on cold start (first
 * tick after deploy) — that yields seq=1, lastChange=now, empty event ring.
 */
export async function buildPulse(
  prev: ParsedWorldstate | null,
  next: ParsedWorldstate,
  prevHead: PulseHead | null,
  now: number,
): Promise<PulseHead> {
  const drifted     = prev ? detectCycleDrift(prev, next, now) : [];
  const projection  = semanticProjection(next, drifted);
  const semanticEtag = await makeEtag(projection);

  const changed = semanticEtag !== prevHead?.semanticEtag;
  const events  = prev && changed
    ? [...diffEvents(prev, next, drifted, now), ...(prevHead?.events ?? [])].slice(0, MAX_EVENTS)
    : prevHead?.events ?? [];

  return {
    semanticEtag,
    lastChange: changed ? now : prevHead?.lastChange ?? now,
    lastSync:   now,
    seq:        (prevHead?.seq ?? 0) + (changed ? 1 : 0),
    counts: {
      fissures:  next.fissures.length,
      alerts:    next.alerts.length,
      invasions: next.invasions.length,
    },
    events,
  };
}

// ─── Semantic projection ──────────────────────────────────────────────────────

/**
 * Deterministic string over the unpredictable worldstate fields. Id lists are
 * sorted so upstream array-order churn never moves the etag.
 */
function semanticProjection(ws: ParsedWorldstate, driftedAnchors: DriftedCycle[]): string {
  return JSON.stringify({
    fissures:  ws.fissures.map(f => f.id).sort(),
    alerts:    ws.alerts.map(a => a.id).sort(),
    invasions: ws.invasions.map(i => i.id).sort(),
    sortie:      ws.sortie?.id ?? null,
    archon:      ws.archonHunt?.id ?? null,
    arbitration: ws.arbitration ? `${ws.arbitration.node}:${ws.arbitration.expiry}` : null,
    baro:        ws.baro ? `${ws.baro.id}:${ws.baro.presence}` : null,
    nightwave:   ws.nightwave
      ? `${ws.nightwave.season}:${ws.nightwave.challenges.map(c => c.id).sort().join(',')}`
      : null,
    bounties:    (ws.syndicateMissions ?? []).map(s => `${s.syndicate}:${s.expiry}`).sort(),
    simaris:     ws.simaris?.activeSynthesisTarget?.name ?? null,
    archimedeas: (ws.archimedeas ?? []).map(a => `${a.type ?? ''}:${a.expiry}`).sort(),

    // Variable-period cycles — anchors are real information.
    zariman: cycleKey(ws.zarimanCycle),
    duviri:  `${cycleKey(ws.duviriCycle)}:${ws.duviriCycle.mood ?? ''}`
           + `:${(ws.duviriCycle.circuit?.normal ?? []).join(',')}`
           + `|${(ws.duviriCycle.circuit?.hard ?? []).join(',')}`,

    // Fixed-period anchors enter the hash ONLY when they deviated from
    // prediction — forces a client refetch + re-anchor.
    drifted: driftedAnchors.map(d => `${d.id}:${d.expiry}`).sort(),
  });
}

function cycleKey(c: CycleInfo): string {
  return `${c.activation}:${c.expiry}:${c.state ?? ''}`;
}

// ─── Cycle drift guard ────────────────────────────────────────────────────────

interface DriftedCycle { id: string; expiry: number }

/**
 * Detect whether a fixed-period cycle's SCHEDULE shifted (DE hotfix) — the
 * only case where local client math goes wrong.
 *
 * Both snapshots are projected forward to `now` before comparing. Comparing
 * projected-prev against RAW next would false-positive whenever a short
 * cycle flips between ticks or upstream serves a stale window (a known
 * warframestat quirk): prev walks into the new window while next still
 * reports the old one, and the 20-minute "deviation" is just the phase
 * length. A consistent schedule projects identically from either snapshot;
 * a genuine anchor shift survives projection. Drift self-clears one tick
 * after detection because the shifted snapshot becomes prev.
 */
function detectCycleDrift(prev: ParsedWorldstate, next: ParsedWorldstate, now: number): DriftedCycle[] {
  const projectedPrev = projectFromCache(prev, now);
  const projectedNext = projectFromCache(next, now);
  const out: DriftedCycle[] = [];

  const check = (id: string, p: CycleInfo | undefined, n: CycleInfo | undefined) => {
    if (!p?.expiry || !n?.expiry) return;
    if (Math.abs(p.expiry - n.expiry) > DRIFT_TOLERANCE_MS) out.push({ id, expiry: n.expiry });
  };

  check('cetus',   projectedPrev.cetusCycle,        projectedNext.cetusCycle);
  check('vallis',  projectedPrev.orbVallisCycle,    projectedNext.orbVallisCycle);
  check('cambion', projectedPrev.cambionDriftCycle, projectedNext.cambionDriftCycle);
  check('earth',   projectedPrev.earthCycle,        projectedNext.earthCycle);
  return out;
}

// ─── Spawn-only event diff ────────────────────────────────────────────────────

function diffEvents(
  prev: ParsedWorldstate,
  next: ParsedWorldstate,
  drifted: DriftedCycle[],
  now: number,
): PulseEvent[] {
  const events: PulseEvent[] = [];

  // Fissures / alerts / invasions — new ids only.
  const prevFissures = new Set(prev.fissures.map(f => f.id));
  for (const f of next.fissures) {
    if (prevFissures.has(f.id)) continue;
    events.push({
      kind: 'fissure-spawned',
      id:   f.id,
      at:   now,
      label: `${f.tier}${f.isHard ? ' (SP)' : ''}${f.isStorm ? ' (Storm)' : ''} ${f.missionType} — ${f.node}`,
    });
  }

  const prevAlerts = new Set(prev.alerts.map(a => a.id));
  for (const a of next.alerts) {
    if (prevAlerts.has(a.id)) continue;
    events.push({ kind: 'alert-spawned', id: a.id, at: now, label: `${a.missionType} — ${a.node}` });
  }

  const prevInvasions = new Set(prev.invasions.map(i => i.id));
  for (const i of next.invasions) {
    if (prevInvasions.has(i.id)) continue;
    events.push({ kind: 'invasion-spawned', id: i.id, at: now, label: `${i.attacking} vs ${i.defending} — ${i.node}` });
  }

  // Bounty rotation — a syndicate's expiry moved means a fresh board.
  const prevBoards = new Map((prev.syndicateMissions ?? []).map(s => [s.syndicate, s.expiry]));
  for (const s of next.syndicateMissions ?? []) {
    const old = prevBoards.get(s.syndicate);
    if (old !== undefined && old !== s.expiry) {
      events.push({ kind: 'bounty-rotated', id: s.syndicate, at: now, label: `${s.syndicate} board rotated` });
    }
  }

  // Daily/weekly singletons.
  if (next.sortie && next.sortie.id !== prev.sortie?.id) {
    events.push({ kind: 'sortie-changed', id: next.sortie.id, at: now });
  }
  if (next.archonHunt && next.archonHunt.id !== prev.archonHunt?.id) {
    events.push({ kind: 'archon-changed', id: next.archonHunt.id, at: now, label: next.archonHunt.boss });
  }

  // Baro — presence flip only.
  if (next.baro && prev.baro && next.baro.presence !== prev.baro.presence) {
    events.push({
      kind: next.baro.presence === 'at_location' ? 'baro-arrived' : 'baro-departed',
      id:   next.baro.id,
      at:   now,
      label: next.baro.location,
    });
  }

  // Nightwave — challenge set changed (daily rotation).
  const prevNw = prev.nightwave?.challenges.map(c => c.id).sort().join(',') ?? '';
  const nextNw = next.nightwave?.challenges.map(c => c.id).sort().join(',') ?? '';
  if (next.nightwave && prevNw !== nextNw) {
    events.push({ kind: 'nightwave-changed', id: String(next.nightwave.season), at: now });
  }

  // Drift guard hits.
  for (const d of drifted) {
    events.push({ kind: 'cycle-anchor-changed', id: d.id, at: now, label: `${d.id} schedule shifted upstream` });
  }

  return events;
}
