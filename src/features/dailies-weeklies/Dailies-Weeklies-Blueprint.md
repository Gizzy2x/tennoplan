---
type: architecture-node
module: Dailies-Weeklies
status: in-progress
tags: [tennoplan, somatic-link, nightwave, challenges, completion-state]
---

# Dailies & Weeklies Feature Blueprint

## Purpose
**Killer feature** — Nightwave challenges, Pulse tracker, Netracell, EDA/ETA calculations, weekly checklist with persistent completion state.

## Data Flow
- **Source:** `worldstate_master` from Dexie cache
- **Hook:** `useDailiesWeeklies()`
- **Subscription:** `useLiveQuery` on `db.cache["worldstate_master"]`
- **State Management:** Zustand store for completion tracking
- **Persistence:** Dexie IndexedDB

## Key Files
- `DailiesWeeklies.tsx` — Main page component
- `useDailiesWeeklies.ts` — Data hook for challenge queries
- Completion state store — Zustand

## Completion State Ownership
This tab **owns** all completion state across the application. Other tabs link here to update status.
