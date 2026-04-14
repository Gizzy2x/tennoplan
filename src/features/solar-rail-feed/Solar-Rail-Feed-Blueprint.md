---
type: architecture-node
module: Solar-Rail-Feed
status: active
tags: [tennoplan, somatic-link, invasions, alerts, events]
---

# Solar Rail Feed Feature Blueprint

## Purpose
Display invasions, alerts, and events in a simple, focused view.

## Data Flow
- **Source:** `worldstate_master` from Dexie cache
- **Hook:** `useSolarRailFeed()`
- **Subscription:** `useLiveQuery` on `db.cache["worldstate_master"]`
- **UI:** Simple focused view with event cards

## Key Files
- `SolarRailFeed.tsx` — Main page component
- `useSolarRailFeed.ts` — Data hook for invasions/alerts/events

## Completion State
Displays read-only "Completed" flag linking to Dailies & Weeklies (owned there).
