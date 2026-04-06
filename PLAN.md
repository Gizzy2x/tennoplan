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
│   │   ├── domain/                  # Types & Entities
│   │   ├── services/                # Pure logic (TimerService, PulseService, etc.)
│   │   └── utils/
│   ├── adapters/                    # Hexagonal "Outside"
│   │   ├── api/                     # WorldstateAdapter, MarketAdapter
│   │   ├── storage/                 # Dexie schemas & repositories
│   │   └── log/                     # EE.log parser commands
│   ├── lib/                         # Constants, config, types
│   ├── store/                       # Zustand stores (one per feature when needed)
│   ├── App.tsx                      # Root with AppShell
│   └── main.tsx
├── src-tauri/                       # Rust backend
│   ├── src/
│   │   └── commands/                # Tauri commands (read EE.log, etc.)
│   └── tauri.conf.json
├── public/                          # Static assets, bundled JSON data
├── package.json
└── README.md
text


## 5. Data Sources (Confirmed April 2026)

- **Worldstate** → `https://api.warframestat.us/` (WFCD — most reliable, full OpenAPI, cycles, fissures, Nightwave, alerts, Baro, etc.)
- **Market** → `https://api.warframe.market/v2/` (v2 is current; auth required for personal orders)
- **Items / Relics / Drops** → Bundle latest JSON from `https://github.com/WFCD/warframe-items` and `warframe-relic-data`
- **EE.log** → Read via Tauri FS + parser (community tools like WFCD/warframe-deathlog confirm this is safe and widely used)

## 6. Frontend UI Vision (High-Level)

- **AppShell**: Fixed sidebar (nav items with active states), top header (logo, search, user/settings), main content area that swaps via Zustand tab state.
- **Theme**: Dark Warframe aesthetic (deep blacks, glowing accents, Orokin-inspired UI elements). Exact colors/spacing/typography will be provided by you in Claude prompts using your liked stitch screenshot.
- **Navigation Tabs** (sidebar order):
  1. Dashboard (teasers + pulse counter)
  2. Dailies & Weeklies (unique killer feature)
  3. World Cycles / Timers
  4. Fissures / Relics
  5. Inventory & Foundry
  6. Market & Trading
  7. Builds & Theorycraft
  8. Analytics & Session Logs
  9. Settings / Overlays

All persistent elements live in **one** `AppShell` component.

## 7. Implementation Stages (Vertical Slicing + Your Blueprint)

Follow this loop for **every** feature:
1. **Define** — Update PLAN.md with exact goal.
2. **Scaffold** — UI + lorem data only.
3. **Validate** — Run `npm run tauri dev`, check layout.
4. **Hydrate** — Add core logic + storage + API adapter.
5. **Commit** — Git commit.
6. **Refactor** — Every 3–4 features: "Refactor for readability and performance without changing functionality."

### Phase 0: Foundation (1–2 Claude sessions)
- Create fresh Tauri + React + TS + Vite project.
- Add Tailwind + shadcn/ui + Zustand + TanStack Query + Dexie.
- Build `AppShell` + Sidebar navigation + dark theme.
- Set up Dexie schema (basic tables: settings, cache, user-marks).
- Basic sync engine skeleton.
- Update PLAN.md.

### Phase 1: Core Domain + Dashboard (Foundation Slice)
- Define all shared domain types & services (timers, pulses, etc.).
- Dashboard: World cycle teasers, active fissures, pulse counter, quick links.
- Mock data → real API adapter (warframestat.us).

### Phase 2: Dailies & Weeklies (Killer Feature — Priority)
- Weekly reset banner + pulse visualizer (5/5, history, drag-and-drop spending).
- Netracell tracker, Elite Deep Archimedea (EDA), Elite Temporal Archimedea (ETA/TA).
- Nightwave (dailies + weeklies + elite) with checkboxes + standing.
- Other weeklies (Archon Hunt, Circuit, etc.).
- Local persistence + auto-reset logic (Monday 00:00 UTC).
- Core pulse deduction service.

### Phase 3: World Cycles / Timers
- Full live timers (Cetus, Vallis, Cambion, Earth, daily reset, etc.).
- Offline ticking from local cache.

### Phase 4: Fissures / Relics
- Active fissures list, relic planner, reward valuation (plat/ducat using cached market data).

### Phase 5: Inventory & Foundry
- Owned items, build timers (offline ticking), crafting trees, mastery tracking.

### Phase 6: Market & Trading + Rivens
- Personal orders, market listings, price analytics (rate-limited caching).

### Phase 7: Builds & Theorycraft + Mastery
- Basic Overframe-style display (static for now; expand later).

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