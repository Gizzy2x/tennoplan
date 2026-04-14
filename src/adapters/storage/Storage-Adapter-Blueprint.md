---
type: architecture-node
module: Storage-Adapter
status: active
tags: [tennoplan, somatic-link, dexie, persistence]
---

# Storage Adapter Blueprint

## Purpose
Dexie IndexedDB schema and persistence layer — provides offline-first data storage for all feature queries.

## Key Responsibilities
- **Schema definition** — Tables for cache, fissures, worldstate, etc.
- **Indexing strategy** — Optimized for `useLiveQuery` subscriptions
- **TTL management** — Automatic cache expiration

## Key Files
- `db.ts` — Dexie instance and schema setup

## Tables
- `cache` — General-purpose cache (worldstate_master, drop data, etc.)
- Feature-specific tables as needed

## Connection to Core Services
- Referenced by `SyncService` for cache writes
- Accessed by all feature hooks via `useLiveQuery`
