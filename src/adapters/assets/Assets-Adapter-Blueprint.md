---
type: architecture-node
module: Assets-Adapter
status: active
tags: [tennoplan, somatic-link, icons, images]
---

# Assets Adapter Blueprint

## Purpose
Asset management — item icons, UI images, and static resources.

## Key Responsibilities
- **Icon resolution** — Maps item names to icon URLs
- **Caching** — In-memory cache for frequently accessed icons
- **API fallback** — Direct API access for non-cached items

## Key Files
- Asset hooks for icon resolution

## Data Sources
- Warframe API for item icons
- Local baked-icons fallback
