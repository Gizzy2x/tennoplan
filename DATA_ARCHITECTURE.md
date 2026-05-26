# Tennoplan Data Architecture Reference

A complete map of how data flows from external sources → Cloudflare backend → Tennoplan frontend → local storage.

---

## Overview

Tennoplan uses a **multi-layer, offline-first** data strategy:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External Data Sources                         │
├─────────────────────────────────────────────────────────────────────┤
│  • warframestat.us/pc/                (community, pre-parsed)        │
│  • api.warframe.com/cdn/worldState.php (official DE raw worldstate)  │
│  • drops.warframestat.us/data/all.json (WFCD drop data)              │
│  • raw GitHub (WFCD/warframe-drop-data fallback)                     │
│  • items-map.json (build-time, baked into app)                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge (Backend)                         │
├─────────────────────────────────────────────────────────────────────┤
│  • Worker (KV proxy + caching)                                       │
│    - Cron: every 1 minute                                            │
│    - Tries warframestat.us → falls back to api.warframe.com          │
│    - Runs warframe-worldstate-parser on fallback                     │
│    - Stores in KV with 5-min TTL                                     │
│    - Returns X-Data-Source header (warframestat | official)          │
│                                                                       │
│  • KV Namespace storage:                                             │
│    - data      (worldstate JSON, up to 5 min old)                    │
│    - etag      (SHA-1 hash for conditional GET)                      │
│    - source    ('warframestat' | 'official')                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  Tennoplan Frontend (React + Vite)                   │
├─────────────────────────────────────────────────────────────────────┤
│  • SyncService.ts   (worldstate polling engine)                      │
│  • DropDataService.ts (static data download-once model)              │
│  • Zustand stores (heartbeat, navigation, sync state)                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     Client Local Storage (Dexie)                     │
├─────────────────────────────────────────────────────────────────────┤
│  • Dexie v5 (IndexedDB)                                              │
│    - items            (full catalogue, pre-resolved icon URLs)       │
│    - dropLocations    (normalized drop data)                         │
│    - cache            (worldstate snapshot + other ephemeral data)   │
│    - dataSyncState    (sync metadata: timestamp, etag, error log)    │
│    - (+ 3 other tables for assets, progression, item states)         │
│                                                                       │
│  • localStorage (LS_SNAPSHOT_KEY)                                    │
│    - Cold-start seed for Dexie (loses freshness on clear)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flows by Category

### 1. **Worldstate Data** (Live Events: Fissures, Invasions, Alerts)

**Source:** warframestat.us or api.warframe.com (via Cloudflare Worker)  
**Type:** Dynamic, updated every 1–2 minutes  
**Client Freshness:** 60-second poll (when tab is visible)  
**Storage:** Dexie `cache` table + localStorage snapshot

#### Flow:

1. **Worker (Cloudflare)**
   - Cron trigger: every 1 minute
   - Fetch `https://api.warframestat.us/pc/` (primary)
   - On failure → `https://api.warframe.com/cdn/worldState.php` + parse with `warframe-worldstate-parser`
   - SHA-1 hash payload → store in KV if changed
   - Return HTTP 200 + `X-Data-Source` header

2. **Client (SyncService.ts)**
   - `SyncService.init()` → immediate sync + 60 s poll loop
   - Conditional GET: send stored ETag
   - Server returns:
     - **304 Not Modified** → serve cached data (save 2 MB parse)
     - **200 OK** → new payload, cache in Dexie + localStorage
   - Update `useHeartbeatStore` with sync status (`live` | `cached` | `offline`)

3. **UI Access**
   ```ts
   // Read from Dexie cache
   const ws = await getWsCache('worldstate_master');
   // Extract specific event lists: fissures, invasions, alerts, etc.
   ```

#### Config Variables:
- `VITE_WORLDSTATE_WORKER_URL` — Cloudflare Worker URL (optional; falls back to warframestat.us direct)
- `VITE_USE_MOCK_DATA=true` — Load mock worldstate for dev/testing

#### Edge Cases:
- **Cold start:** If Dexie is empty, check localStorage for last snapshot
- **Network down:** Serve stale Dexie data; UI shows "cached" badge
- **All endpoints fail:** UI shows "offline" badge; existing cache persists

