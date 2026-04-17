# Tennoplan — Complete Data Architecture & System Overview

**For:** Grok AI context  
**Date:** 2026-04-17

---

## Project Basics
- **Framework:** Tauri 2 (desktop app) + React 19
- **Architecture:** Hexagonal (Clean Architecture) — business logic isolated from frameworks
- **Navigation:** No router; Zustand-based store drives UI state
- **Storage:** Dexie (IndexedDB) for offline caching + persistent state

---

## Data Sources (APIs)

### Primary: Warframe Worldstate API
**URL:** https://api.warframestat.us/pc

**Provides:**
- `worldstate` — Live world cycles (Cetus day/night, Cambion zone, Zariman state, etc.)
- `fissures` — Active void fissure locations & types
- `bounties` — Current world bounties (tied to world state)
- `invasions` — Faction vs. faction invasions, progress, rewards
- `alerts` — Time-limited alert missions
- `events` — Seasonal/limited-time events
- `sorties` — Daily 3-mission chain with modifiers
- `archonHunt` — Weekly Archon Hunt missions
- `arbitrations` — Current rotating arbitration mission
- `acolytes` / `persistentEnemies` — Active enemy spawns
- `news` — Official game announcements
- `voidTrader` — Baro Ki'Teer schedule & inventory
- `nightwave` — Seasonal battle pass + challenges

### Secondary: Warframe Market API
**URL:** https://api.warframe.market/v2/

**Provides:**
- Drop rates, loot tables, item availability
- Mission-to-reward mappings for farming optimization

### Tertiary (Future): EE.log Parser
- Local Warframe installation logs (via Tauri Rust backend)
- Player-specific data (loadout, progression, playtime analytics)

---

## 🔑 THE CRITICAL LAYER: Cloudflare Worker

**This is the innovation that makes the system scalable.**

### Architecture

```
┌──────────────────────────────────┐
│ Warframestat.us API              │ ← Hit ONLY once per minute
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Cloudflare Worker (Scheduled)     │
│ - Cron runs every 60 seconds      │
│ - Fetches API response            │
│ - Computes SHA-1 ETag hash       │
│ - Stores in KV only if changed    │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Cloudflare KV Store (Edge)        │ ← Sub-millisecond reads
│ - Stores latest worldstate JSON   │
│ - Stores ETag hash                │
│ - 5-min TTL safety net            │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Tennoplan Desktop App             │
│ - GET /worldstate with If-None-Match header
│ - Receives 304 (not modified) or 200 with full JSON
│ - Caches locally in Dexie         │
└──────────────────────────────────┘
```

### How It Works

1. **Scheduled Fetch (every 60s):**
   - Worker hits warframestat.us/pc once per minute
   - Parses response, validates JSON
   - Computes SHA-1 hash → converts to ETag (e.g., `"a1b2c3d4e5f6g7h8"`)
   - Compares new ETag with stored ETag in KV
   - **Only writes to KV if data changed** (hash differs)

2. **Client Request (Tennoplan desktop app):**
   - Sends GET with `If-None-Match: "a1b2c3d4e5f6g7h8"` header
   - Worker checks: does client's ETag match stored ETag?
   - **If match:** Returns 304 Not Modified (empty response, client skips parsing ~2 MB JSON)
   - **If mismatch:** Returns 200 + full JSON from KV

3. **KV Benefits:**
   - Sub-millisecond reads at Cloudflare edge
   - 5-min TTL (safety net; cron refreshes every 60s)
   - CORS headers set for browser/app access
   - All 200k simultaneous users hit KV, NOT upstream API

### Impact

| Scenario | Without Worker | With Worker |
|----------|---|---|
| 200k simultaneous users | 200k requests/min to warframestat.us | 1 request/min to warframestat.us |
| Repeat client (same data) | Downloads 2 MB JSON | Returns 304, 0 bytes |
| Data stale? | As stale as API is | At most 60s old |
| Latency | Network + upstream latency | Sub-millisecond KV read |

---

## Fallback: Local Dev (Vercel Function)

**File:** `api/worldstate.ts`

- Used **only** when `VITE_WORLDSTATE_WORKER_URL` is not set
- **Only runs during `npm run dev`** (SyncService bypasses it in production)
- Direct proxy to warframestat.us with 5-min cache header
- Not used in deployed builds

