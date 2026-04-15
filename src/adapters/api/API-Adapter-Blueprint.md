---
type: architecture-node
module: API-Adapter
status: active
tags: [tennoplan, somatic-link, dexie, network]
---

# API Adapter Blueprint

## Purpose
Network layer abstraction — fetches from external APIs (Warframestat, Warframe Market) and manages caching via Dexie.

## Key Responsibilities
- **Network requests** to https://api.warframestat.us/pc and https://api.warframe.market/v2/
- **Proxy:** Vite dev server and Vercel production
- **Cache management** via `worldstateCache.ts`
- **Anti-spam lock:** 60s throttle (bypass with `force: true`)

## Key Files
- `fetchWorldstate.ts` — Worldstate fetching logic
- `worldstateCache.ts` — Cache read/write logic
- `syncService.ts` — Orchestrates sync operations

## Cache Entries
- `db.cache["worldstate_master"]` — Master worldstate object
- TTL: 1 hour (Offline-Ready)
