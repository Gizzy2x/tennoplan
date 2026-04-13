// Re-export everything from the canonical Solar Rail Feed adapter.
// The hook at features/solar-rail-feed/hooks/useSolarRailFeed.ts imports from
// this path; the actual fetch + mapping logic lives in adapters/legacy/railAdapter.ts.
export {
  fetchInvasions,
  fetchAlerts,
  fetchDarvoDeals,
  fetchVoidTrader,
  fetchSteelPath,
  fetchPersistentEnemies,
  fetchNews,
  fetchSortieWS,
  fetchArchonHuntWS,
} from '../legacy/railAdapter';
