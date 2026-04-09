# Tennoplan — Comprehensive Development Plan

**Version**: 1.0 (April 2026)  
**Status**: Living Document — Update this file after every major milestone or refactor.  
**Goal**: Build the ultimate offline-first Warframe companion desktop app that feels native, never loses your progress, and gives Tenno one beautiful window for everything they care about in-game.

## 1. Vision & Core Philosophy

**Tennoplan** is a sleek, dark-themed Tauri desktop app that acts as your personal Warframe command center. It combines live worldstate data, personal inventory tracking, trading tools, theorycrafting, and a **killer unique Dailies & Weeklies** tab that no other tool fully unifies.

**Offline-First is non-negotiable**:
- Local cache = Source of Truth.
- All timers (foundry, cycles, pulses, Nightwave) continue ticking even if Warframe servers or your internet are down.
- UI reacts instantly to local data.
- Background sync engine pushes/pulls from APIs when online.
- Everything works 100% offline after first sync.

**User Experience Vibe**:
- Persistent AppShell with fixed left sidebar (≈240px, Warframe dark aesthetic), top header, and flexible main content area.
- Sidebar navigation switches tabs instantly (no full reload).
- Clean, modern, high-contrast UI with Warframe-inspired colors, icons (lucide-react), and subtle animations.
- You will provide Claude with screenshots of your liked "stitch" / single-panel layout for exact colors, spacing, typography, and Warframe theme when prompting for UI.

## 2. Architecture — Hexagonal (Clean Architecture)

We strictly follow **Hexagonal Architecture** so the core business logic never depends on UI, APIs, or storage details.

- **Core / Domain** (inside the hexagon — pure, never changes):
  - Entities & Types (`Item`, `Relic`, `Cycle`, `PulseTracker`, `FoundryBuild`, `NightwaveAct`, etc.)
  - Pure business logic (timer calculations, pulse deduction rules, price valuation, set completion checks, etc.)
  - Entities & Types (`Item`, `Relic`, `Cycle`, `PulseTracker`, `FoundryBuild`, `NightwaveAct`, `ItemWithIcon`, `DropTableEntry`, etc.)

- **Adapters** (outside the hexagon — pluggable):
  - **API Adapters**: `WorldstateAdapter`, `MarketAdapter`
  - **Storage Adapter**: Dexie/IndexedDB (primary), with future Tauri SQLite option
  - **Log Adapter**: EE.log parser (Rust-side for safety)
  - **UI Adapter**: React components

- **Sync Engine**:
  - Optimistic local writes → queue changes → background flush when online.
  - TanStack Query for caching + stale-while-revalidate.
  - Retry logic with exponential backoff.

- **Feature Modules** (vertical slices):
  - Each major tab lives in its own `src/features/` folder with its own store, components, core logic, and adapter hooks.

This makes the app extremely maintainable: if warframe.market changes, you only edit one adapter file.

## 3. Tech Stack (All Free — 2026)

| Layer          | Technology                              | Why |
|----------------|-----------------------------------------|-----|
| Desktop        | Tauri 2 + Rust backend                 | Tiny size, secure, native feel |
| Frontend       | React 19 + TypeScript + Vite           | Fast, excellent ecosystem |
| Styling        | Tailwind CSS + shadcn/ui (or DaisyUI)  | Beautiful, customizable components |
| State          | Zustand (global) + TanStack Query      | Lightweight + powerful data fetching |
| Local DB       | Dexie.js (IndexedDB)                   | Best for offline-first in Tauri webview; fast queries, indexes, reactive |
| Icons          | lucide-react                           | Clean, free |
| API Clients    | Native fetch + warframestat.us + warframe.market v2 | Official community sources |
| Static Data    | WFCD/warframe-items + warframe-relic-data (bundled JSON) | Always up-to-date items/relics |
| EE.log         | Tauri FS plugin + custom Rust parser (inspired by WFCD/warframe-deathlog) | Safe file reading |
| Versioning     | Git + GitHub                           | Easy rollbacks |
- Asset Management: Vite static imports + Dexie blob caching for dynamic icons + Tauri FS for larger background images
**No heavy ORMs or paid services.** Start simple, scale only when needed.

## 4. Project Folder Structure

