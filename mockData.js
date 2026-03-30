// mockData.js — Static fallback data used when WarframeStat.us is unreachable.
// Loaded before app.js via <script src="mockData.js">.
// Exposes window.WF_MOCK; apiFetch() returns the relevant entry on final retry failure.
// Time-sensitive fields (expiry, activation) are set to 1 h from page load — good enough
// for UI rendering without crashing timers.
(function () {
  var _1h = new Date(Date.now() + 3_600_000).toISOString();
  var _7d = new Date(Date.now() + 604_800_000).toISOString();

  window.WF_MOCK = {

    // ── Nightwave ──────────────────────────────────────────────────────────────
    nightwave: {
      season: 'Offline — cached acts shown',
      activeChallenges: [
        { id: 'nw-d1', title: 'Complete a Sortie',            reputation: 1000, isDaily: true,  isElite: false },
        { id: 'nw-d2', title: 'Kill 150 Enemies',             reputation: 1000, isDaily: true,  isElite: false },
        { id: 'nw-d3', title: 'Complete 3 Void Fissures',     reputation: 1000, isDaily: true,  isElite: false },
        { id: 'nw-w1', title: 'Complete 5 Syndicate Missions', reputation: 1500, isDaily: false, isElite: false },
        { id: 'nw-w2', title: 'Complete a Nightmare Mission',  reputation: 1500, isDaily: false, isElite: false },
        { id: 'nw-e1', title: 'Complete an Archon Hunt',       reputation: 4500, isDaily: false, isElite: true  },
      ]
    },

    // ── Void Trader ────────────────────────────────────────────────────────────
    voidTrader: {
      active: false,
      location: 'N/A — API offline',
      activation: _7d,
      expiry: _7d
    },

    // ── Void Fissures ──────────────────────────────────────────────────────────
    // Empty array — renderVoidFissures() handles [] by showing a filter bar with
    // "No fissures match the current filter." rather than crashing.
    fissures: [],

    // ── Arbitration ────────────────────────────────────────────────────────────
    arbitration: {
      node: 'N/A — API offline',
      type: 'Arbitration',
      enemy: 'N/A',
      expiry: _1h,
      id: 'mock-arb'
    },

    // ── Archon Hunt ────────────────────────────────────────────────────────────
    archonHunt: {
      missions: [
        { type: 'N/A', node: 'API offline — check in-game' },
        { type: 'N/A', node: 'API offline — check in-game' },
        { type: 'N/A', node: 'API offline — check in-game' }
      ]
    },

    // ── Sortie ─────────────────────────────────────────────────────────────────
    sortie: {
      variants: [
        { missionType: 'N/A', modifier: 'API offline — check in-game' },
        { missionType: 'N/A', modifier: 'API offline — check in-game' },
        { missionType: 'N/A', modifier: 'API offline — check in-game' }
      ]
    },

    // ── Steel Path Honors ──────────────────────────────────────────────────────
    // null → renderSteelPath(null, true) shows the offline message gracefully.
    steelPath: null,

    // ── Invasions ──────────────────────────────────────────────────────────────
    // Empty array — renderInvasions([]) shows "No active invasions right now."
    invasions: [],

    // ── World-state cycles ─────────────────────────────────────────────────────
    // Expiry is 1 h from load; timers will tick down correctly until data refreshes.
    cetusCycle:   { isDay:  true,  expiry: _1h },
    vallisCycle:  { isWarm: false, expiry: _1h },
    cambionCycle: { state: 'vome', expiry: _1h },

    // ── Alerts ─────────────────────────────────────────────────────────────────
    // Empty array — renderAlerts([]) hides the section entirely.
    alerts: []

  };
}());
