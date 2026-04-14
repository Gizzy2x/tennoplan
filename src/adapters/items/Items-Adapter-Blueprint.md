---
type: architecture-node
module: Items-Adapter
status: active
tags: [tennoplan, somatic-link, item-data]
---

# Items Adapter Blueprint

## Purpose
Item data abstraction — manages item metadata, drop rates, and market information.

## Key Responsibilities
- **Item database** — Warframe items, weapons, companions, etc.
- **Drop rate queries** — Sourcing from cache["drop:all"] with 24h TTL
- **Market data integration** — Links to Warframe Market prices

## Key Files
- Item query hooks and utilities

## Cache Entries
- `cache["drop:all"]` — Complete drop table (24h TTL)
