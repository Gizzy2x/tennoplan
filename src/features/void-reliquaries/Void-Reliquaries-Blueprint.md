---
type: architecture-node
module: Void-Reliquaries
status: active
tags: [tennoplan, somatic-link, fissures, relics]
---

# Void Reliquaries Feature Blueprint

## Purpose
Active fissure display with relic rotation data for void fissure missions.

## Data Flow
- **Source:** `worldstate_master` from Dexie cache
- **Hook:** `useFissures()`
- **Subscription:** `useLiveQuery` on `db.cache["worldstate_master"]`
- **UI:** FissureCard with top tags, simple focused view

## Key Files
- `VoidReliquaries.tsx` — Main page component
- `useFissures.ts` — Data hook for fissure queries
- `FissureCard.tsx` — Reusable fissure card component

## Completion State
Owned by **Dailies & Weeklies** tab. Displays read-only "Completed" flag.