tennoplan/
├── PLAN.md                          # This file — update after every phase
├── src/
│   ├── components/                  # Reusable UI: AppShell, Sidebar, Header, etc.
│   ├── features/                    # Vertical slices — one folder per major tab
│   │   ├── dashboard/
│   │   ├── dailies-weeklies/        # Killer feature — pulses, Netracell, EDA/ETA, Nightwave
│   │   ├── world-cycles/
│   │   ├── fissures-relics/
│   │   ├── inventory-foundry/
│   │   ├── market-trading/
│   │   ├── builds-theorycraft/
│   │   ├── analytics-session/
│   │   └── overlays-helpers/
│   ├── core/                        # Hexagonal "Inside"
│   │   ├── domain/                  # Types & Entities (add: ItemWithIcon, DropTableEntry, etc.)
│   │   ├── services/                # Pure logic (TimerService, PulseService, IconService, DropTableService, etc.)
│   │   └── utils/                   # Pure utilities (getItemIconPath, resolveDropChance, etc.)
│   ├── adapters/                    # Hexagonal "Outside"
│   │   ├── api/                     # WorldstateAdapter, MarketAdapter, DropTableAdapter
│   │   ├── assets/                  # New: IconResolver, ImageCache, AssetLoader
│   │   ├── storage/                 # Dexie schemas & repositories (add icon/blob caching tables)
│   │   └── log/                     # EE.log parser commands
│   ├── lib/                         # Constants, config, types (add: AssetPaths, WarframeCDN)
│   ├── store/                       # Zustand stores (one per feature when needed)
│   ├── App.tsx                      # Root with AppShell
│   └── main.tsx
├── src-tauri/                       # Rust backend
│   ├── src/
│   │   └── commands/                # Tauri commands (read EE.log, asset management if needed)
│   └── tauri.conf.json
├── public/
│   ├── assets/
│   │   ├── icons/                   # Bundled Warframe item icons (organized by category or flat)
│   │   ├── images/                  # Backgrounds, cinematic stills, relic images, etc.
│   │   └── data/                    # Bundled JSON: warframe-items.json, relics.json, drop-data.json (minified subsets)
│   └── icons/                       # Optional flat fallback for direct /icons/ access
├── package.json
└── README.md
text


## 5. Data Sources (Confirmed April 2026)

- **Worldstate** → `https://api.warframestat.us/` (WFCD — most reliable, full OpenAPI, cycles, fissures, Nightwave, alerts, Baro, etc.)
- **Market** → `https://api.warframe.market/v2/` (v2 is current; auth required for personal orders)
- **Items / Relics / Drops** → Bundle latest JSON from `https://github.com/WFCD/warframe-items` and `warframe-relic-data`
- **EE.log** → Read via Tauri FS + parser (community tools like WFCD/warframe-deathlog confirm this is safe and widely used)
- **Item Icons & Assets** → Bundle PNGs from `warframe-items` (using `imageName` field). Primary CDN fallback: `https://cdn.warframestat.us/images/${imageName}`. All critical icons are bundled for true offline use.
- **Drop Tables** → `https://github.com/WFCD/warframe-drop-data` (bundle `all.json` or key subsets in `public/assets/data/`). Live fetch via `DropTableAdapter` with aggressive caching (drops change infrequently).

## 6. Frontend UI Vision (High-Level)

- **AppShell**: Fixed sidebar + persistent top bar.
- **Top Bar (persistent on every page)**: Includes a prominent **Dailies & Weeklies** button in the middle. Clicking it switches the main content area (same as sidebar tabs).
- **Sidebar Navigation Tabs** (order):
  1. Celestial Pendulum — world cycle timers 
  2. Void Reliquaries — active fissures 
  3. Solar Rail Feed — live events, invasions, alerts
  4. Ascension Registry — Mastery & Progression Tracker (MR, item unlock/check-off)
  5. Dailies & Weeklies — **Killer feature** (Nightwave, Pulse, Netracell, EDA/ETA, full checklist). Accessed primarily via top bar.
  6. Inventory & Foundry
  7. Market & Trading
  8. Builds & Theorycraft
  9. Analytics & Session Logs

**Important Rule:**  
Side tabs are simple and focused on their core content. They may only include a small "Completed" flag + link that opens the Dailies & Weeklies tab. Completion/tracking state is owned **only** by the Dailies & Weeklies tab (persisted in Dexie).

**Rule:** Simple side tabs (1–3) display only their core data + a small "Completed" flag that links to the Tracking Dashboard. They never own or duplicate completion state.

All persistent elements live in **one** `AppShell` component.

### Phase 0: Foundation (Done)

### Phase 1: World Cycles + Fissures (Done)

### Phase 2: Dailies & Weeklies (Killer Feature — Complete April 2026)
- Nightwave challenges (daily/weekly/elite), Archon Hunt, Sortie fully implemented.
- Challenge completion toggled locally → persisted in Dexie `userMarks`.
- Weekly standing cap progress tracked across daily rotations.
- Reset countdowns (daily/weekly), season label, per-kind completion fraction.

**Phase 2 offline hardening (April 2026):**
- `worldstateCache.ts` — typed Dexie repo with embedded `cachedAt`, `ws:` key namespace.
- `WorldstateService.ts` — pure `getCacheAgeMs` / `formatCacheAge` / `isNightwaveActive`.
- `WorldstateAdapter.ts` — `?language=en` endpoints, `WSFetchResult<T>` with `fromStaleCache` flag.
- `useDailiesData.ts` — TanStack Query v5 `initialData` + `initialDataUpdatedAt` pre-load pattern; queries activate only after Dexie pre-load resolves.
- Hard-fail "SIGNAL LOST" / "ARCHON HUNT UNAVAILABLE" states eliminated.
- Graceful first-launch onboarding card (no network + no cache).
- Subtle "Offline · Cached Xm ago · Local marks persist" banner when serving stale data.

**Remaining for Phase 2+:** Pulse tracker, Netracell, EDA/ETA, top-bar persistent access.

