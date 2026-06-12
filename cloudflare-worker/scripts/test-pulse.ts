// ---------------------------------------------------------------------------
// Pulse diff engine — deterministic verification (npx tsx scripts/test-pulse.ts)
//
// Exercises every buildPulse path with synthetic worldstates so the engine
// is provable without waiting on a live cron tick / upstream availability:
//   A. cold start (no prev)            → seq 1, empty events
//   B. identical re-tick               → etag UNCHANGED, seq stays, lastChange carried
//   C. clock-field-only change         → etag UNCHANGED (the critical property)
//   D. fissure spawned                 → etag moves, fissure-spawned event
//   E. fissure expired (removed)       → etag moves (id set changed) but NO expiry event
//   F. bounty rotation                 → bounty-rotated event
//   G. fixed-cycle drift (DE hotfix)   → cycle-anchor-changed event, etag moves
// ---------------------------------------------------------------------------

import { buildPulse } from '../src/worldstate/pulse';
import type { ParsedWorldstate, Fissure } from '../src/types';

const NOW = Date.now();
const MIN = 60_000;

function makeWs(overrides: Partial<ParsedWorldstate> = {}): ParsedWorldstate {
  const cycle = (startedAgoMs: number, lenMs: number, state: string) => ({
    activation: NOW - startedAgoMs,
    expiry:     NOW - startedAgoMs + lenMs,
    timeLeft:   NOW - startedAgoMs + lenMs - NOW,
    state,
  });
  return {
    timestamp: NOW,
    version:   1,
    cetusCycle:        { ...cycle(10 * MIN, 100 * MIN, 'day'), isDay: true },
    orbVallisCycle:    { ...cycle(2 * MIN, 400_000, 'warm'), isWarm: true },
    cambionDriftCycle: cycle(10 * MIN, 100 * MIN, 'fass'),
    zarimanCycle:      { ...cycle(30 * MIN, 150 * MIN, 'corpus'), isCorpus: true },
    duviriCycle:       { ...cycle(60 * MIN, 120 * MIN, 'Joy'), mood: 'Joy' as const },
    earthCycle:        { ...cycle(60 * MIN, 240 * MIN, 'day'), isDay: true },
    fissures: [
      fissure('f1', 'Lith'),
      fissure('f2', 'Axi'),
    ],
    alerts:     [],
    invasions:  [],
    sortie:     { id: 's1', missionTypes: [], modifiers: [], expiry: NOW + 600 * MIN, rewards: [] },
    archonHunt: null,
    syndicateMissions: [
      { id: 'b1', syndicate: 'Ostron', expiry: NOW + 90 * MIN, jobs: [] },
    ],
    cyclesRemaining: {},
    ...overrides,
  };
}

function fissure(id: string, tier: Fissure['tier']): Fissure {
  return { id, node: `Node ${id}`, missionType: 'Survival', tier, enemy: 'Grineer', expiry: NOW + 60 * MIN };
}

function assert(label: string, cond: boolean, detail?: unknown) {
  if (cond) { console.log(`  PASS  ${label}`); }
  else {
    console.error(`  FAIL  ${label}`, detail !== undefined ? JSON.stringify(detail, null, 2) : '');
    process.exitCode = 1;
  }
}

(async () => {
  const base = makeWs();

  console.log('A. cold start');
  const headA = await buildPulse(null, base, null, NOW);
  assert('seq = 1',            headA.seq === 1);
  assert('events empty',       headA.events.length === 0);
  assert('lastChange = now',   headA.lastChange === NOW);
  assert('counts fissures=2',  headA.counts.fissures === 2);

  console.log('B. identical re-tick');
  const headB = await buildPulse(base, makeWs(), headA, NOW + 5 * MIN);
  assert('etag unchanged',     headB.semanticEtag === headA.semanticEtag);
  assert('seq stays 1',        headB.seq === 1);
  assert('lastChange carried', headB.lastChange === headA.lastChange);
  assert('lastSync advanced',  headB.lastSync === NOW + 5 * MIN);

  console.log('C. clock-field-only change (timestamp/timeLeft churn)');
  const clockOnly = makeWs({ timestamp: NOW + 5 * MIN });
  clockOnly.cetusCycle = { ...clockOnly.cetusCycle, timeLeft: clockOnly.cetusCycle.timeLeft - 5 * MIN };
  const headC = await buildPulse(base, clockOnly, headB, NOW + 5 * MIN);
  assert('etag unchanged',     headC.semanticEtag === headB.semanticEtag);
  assert('seq stays 1',        headC.seq === 1);

  console.log('D. fissure spawned');
  const spawned = makeWs({ fissures: [fissure('f1', 'Lith'), fissure('f2', 'Axi'), fissure('f3', 'Meso')] });
  const headD = await buildPulse(base, spawned, headC, NOW + 10 * MIN);
  assert('etag moved',         headD.semanticEtag !== headC.semanticEtag);
  assert('seq = 2',            headD.seq === 2);
  assert('one spawn event',    headD.events.filter(e => e.kind === 'fissure-spawned').length === 1, headD.events);
  assert('event id = f3',      headD.events[0]?.id === 'f3', headD.events[0]);

  console.log('E. fissure expired — etag moves, NO expiry event');
  const expired = makeWs({ fissures: [fissure('f1', 'Lith')] });
  const headE = await buildPulse(spawned, expired, headD, NOW + 15 * MIN);
  assert('etag moved',         headE.semanticEtag !== headD.semanticEtag);
  assert('no new events',      headE.events.length === headD.events.length, headE.events);

  console.log('F. bounty rotation');
  const rotated = makeWs({ syndicateMissions: [{ id: 'b2', syndicate: 'Ostron', expiry: NOW + 240 * MIN, jobs: [] }] });
  const headF = await buildPulse(base, rotated, headE, NOW + 20 * MIN);
  assert('bounty-rotated event', headF.events.some(e => e.kind === 'bounty-rotated' && e.id === 'Ostron'), headF.events);

  console.log('G. fixed-cycle drift (cetus anchor shifted 10 min)');
  const driftedWs = makeWs();
  driftedWs.cetusCycle = { ...driftedWs.cetusCycle, activation: driftedWs.cetusCycle.activation + 10 * MIN, expiry: driftedWs.cetusCycle.expiry + 10 * MIN };
  const headG = await buildPulse(base, driftedWs, headF, NOW + 25 * MIN);
  assert('etag moved',          headG.semanticEtag !== headF.semanticEtag);
  assert('anchor-changed event', headG.events.some(e => e.kind === 'cycle-anchor-changed' && e.id === 'cetus'), headG.events);

  console.log('H. head size budget');
  const size = JSON.stringify(headG).length;
  assert(`serialized head < 2KB (${size}B)`, size < 2048);

  console.log(process.exitCode ? '\nFAILURES PRESENT' : '\nALL PASS');
})();