---

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker + KV (Production)                         │
│ OR                                                          │
│ Vercel Function (Local Dev)                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ src/adapters/api/SyncService.ts                             │
│ - Polls Worker/API on mount + periodically                  │
│ - ETag-aware (sends If-None-Match, skips parse on 304)     │
│ - Error handling, retry logic                               │
│ - JSON parsing resilience                                   │
│ - Autonomous polling with heartbeat reconciliation          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ src/adapters/storage/Dexie Schema                           │
│ - Tables: worldstate, bounties, fissures, alerts, etc.      │
│ - Persistent offline cache of latest API data               │
│ - ETag stored for conditional requests                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ src/core/services/ (Business Logic - Pure TS)              │
│ - Cycle calculations, farming optimization, reward ranking  │
│ - Data transformations, filtering, sorting                  │
│ - Zero imports from React, Dexie, or fetch                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ src/store/ (Zustand Store)                                  │
│ - Tab state (Celestial Pendulum, Solar Rail Feed, etc.)     │
│ - Navigation state, UI filters, completion flags            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ src/features/<tab>/<Tab>Page.tsx (React Components)         │
│ - Consume Zustand store, render UI                          │
│ - User interaction → store updates → re-render              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tab-Specific Data Ownership

### **Celestial Pendulum**
- **Owns:** All world cycles, bounties, drop rates, key resources, completion flags
- **Syncs from:** Cloudflare Worker (via Dexie)
- **Business logic:** Cycle calculations, resource recommendations, farming optimization
- **Future:** Integrated map, cycle calendar/planner

### **Solar Rail Feed**
- **Owns:** Invasions, alerts, events, sorties, archon hunts, arbitrations, acolytes, news
- **Syncs from:** Cloudflare Worker (via Dexie)
- **Business logic:** Activity sorting (by expiry), reward ranking, urgency flags
- **Light integration:** Optional completion flags (owned by Dailies & Weeklies)

### **Dailies & Weeklies**
- **Owns:** Nightwave challenges, completion state, personal tracking
- **Syncs from:** Cloudflare Worker (via Dexie)
- **Business logic:** Progress calculation, challenge filtering, rewards
- **References:** Celestial Pendulum & Solar Rail Feed (completion flags link back here)

### **Ascension Registry** (Mastery Tracker)
- **Owns:** Warframe/weapon/companion/archwing progression
- **Syncs from:** Player-specific data (future: EE.log parser)
- **Business logic:** Mastery calculation, unlock checking, progression tracking

---

## Sync & Caching Strategy

1. **On App Launch:**
   - SyncService sends GET to Cloudflare Worker with ETag (if cached)
   - Worker returns 304 (no change) or 200 (fresh data)
   - Response (or cached data if 304) stored in Dexie

2. **Periodic Polling:**
   - Heartbeat reconciliation (every 30s–5m, configurable)
   - Only makes request if local cache is stale
   - ETag prevents unnecessary JSON parsing (~2 MB savings per miss)
   - Updates Dexie, triggers UI re-render via Zustand

3. **Offline Mode:**
   - Dexie cache serves as source of truth when Worker unreachable
   - Timestamps on cached items help identify stale data
   - User can force refresh when back online

4. **Data Freshness:**
   - Worldstate data: ~1–60 seconds (Worker cron refreshes every 60s)
   - Alerts/invasions: ~1–60 seconds (changes detected via ETag diff)
   - Sorties/Archon Hunt: ~24h/7d (static until reset)
   - News: ~varies (pulled on demand)

---

## State Management & Completion Tracking

- **Zustand stores** manage tab state, filters, and local UI
- **Completion flags** (e.g., "marked this world as farmed") stored in Dexie + synced to Zustand
- **Dailies & Weeklies** owns authoritative completion state; other tabs reference it
- **No real-time sync to server** (yet) — all data is local-first, cached in Dexie

---

## Key Principles

✅ **Offline-first:** Dexie cache ensures app works without internet  
✅ **Worker-backed:** Cloudflare Worker reduces upstream load by 99.5%+  
✅ **Bandwidth efficient:** ETags + conditional GETs save ~2 MB per unchanged response  
✅ **Clean architecture:** Business logic in `src/core/`; UI in React  
✅ **Resilient fetching:** JSON parsing fallbacks, autonomous polling, heartbeat reconciliation  
✅ **Data isolation:** Each tab owns specific data; no duplication  
✅ **User-driven:** Completion state is local; sync to server is future work  

---

## Environment Variables

**Production:**
- `VITE_WORLDSTATE_WORKER_URL` — Cloudflare Worker URL (enables Worker mode, disables Vercel fallback)

**Development:**
- Without `VITE_WORLDSTATE_WORKER_URL` — Falls back to Vercel function (api/worldstate.ts)

---

**This is the complete context Grok needs to understand Tennoplan's data architecture.**
