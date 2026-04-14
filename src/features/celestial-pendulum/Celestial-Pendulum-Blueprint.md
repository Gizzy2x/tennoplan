---
type: architecture-node
module: Celestial-Pendulum
status: active
tags: [tennoplan, somatic-link, timers, world-cycles]
---

# Celestial Pendulum Feature Blueprint

## Purpose
Live world cycle timers for Warframe (Cetus, Vallis, Zariman, Cambion Drift cycles).

## Data Flow
- **Source:** `worldstate_master` from Dexie cache
- **Hook:** `useWorldCycles()`
- **Subscription:** `useLiveQuery` on `db.cache["worldstate_master"]`
- **UI:** Simple focused timer display with optional "Completed" flag linking to Dailies & Weeklies

## Key Files
- `CelestialPendulum.tsx` — Main page component
- `useWorldCycles.ts` — Data hook for world cycle queries

## Completion State
Owned by **Dailies & Weeklies** tab. Side tabs display read-only "Completed" status.
