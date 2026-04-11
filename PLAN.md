# Tennoplan — Comprehensive Development Plan

**Version**: 1.1 (April 2026)  
**Status**: Living Document — Update this file after every major milestone, refactor, or visual direction change.  
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
- **Visual direction is now driven by the Cinematic Reference & Mixing System** (see CLAUDE.md). All new and existing pages can freely mix cinematic elements from reference images.

## 2. Visual Design Workflow (Cinematic-First)

- All cinematic reference images live in `/Reference-for-Tennoplan/cinematic-variants/` (create this subfolder immediately if it doesn't exist).
- When prompting for any UI (new page, redesign, or feature):
  - Upload/reference multiple cinematic images.
  - Explicitly state what you like from each image and what to avoid.
  - Claude must mix those elements exactly as instructed (see full rules in CLAUDE.md → “Cinematic Reference & Mixing System”).
- This system applies to **every page and every new feature**.
- Typography rule (cinematic style): Orokin-inspired serif for headlines (Noto Serif), Noto Sans for body/labels, heavy etched-gold text-shadow.
- Layout rule: Full-bleed cinematic backgrounds + multi-panel layouts where requested. Minimize shadcn/ui components; prefer raw divs + custom Tailwind utilities.
- Reusable CSS layer: All new cinematic patterns must be added to `src/index.css` as utilities (`.cinematic-hero`, `.cinematic-timer`, `.etched-gold`, `.cinematic-panel`, etc.) so they can be instantly reused on any page.

This workflow gives complete creative freedom: you can iterate by simply dropping more reference images and describing what you like/dislike.

## 3. Architecture — Hexagonal (Clean Architecture)

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

## 4. Tech Stack (All Free — 2026)

| Layer          | Technology                              | Why |
|----------------|-----------------------------------------|-----|
| Desktop        | Tauri 2 + Rust backend                 | Tiny size, secure, native feel |
| Frontend       | React 19 + TypeScript + Vite           | Fast, excellent ecosystem |
| Styling        | Tailwind CSS v4 + custom utilities     | Full control for cinematic style |
| State          | Zustand (global) + TanStack Query      | Lightweight + powerful data fetching |
| Local DB       | Dexie.js (IndexedDB)                   | Best for offline-first in Tauri webview; fast queries, indexes, reactive |
| Icons          | lucide-react                           | Clean, free |
| API Clients    | Native fetch + warframestat.us + warframe.market v2 | Official community sources |
| Static Data    | WFCD/warframe-items + warframe-relic-data (bundled JSON) | Always up-to-date items/relics |
| EE.log         | Tauri FS plugin + custom Rust parser (inspired by WFCD/warframe-deathlog) | Safe file reading |
| Versioning     | Git + GitHub                           | Easy rollbacks |

**No heavy ORMs or paid services.** Start simple, scale only when needed.

## 5. Project Folder Structure

tennoplan/
├── PLAN.md                          # This file — update after every phase
├── CLAUDE.md                        # Full visual + prompting rules (updated with Cinematic system)
├── Reference-for-Tennoplan/
│   └── cinematic-variants/          # ← All cinematic reference images live here
├── src/
│   ├── components/                  # Reusable UI: AppShell, Sidebar, Header, CinematicHero, CinematicTimer, etc.
│   ├── features/                    # Vertical slices — one folder per major tab
│   │   ├── celestial-pendulum/
│   │   ├── void-reliquaries/
│   │   ├── solar-rail-feed/
│   │   ├── ascension-registry/
│   │   ├── dailies-weeklies/        # Killer feature — pulses, Netracell, EDA/ETA, Nightwave
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
│   ├── lib/                         # Constants, config, types, cinematic backgrounds
│   ├── store/                       # Zustand stores (one per feature when needed)
│   ├── App.tsx                      # Root with AppShell
│   └── main.tsx
├── src-tauri/                       # Rust backend
│   ├── src/
│   │   └── commands/                # Tauri commands (read EE.log, etc.)
│   └── tauri.conf.json
├── public/                          # Static assets, bundled JSON data, backgrounds/
├── package.json
└── README.md

## 6. Data Sources (Confirmed April 2026)

- **Worldstate** → `https://api.warframestat.us/` (WFCD — most reliable, full OpenAPI, cycles, fissures, Nightwave, alerts, Baro, etc.)
- **Market** → `https://api.warframe.market/v2/` (v2 is current; auth required for personal orders)
- **Items / Relics / Drops** → Bundle latest JSON from `https://github.com/WFCD/warframe-items` and `warframe-relic-data`
- **EE.log** → Read via Tauri FS + parser (community tools like WFCD/warframe-deathlog confirm this is safe and widely used)

## 7. Frontend UI Vision (High-Level)

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

**Important Rule**:  
Side tabs are simple and focused on their core content. They may only include a small "Completed" flag + link that opens the Dailies & Weeklies tab. Completion/tracking state is owned **only** by the Dailies & Weeklies tab (persisted in Dexie).

**Cinematic Style Rule**: All pages can now use full cinematic layouts. Use the mixing system in CLAUDE.md to combine elements from any reference images you provide.

## 8. Phase Roadmap

### Phase 0: Foundation (Done)
- Tauri + React 19 + Tailwind v4 + Dexie + Zustand
- AppShell + sidebar navigation
- Hexagonal core structure

### Phase 1: World Cycles + Fissures (Done / In Progress)
- Celestial Pendulum (live timers — now ready for full cinematic redesign)
- Void Reliquaries (fissure cards)

### Phase 2: Dailies & Weeklies (Killer Feature — Current Focus)
- Nightwave challenges, Pulse tracker, Netracell, EDA/ETA, weekly checklist
- Persistent top-bar access
- All completion state lives here

### Phase 3: Cinematic Visual Overhaul (Next)
- Apply Cinematic Reference & Mixing System to Celestial Pendulum first
- Then roll out to Solar Rail Feed, Ascension Registry, etc.
- Create reusable cinematic components (`CinematicHero`, `CinematicTimer`, etc.)

### Phase 4+: Remaining Features
- Inventory & Foundry
- Market & Trading
- Builds & Theorycraft
- Analytics & Session Logs
- EE.log parser (Rust)
- Full Tauri packaging + auto-updates

**Self-maintenance**: After any major phase or visual change, update both PLAN.md and CLAUDE.md so the project stays perfectly in sync.