**Phase 2b: Offline-First Parity (April 2026):**
- `WSFetchResult<T>` extracted to shared `src/adapters/api/types.ts` (used by all adapters).
- `worldstateCache.ts` — added `ws:fissures` and `ws:cycle:{id}` cache keys.
- `WorldstateAdapter.ts` renamed to `cyclesAdapter.ts` (clarity: it only handles world cycles).
- `fissureAdapter.ts` — migrated from legacy `db.cache` to `worldstateCache.ts`; returns `WSFetchResult<Fissure[]>` with `fromStaleCache` / `cachedAt`.
- `cyclesAdapter.ts` — migrated from legacy `db.cache` to `worldstateCache.ts`; returns `WSFetchResult<WorldCycle[]>` with aggregate staleness (oldest `cachedAt`, any-stale flag).
- `useFissures.ts` — added Dexie pre-load phase, `initialData`/`initialDataUpdatedAt`, `isStale`/`cacheAgeMs`/`hasEverLoaded`/`forceRefetch`.
- `useWorldCycles.ts` — same pre-load + staleness pattern + `forceRefetch`.
- `VoidReliquariesPage.tsx` — "Signal Lost" replaced with first-sync onboarding card; stale cache banner with `formatCacheAge` + force refresh / retry buttons added.
- `CelestialPendulumPage.tsx` — same treatment: first-sync card, stale banner, refresh button.
- `ascensionAdapter.ts` — deprecated (kept for legacy `useDailiesWeeklies.ts` reference only).
- All 3 data pages now show: sync status indicator (LIVE/STALE), last sync timestamp, force refresh button, graceful first-launch card, stale cache banner with age.
- Placeholder pages (6) unchanged — no data sources to sync.

**Future-proofing pattern for new data pages:**
1. Adapter: use `worldstateCache.ts` (`getWsCache`/`setWsCache`), return `WSFetchResult<T>`.
2. Hook: Dexie pre-load → TanStack Query with `initialData`/`initialDataUpdatedAt` → export `isStale`/`cacheAgeMs`/`hasEverLoaded`/`forceRefetch`.
3. Page: first-sync onboarding card, stale cache banner with `formatCacheAge`, refresh button, LIVE/STALE indicator. No hard-fail "Signal Lost" errors.
- When `useDailiesWeeklies.ts` is finally removed, also delete `ascensionAdapter.ts` and its legacy cache keys (`nightwave:all`, `sortie:daily`, `archonHunt:weekly`).
- Consider extracting a `useOfflineFirstQuery<T>` generic hook to DRY the pre-load + TanStack Query boilerplate.

### Phase 3: Ascension Registry (Mastery & Progression Tracker)
- MR rank display, item checklist (Warframes, weapons, etc.), mark as owned/mastered.
- Simple focused view with "Completed" flags linking to Dailies & Weeklies where relevant.

### Phase 4+: Remaining tabs (Inventory & Foundry, Market, etc.)

### Phase 5: Ascension Registry (Mastery & Progression Tracker)
- MR rank display, total mastery earned vs. available.
- Item checklist: Warframes, Primary, Secondary, Melee, Companions, Archwing, etc. (sourced from bundled warframe-items JSON).
- Mark items as owned/mastered; persist in Dexie userMarks. Filter by category, MR tier, owned/unowned.

### Phase 5b: Inventory & Foundry
- Owned items, build timers (offline ticking), crafting trees.

### Phase 6: Market & Trading + Rivens
- Personal orders, market listings, price analytics (rate-limited caching).

### Phase 7: Builds & Theorycraft
- Basic Overframe-style loadout display (static for now; expand later).

### Phase 8: Analytics & Session Logs + Overlays
- EE.log parser (Rust command) for death causes, mission stats.
- In-game helper overlays.

### Phase 9: Polish & Ship
- Auto-updates, custom titlebar (optional), tray icon, performance tuning.
- Full offline testing.
- Release builds for Windows/macOS/Linux.

## 8. Vibe Coding Workflow with Claude Pro

Always start prompts with:
> "We are building Tennoplan following PLAN.md exactly (offline-first, hexagonal, modular features). Current structure: [brief summary]. Here is the current code: [paste relevant files]. Now implement ONLY the [feature/slice]..."

- Upload your stitch screenshot when prompting for UI.
- One feature slice per conversation when possible.
- After UI works: "Now hydrate with core logic and adapter."
- After every major phase: "Refactor this code for readability and performance without changing behavior. Then update PLAN.md with completed items."

## 9. Maintenance Rules

- Update PLAN.md after every phase or refactor.
- Git commit after every "Validate" step.
- Never add new features until the current slice is fully working and refactored.
- Keep core/domain 100% pure (no API calls, no UI imports).

This PLAN.md is your single source of truth. We now have systems, backend strategy, frontend vision, data sources, and a clear staged roadmap. Everything is ready for clean, non-spaghetti development.

**Next Step**: Tell me when you've created the fresh project — I'll give you the exact Claude prompt to build the AppShell + Sidebar that matches your vision.