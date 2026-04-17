# Tennoplan — Complete System Overview & Current State

**Date:** 2026-04-17  
**Current Branch:** Development  
**Status:** Active development with Phase 1 systems in place

---

## 📋 Executive Summary

**Tennoplan** is an **offline-first Warframe companion desktop app** built with **Tauri 2 + React 19**. It consolidates all important Warframe gameplay information (world cycles, bounties, loot tables, invasions, alerts, events, daily/weekly challenges) into a single, synchronized, locally-cached interface.

**Key Innovation:** Cloudflare Worker + KV cache reduces upstream API load by 99.5% while serving data from the edge at sub-millisecond latency.

---

## 🏗️ Architecture Overview

### Stack
- **Desktop:** Tauri 2 (Rust + WebView)
- **Frontend:** React 19 + Vite
- **State Management:** Zustand
- **Local Storage:** Dexie (IndexedDB)
- **API Cache:** Cloudflare Worker + KV
- **Code Organization:** Hexagonal Architecture (Clean Code)

### Key Principles
1. **Offline-first:** App fully functional with cached Dexie data
2. **Clean separation:** Business logic (src/core/) has ZERO imports from React, Dexie, or fetch
3. **Worker-backed:** Cloudflare Worker shields upstream API from load
4. **ETag-aware:** Conditional GETs save bandwidth (~2 MB per unchanged response)
5. **Tab-owned:** Each major feature owns its data; no duplication

---

## 🌐 Data Architecture (The Complete Pipeline)

### Layer 1: Upstream Data Source
```
Warframestat.us API (https://api.warframestat.us/pc)
└─ Hit ONLY once per minute by Cloudflare Worker cron
```

### Layer 2: Cloudflare Worker + KV (Edge Cache)
**File:** `cloudflare-worker/src/index.ts`

**How it works:**
1. **Scheduled Fetch (every 60 seconds):**
   - Worker cron triggers → fetches warframestat.us/pc
   - Validates JSON response
   - Computes SHA-1 hash → creates ETag (e.g., `"a1b2c3d4e5f6g7h8"`)
   - Compares with stored ETag in KV
   - **Only writes if data changed** (hash differs)

2. **HTTP Handler (client requests):**
   - Client sends GET with `If-None-Match: <etag>` header
   - Worker checks: client's ETag === stored ETag?
   - **If match:** Returns 304 Not Modified (client uses cached version)
   - **If mismatch:** Returns 200 + full JSON from KV
   - Sets CORS headers for app access

3. **KV Storage:**
   - Stores: latest worldstate JSON (`data` key) + current ETag (`etag` key)
   - TTL: 5 minutes (safety net; cron refreshes every 60s)
   - Latency: Sub-millisecond edge reads

**Impact:**
- 200k simultaneous users = 200k KV reads, 1 upstream request/min
- Bandwidth saved: ~2 MB per 304 response
- Latency: Network RTT reduced to sub-millisecond edge hit

### Layer 3: SyncService (Polling & Resilience)
**File:** `src/adapters/api/SyncService.ts`

**Responsibilities:**
- Polls Cloudflare Worker on app mount
- Periodic heartbeat reconciliation (configurable interval)
- ETag-aware: Sends `If-None-Match` header, skips parsing on 304
- JSON parsing resilience: Fallback to stale cache if parse fails
- Autonomous polling: Continues even if one fetch fails
- Handles network errors gracefully

**Flow:**
```
1. App starts
2. SyncService.sync() called
3. Sends GET to Worker with ETag (if cached)
4. Worker returns 304 (use cache) or 200 (new data)
5. Response stored in Dexie
6. Zustand store notified → UI re-renders
7. Periodic polling continues (heartbeat)
```

### Layer 4: Dexie (Local Storage Schema)
**File:** `src/adapters/storage/schema.ts`