---

### 2. **Drop Data** (Items, Drop Locations)

**Source:** drops.warframestat.us + items-map.json (baked at build time)  
**Type:** Semi-static (updates weekly when WFCD releases new data)  
**User Freshness:** Manual refresh only (no auto-sync on launch)  
**Storage:** Dexie `items` + `dropLocations` + `dataSyncState` tables

#### Flow:

1. **Build Time**
   - `src/lib/icons/items-map.json` (pre-resolved item list with image names)
   - Compiled into bundle; never re-fetched

2. **Client (DropDataService.ts)**
   - **Manual trigger only:**
     - User clicks "Refresh" in Settings
     - OR app detects drop data never synced (silent background fetch on init)
   
   - `DropDataService.fetchAndSync({ onProgress })`
     - Fetch `https://drops.warframestat.us/data/all.json`
     - Fallback: `https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/all.json`
     - Conditional GET (ETag support; server returns 304 if unchanged)
     - Exponential backoff retry (3 attempts, 1 s backoff × attempt #)
     - Parse + normalize payload → `DropLocation[]`
     - Build items catalogue from baked `items-map.json` → resolve all icon URLs
     - Transactional Dexie write (all-or-nothing)
   
   - On failure: preserve existing Dexie rows; don't overwrite with empty result

3. **Staleness Check**
   - `DropDataService.checkForStaleData()`
     - Lightweight Dexie read (no network)
     - Return `{ isStale, daysOld, message }`
     - Threshold: 14 days old = show banner
   
   - Runs on app init; UI displays stale banner if true

4. **Clear Data**
   - `DropDataService.clearAllData()` (Settings button)
   - Wipe `items` + `dropLocations` + `dataSyncState`
   - Icons show placeholders until next successful refresh

#### Config Variables:
- `VITE_USE_MOCK_DATA=true` — Load mock drop data instead of fetching

#### UI Integration:
- **Celestial Pendulum** queries `db.dropLocations` for bounties by location/tier
- **Ascension Registry** filters `db.items` by category
- All components read pre-resolved `item.iconUrl` (never compute CDN path)

---

### 3. **User Inventory** (EE.log Parser)

**Source:** Local EE.log file (future Tauri/Rust work)  
**Type:** User-generated, ephemeral  
**Storage:** Dexie `cache` table  
**TTL:** 24 hours

#### Current Status:
- **Not yet implemented.** Parser is a future Tauri + Rust project.
- `SyncService.updateUserInventory(items)` is the planned gateway.

#### Planned Flow (when Tauri + Rust parser ships):
```ts
// 1. Tauri reads EE.log file
const log = await readFile(eeLogPath);

// 2. Rust parser extracts inventory items
const items = rustParseEELog(log);

// 3. Client persists to Dexie
await SyncService.updateUserInventory(items);

// 4. UI reads from cache
const myItems = await db.cache.get('user_inventory');
```

---

## Dexie Schema (v5)

Located: `src/adapters/storage/db.ts`

### Core Tables

| Table | Primary Key | Purpose | Lifecycle |
|-------|-------------|---------|-----------|
| `items` | `uniqueName` (string) | Full item catalogue with pre-resolved icon URLs | Persists until user clicks "Clear Data" |
| `dropLocations` | `locationKey` (string) | Normalized drop locations (bounties, void fissures, etc.) | Persists until user clicks "Clear Data" |
| `cache` | `key` (string) | Ephemeral data: worldstate snapshot, user inventory | Auto-expires via `expiresAt` index |
| `dataSyncState` | `id` ('items' \| 'dropLocations') | Sync metadata: last update time, ETag, error log | Persists; updated on each sync attempt |
| `settings` | `key` (string) | User preferences (future expansion) | Persists |
| `userMarks` | `++id` (auto) | User-created marks/notes | User-managed |

### Less-Used Tables (Asset Sync Engine, Ascension Registry)

| Table | Purpose |
|-------|---------|
| `assetMeta` | Per-asset metadata for the Asset Sync Engine |
| `syncErrors` | Error log for failed/404 asset downloads |
| `progression` | Ascension Registry — one row per masterable item |
| `itemStates` | User-owned flags (sparse: only touched items) |

---

## Retry & Fallback Logic

### DropDataService
```
Fetch drops.warframestat.us/data/all.json (with ETag)
├─ Success (200) → parse, normalize, write to Dexie
├─ 304 Not Modified → refresh timestamp only, keep existing rows
├─ Timeout/error → retry with exponential backoff
│  ├─ Attempt 1: wait 1 s
│  ├─ Attempt 2: wait 2 s
│  └─ Attempt 3: wait 3 s
└─ All retries failed → try GitHub fallback
   ├─ Success → use GitHub data
   └─ Failure → preserve existing Dexie rows; show error to user
```

### SyncService (Worldstate)
```
Fetch VITE_WORLDSTATE_WORKER_URL || warframestat.us/pc/
├─ Success (200) → parse, cache in Dexie + localStorage
├─ 304 Not Modified → serve cached data
├─ Timeout/error → try fallback (if configured)
│  └─ warframestat.us/pc/ direct
└─ All endpoints failed → serve stale Dexie data (or empty if no cache)
   └─ UI shows "offline" badge
```

### Cloudflare Worker
```
Scheduled (cron every 1 min):
Fetch warframestat.us/pc/
├─ Success (200) → parse, SHA-1 hash, compare with stored ETag
│  ├─ Changed → write new payload + ETag + source to KV
│  └─ Unchanged → update source tag only (primary may have recovered)
├─ Timeout/error → try official api.warframe.com
│  ├─ Success → parse with warframe-worldstate-parser → store in KV
│  └─ Failure → log error; retry next minute
```

---

## ETag & Conditional GET

**Purpose:** Avoid re-parsing 2 MB JSON when data hasn't changed.

### Implementation:
1. Client sends `If-None-Match: <etag>` header
2. Server compares with stored ETag:
   - **Match** → return HTTP 304 (client caches hit ~1/2 syncs)
   - **Mismatch** → return HTTP 200 + new ETag
3. Client updates stored ETag only on 200 responses

### Locations:
- **Worldstate:** stored in Dexie `cache` table (key: `worldstate_etag`)
- **Drop data:** stored in Dexie `dataSyncState` table (id: `dropLocations`)
- **KV (Worker):** stored as `etag` key in Cloudflare KV

---

## Mock Mode (Development)

**Environment Variable:** `VITE_USE_MOCK_DATA=true`

When enabled:
- **SyncService** → returns `generateMockWorldstate()`
- **DropDataService** → loads `MOCK_DROP_LOCATIONS` + `MOCK_ITEMS` from fixtures
- No network calls; instant predictable data for testing

Fixtures: `src/lib/mockdata/fixtures.ts`

---

## Polling & Visibility Awareness

**SyncService polling engine (`SyncService.init()`)**

- **Initial sync:** runs immediately on app load
- **Poll interval:** 60 seconds while tab is visible
- **Tab hidden:** pause interval (saves CPU/bandwidth)
- **Tab re-focused:** immediate resync, restart 60 s loop
- **Visibility listener:** `document.addEventListener('visibilitychange', ...)`

---

## Error Handling & User Feedback

### Heartbeat Store (`useHeartbeatStore`)

Tracks sync status across the app:

```ts
export interface HeartbeatState {
  lastSync: {
    status: 'live' | 'cached' | 'offline';
    timestamp: number;
  };
}
```

**Status meanings:**
- **live:** Fresh data from network (200 or 304 confirmed)
- **cached:** Network failed; serving stale Dexie data
- **offline:** Network failed AND no local cache exists

UI reads this to show:
- 🟢 Green badge: live
- 🟡 Yellow badge: cached (with age)
- 🔴 Red badge: offline

### Stale Data Banners

**DropDataService:**
- Shows banner if drop data > 14 days old
- Non-blocking; user can dismiss
- Manual "Refresh" button in Settings always works

**SyncService:**
- Shows "offline" badge only if network completely down
- No banner; graceful degradation

---

## Performance Optimization

### 1. Pre-Resolved Icon URLs
- `items-map.json` → `getIconUrl()` → `item.iconUrl` stored in Dexie
- UI never computes CDN paths per-render
- Icons never disappear (even if cache is cleared between syncs)

### 2. Transactional Writes
- All-or-nothing Dexie updates (items + dropLocations + sync state)
- No partial writes on network failure
- Guarantees Dexie is always in a valid state

### 3. 304 Not Modified Caching
- ~50% of syncs hit 304 (save 2 MB parse + storage write)
- ETag support in all fetch paths

### 4. LocalStorage Cold-Start Seed
- On cold start (Dexie empty), check localStorage
- Restore last known worldstate instantly (avoid black screen)
- LS loses freshness when users clear browser cache (acceptable)

### 5. Passive Sync Rate-Limiting
- `requestPassiveSync()` → throttled to 60 s cooldown
- Triggered by fissure/invasion/alert expiration (00:00:00)
- Prevents network spam if multiple events expire at once

---

## Testing & Debugging

### Environment Variables:
```
VITE_USE_MOCK_DATA=true          # Load fixtures instead of live API
VITE_WORLDSTATE_WORKER_URL=...   # Cloudflare Worker URL (optional)
```

### Logger Scopes:
```ts
logger.scope('SyncService')        // Worldstate polling
logger.scope('DropDataService')    // Static data sync
logger.scope('DropDataService')    // Progress updates during fetch
```

### Dexie Console Debugging:
```ts
// Read all items
db.items.toArray().then(console.log);

// Check sync state
db.dataSyncState.get('dropLocations').then(console.log);

// Count rows
db.dropLocations.count().then(console.log);

// Clear everything (use with caution!)
db.delete().then(() => location.reload());
```

### Network Inspection:
- **DevTools → Network:** watch fetch calls to Worker / warframestat.us
- **X-Data-Source header:** shows which upstream served the data
- **X-Tennoplan-Source header:** shows if response came from KV or origin

---

## Future Work

1. **EE.log Parser** (Tauri + Rust)
   - Read local EE.log file
   - Extract user inventory
   - Persist via `SyncService.updateUserInventory()`

2. **Bounty Rotation Tiers** (warframe-drop-data integration)
   - Hook up tier names in Celestial Pendulum
   - Show which fissure tier is active

3. **Ascension Registry** (when Dailies & Weeklies is solid)
   - Consume `progression` table data
   - Build mastery tracker UI

4. **Items API Expansion**
   - Currently pulls from baked items-map.json
   - Future: fetch fresh @wfcd/items JSON on demand
   - Interface stays the same (StoredItem[] shape doesn't change)

---

## Reference: API Contract Summary

| Endpoint | Method | Response | Headers | Purpose |
|----------|--------|----------|---------|---------|
| `https://api.warframestat.us/pc/` | GET | Worldstate JSON (warframestat.us shape) | `ETag`, `Cache-Control` | Live events |
| `https://api.warframe.com/cdn/worldState.php` | GET | Raw DE worldstate JSON | none | Fallback (needs parser) |
| `https://drops.warframestat.us/data/all.json` | GET | Drop data (WFCD shape) | `ETag` | Static item locations |
| `https://raw.githubusercontent.com/WFCD/warframe-drop-data/...` | GET | Drop data (raw repo) | none | Fallback |
| `VITE_WORLDSTATE_WORKER_URL` (Cloudflare) | GET | Worldstate JSON (cached) | `ETag`, `X-Data-Source` | Proxy + cache |

---

## Summary

**The single flow in plain English:**

1. Cloudflare Worker cron runs every 1 min, fetches worldstate from warframestat.us (or official API as fallback), stores in KV.
2. Tennoplan client polls that Worker every 60 s (when visible), using ETags to skip re-parsing if nothing changed.
3. When the user clicks "Refresh" in Settings, the app fetches drop data manually from drops.warframestat.us, parses, normalizes, and stores in Dexie.
4. Both pieces are cached locally in Dexie with sync metadata (timestamp, ETag, error log).
5. UI reads from local cache; network failures gracefully degrade to stale data or offline mode.
6. Future: EE.log parser (Tauri + Rust) will extract user inventory and persist it the same way.