**Tables:**
- `worldstate` — Full worldstate snapshot (world cycles, fissures, etc.)
- `bounties` — Bounty list with world association + rewards
- `fissures` — Void fissure tracking
- `alerts` — Time-limited alerts with expiry
- `invasions` — Invasion tracking
- `events` — Limited-time events
- `sorties` — Daily 3-mission chain
- `archonHunt` — Weekly Archon Hunt missions
- `arbitrations` — Rotating arbitration mission
- `acolytes` / `persistentEnemies` — Active enemy spawns
- `news` — Official announcements
- `nightwave` — Seasonal battle pass data
- `voidTrader` — Baro Ki'Teer schedule
- `completionFlags` — User-marked "done" state (owned by Dailies & Weeklies)

**Strategy:**
- Each sync updates relevant tables
- Timestamps track data freshness
- TTL or expiry logic built per-table (e.g., alerts expire naturally)
- Completion state persists across sessions

### Layer 5: Hexagonal Architecture (Business Logic)
**File Structure:**
```
src/
├── core/
│   ├── domain/           # Pure TS types & entities (no deps)
│   │   ├── World.ts
│   │   ├── Bounty.ts
│   │   ├── Cycle.ts
│   │   ├── Event.ts
│   │   └── ...
│   └── services/         # Pure business logic (no React, Dexie, fetch)
│       ├── CycleService.ts      # Cycle calculations
│       ├── BountyService.ts     # Bounty filtering & ranking
│       ├── FarmingService.ts    # Farming optimization logic
│       ├── RewardService.ts     # Reward analysis
│       └── ...
├── adapters/
│   ├── api/
│   │   └── SyncService.ts       # Fetch + ETag polling
│   └── storage/
│       ├── schema.ts            # Dexie schema definition
│       └── DexieAdapter.ts      # CRUD operations on Dexie
├── features/
│   ├── celestial-pendulum/
│   │   ├── CelestialPendulumPage.tsx
│   │   ├── store.ts             # Tab-specific Zustand store
│   │   └── components/
│   ├── solar-rail-feed/
│   │   ├── SolarRailFeedPage.tsx
│   │   ├── store.ts
│   │   └── components/
│   ├── dailies-weeklies/
│   │   ├── DailiesWeekliesPage.tsx
│   │   ├── store.ts
│   │   └── components/
│   ├── ascension-registry/
│   │   ├── AscensionRegistryPage.tsx
│   │   ├── store.ts
│   │   └── components/
│   └── ...
├── store/
│   ├── navigationStore.ts       # Which tab is active
│   ├── appStateStore.ts         # Global app state
│   └── ...
├── components/
│   └── layout/
│       ├── AppShell.tsx         # Main container
│       ├── Sidebar.tsx          # Tab navigation
│       ├── Header.tsx           # Top bar
│       └── ...
└── index.css                    # Global styles + cinematic utilities
```

**Key Rule:** `src/core/` has ZERO imports from React, Dexie, or fetch. Pure business logic only.

### Layer 6: Zustand State Management
**What it manages:**
- Current active tab (navigation state)
- Tab-specific filters, sort order, view mode
- UI state (expanded/collapsed sections, modals, etc.)
- Completion flags (light reference to Dailies & Weeklies)

**Pattern:**
- One store per feature tab (e.g., `features/celestial-pendulum/store.ts`)
- Global `navigationStore.ts` for active tab
- Subscribe to Dexie updates → trigger Zustand updates → React re-renders

### Layer 7: React Components & UI
**File:** `src/features/<tab>/<Tab>Page.tsx`

**Pattern:**
1. Component mounts
2. Reads from Zustand store
3. Renders data from store
4. User interaction → store dispatch → store updates → re-render

**Design System:**
- Typography: Noto Serif (headlines), Noto Sans (body)
- Colors: #131313 (bg), #E3C372 (primary gold), #C6C6C7 (secondary)
- Cinematic utilities: `.etched-gold`, `.cinematic-panel`, `.vignette-overlay`
- Reference-driven layout (when user provides image/screenshot, replicate layout exactly)

---

## 📱 Tab System & Data Ownership

### Tab 1: Celestial Pendulum
**Status:** Phase 1 complete (live timers)

**What it tracks:**
- All world cycles (Cetus day/night, Cambion zone, Zariman state, etc.)
- All bounties per world (name, tier, level, rewards)
- Drop rates & loot tables (mission → reward mappings)
- Key resources by cycle (farming recommendations)
- Completion flag: "I've farmed this world this cycle"

**Features:**
- Live cycle timers with countdowns
- Bounty list filtered by world/cycle
- Drop rate explorer (what drops from which mission?)
- Farming optimization (resource recommendations by cycle)
- Optional completion flag (syncs to Dailies & Weeklies)

**Future Phases:**
- **Phase 2:** Integrated map (visual world exploration)
- **Phase 3:** Calendar/cycle planner (forecast next 7 days of cycles)

**Data Sources:**
- Warframestat API: `worldstate`, `bounties`, `fissures`
- Warframe Market API: drop rates, loot tables
- Dexie tables: `worldstate`, `bounties`, `fissures`

---

### Tab 2: Solar Rail Feed
**Status:** Placeholder (Phase 1 in planning)

**What it tracks:**
- Invasions (faction vs. faction, progress, rewards)
- Alerts (mission type, location, difficulty, rewards, expiry)
- Events (seasonal/limited-time activities)
- Sorties (daily 3-mission chain, modifiers, rewards)
- Archon Hunt (weekly 3-mission + boss, Archon Shards)
- Arbitrations (rotating high-difficulty mission)
- Persistent Enemies / Acolytes (active spawns, unique drops)
- News (official announcements)
- **Everything EXCEPT cycles** (that's Celestial Pendulum)

**Features:**
- Live activity feed (what's happening NOW)
- Time-to-expiry indicators (alerts, invasions, events)
- Reward ranking (high-value items highlighted)
- Completion flag: "I've completed/watched this"
- Optional link to Dailies & Weeklies

**Design:**
- Feed-like list view (most urgent/expiring first)
- Scannable layout with clear hierarchy
- Click to expand for full details

**Data Sources:**
- Warframestat API: `invasions`, `alerts`, `events`, `sorties`, `archonHunt`, `arbitrations`, `acolytes`, `news`
- Dexie tables: `invasions`, `alerts`, `events`, `sorties`, `archonHunt`, `arbitrations`, `acolytes`, `news`

---

### Tab 3: Dailies & Weeklies
**Status:** Not started (killer feature)

**What it tracks:**
- Nightwave challenges (seasonal battle pass)
- Personal challenge progress (XP earned, tier unlocked)
- Daily/weekly checklist with completion state
- Rewards overview (what tiers unlock what)

**Features:**
- Challenge list grouped by daily/weekly
- Progress bars (XP toward next tier)
- Completion checkboxes (persistent in Dexie)
- Auto-link to Celestial Pendulum ("Go farm this world")
- Auto-link to Solar Rail Feed ("Go run this alert/invasion")
- Persistent completion state (survives app close/reopen)

**Ownership:**
- **Owns:** Completion state, Nightwave data
- **Referenced by:** Celestial Pendulum & Solar Rail Feed (light flags)
- **Never duplicates:** Other tabs reference, don't own completion

**Data Sources:**
- Warframestat API: `nightwave`
- Dexie table: `nightwave`, `completionFlags`

---

### Tab 4: Ascension Registry
**Status:** Stub (Mastery & Progression Tracker)

**What it tracks:**
- Warframe collection (own/need, mastery rank per frame)
- Weapon collection (own/need, mastery rank per weapon)
- Companion collection (own/need, variants)
- Archwing collection (own/need)
- Overall mastery rank + path to next rank

**Features:**
- Sortable collection view (by name, rarity, mastery)
- Unlock checklist (what you still need)
- Mastery calculator (how many points to next rank?)
- Links to farming guides (via Celestial Pendulum)

**Data Sources:**
- Future: EE.log parser (Tauri Rust backend)
- For now: Manual entry or import

---

### Tab 5+: Others
**Status:** Placeholder stubs

- Void Reliquaries (fissure relic tracking)
- Loadout Builder (gear optimization)
- Market Tracker (price tracking)
- Notes / Custom Tracking
- Settings

---

## 🔄 Data Sync & Cache Strategy

### On App Launch
1. SyncService starts
2. Checks Dexie for cached data + stored ETag
3. If ETag found, sends GET to Worker with `If-None-Match: <etag>`
4. Worker responds:
   - **304 Not Modified:** Use Dexie cache (no parse needed)
   - **200 OK:** New data received, store in Dexie, update Zustand
5. Zustand dispatches → React re-renders

### Periodic Polling (Heartbeat)
1. Timer fires every 30s–5m (configurable)
2. SyncService sends GET to Worker with current ETag
3. Same 304/200 logic as above
4. If data changed, Dexie + Zustand updated

### Offline Mode
- Dexie cache is source of truth
- User sees cached data (timestamps indicate staleness)
- When back online, periodic polling kicks in
- User can force refresh on demand

### Data Freshness Guarantees
| Data | Freshness | Why |
|------|-----------|-----|
| World cycles | ~1–60 seconds | Worker cron every 60s, ETag diff detects changes |
| Bounties | ~1–60 seconds | Tied to world state changes |
| Alerts | ~1–60 seconds | Alerts expire frequently, ETag catches new ones |
| Invasions | ~1–60 seconds | Same as alerts |
| Sorties | ~24 hours | Static until daily reset |
| Archon Hunt | ~7 days | Static until weekly reset |
| News | ~varies | Pulled on demand |

---

## 🛠️ Key Technical Features

### 1. JSON Parsing Resilience
- Try parse incoming JSON
- If parse fails, fall back to stale Dexie cache
- Log error but don't crash app
- User continues with outdated data until next successful sync

### 2. Autonomous Polling
- Heartbeat continues even if one fetch fails
- Network error doesn't stop app
- Retries automatically on next interval
- User can force refresh

### 3. ETag Optimization
- Worker computes SHA-1 hash of full response
- Client stores ETag in Dexie
- Conditional GET: sends ETag in `If-None-Match` header
- 304 response = zero bytes transferred, zero JSON parse
- Saves ~2 MB per unchanged response

### 4. Hexagonal Isolation
- Business logic lives in `src/core/services/`
- Pure TS functions (no React, Dexie, fetch)
- Adapters inject dependencies (fetch via SyncService, storage via DexieAdapter)
- Easy to test: mock adapters, run pure services

### 5. Completion State Decoupling
- Only Dailies & Weeklies tab owns completion state
- Other tabs reference via light flag (e.g., "mark this bounty done? → link to Dailies")
- Completion stored in Dexie `completionFlags` table
- No duplication, single source of truth

---

## 📊 Current Implementation Status

| Tab | Status | Phase | Key Features |
|-----|--------|-------|--------------|
| **Celestial Pendulum** | Phase 1 Complete | Live timers working | ✅ World cycles, ✅ Live timers, ⏳ Bounties (partial), ⏳ Drop rates (partial) |
| **Solar Rail Feed** | Placeholder | Planning | ⏳ All activity tracking (not started) |
| **Dailies & Weeklies** | Not Started | Killer feature | ⏳ Nightwave tracking, ⏳ Completion state, ⏳ Progress bars |
| **Ascension Registry** | Stub | Research | ⏳ Mastery tracker, ⏳ Collection management |
| **Void Reliquaries** | Stub | Future | ⏳ Relic tracking |
| **Others** | Stubs | Future | Placeholder components |

---

## 🚀 Recent Work & Commits

```
be8e220  Fix sync layer: JSON parsing resilience, autonomous polling, heartbeat reconciliation
8edc1ae  Armor-plate non-deterministic expirations against the Fissure Problem
bd42453  Trigger CI/CD test
c13cf25  Update SyncService.ts
540f089  Add resilient fetching with fallback + LocalStorage cache to SyncService
```

---

## 📚 Key Files & Locations

### Architecture
- `src/core/domain/` — Type definitions
- `src/core/services/` — Business logic
- `src/adapters/api/SyncService.ts` — Fetch + polling logic
- `src/adapters/storage/schema.ts` — Dexie schema
- `src/store/` — Zustand stores
- `src/features/` — Vertical slices per tab

### Cloudflare Worker
- `cloudflare-worker/src/index.ts` — Worker code
- `cloudflare-worker/wrangler.toml` — Worker config (cron trigger)

### Dev Fallback
- `api/worldstate.ts` — Vercel function (dev only, not in production)

### Styling
- `src/index.css` — Global styles + cinematic utilities
- Typography: Noto Serif, Noto Sans
- Color tokens: #131313, #E3C372, #C6C6C7

### References
- `Reference-for-Tennoplan/cinematic-variants/` — UI reference images per tab

---

## 🎯 Design System & UI Rules

### Typography
- **Headlines:** Noto Serif (cinematic, heavy weight)
- **Body:** Noto Sans (readable, smaller weight)
- **Special:** Etched gold text-shadow for premium feel

### Color Palette
- **Background:** #131313 (dark, cinematic)
- **Primary:** #E3C372 (gold, Orokin aesthetic)
- **Secondary:** #C6C6C7 (muted gray)
- **Accents:** Warframe-themed (void energy, etc.)

### Layout Rules
1. **User reference has absolute priority** — When user provides Lovable URL, screenshot, or image from tab folder, replicate layout exactly (panel arrangement, spacing, flow)
2. **No creative liberties on layout** — Don't replace reference with tabs, glass panels, or extra decorations unless reference shows them
3. **Background is secondary** — After layout is matched, apply background shown in reference
4. **Reference folder:** `/Reference-for-Tennoplan/cinematic-variants/[tab-name]/` stores image references per tab

---

## 🔐 Data & Privacy

- **All local:** Data cached in Dexie, no cloud sync (yet)
- **Completion state:** Stored in Dexie, persists across sessions
- **No auth:** App doesn't require login (player-private)
- **Future:** Server sync for cross-device state (planned but not implemented)

---

## 🎓 Knowledge Base for Developers

### For Grok (AI Assistant)
- Reference: `/Notes/Data_Architecture_Summary.md` — Full data flow + Cloudflare Worker details
- Reference: `/Notes/Celestial_Pendulum_System.md` — World/bounty/loot system
- Reference: `/Notes/Solar_Rail_Feed_System.md` — Activity feed system
- Reference: `/Notes/Celestial_Pendulum_System.md` — Complete feature scope

### For Code Review
- Hexagonal architecture enforced in src/core/
- No React/Dexie imports in business logic
- ETag-aware polling in SyncService
- JSON parse resilience with Dexie fallback
- Tab ownership rules (no data duplication)

### Build Commands
```bash
npm run dev          # Vite dev server (frontend only)
npm run build        # tsc -b && vite build
npx tsc --noEmit     # Type-check
```

---

## 🔮 Future Roadmap

### Phase 2: UI Polish & Advanced Features
- Celestial Pendulum: Integrated map
- Solar Rail Feed: Activity sorting by urgency
- Dailies & Weeklies: Auto-linking to farming locations
- Ascension Registry: Mastery calculator + unlock tracker

### Phase 3: Planning & Forecasting
- Celestial Pendulum: Cycle calendar (next 7 days)
- Solar Rail Feed: Event timeline
- Dailies & Weeklies: Challenge planning (which challenges to prioritize?)

### Phase 4: Player-Specific Data
- EE.log parser (Tauri Rust backend)
- Loadout Builder
- Market Tracker (price trends)
- Custom Notes / Markers

### Phase 5: Cloud Sync
- Server-side completion state (optional cloud backup)
- Cross-device sync
- Community data sharing (optional)

---

## 📝 Self-Maintenance

**Rule:** After every major phase or significant UI change, update this file and CLAUDE.md to reflect new patterns so future work stays consistent.

Last updated: **2026-04-17**  
Next review: When Phase 1 (Celestial Pendulum) is fully complete

---

**This document is the source of truth for Tennoplan's architecture, status, and design principles.**
