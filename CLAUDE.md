# CLAUDE.md — Tennoplan Project Memory

## Project
Tennoplan: offline-first Warframe companion desktop app.
One window for everything a Tenno cares about — world cycles, relics, foundry, trading, dailies, analytics.

## Architecture
Hexagonal (Clean Architecture). Core domain has ZERO deps on UI/API/storage.
```
src/core/domain/     — pure types & entities
src/core/services/   — pure business logic (timers, pulses, valuations)
src/adapters/api/    — WorldstateAdapter, MarketAdapter
src/adapters/storage/— Dexie/IndexedDB (source of truth)
src/adapters/log/    — EE.log parser (Rust-side via Tauri commands)
src/features/        — vertical slices, one folder per sidebar tab
src/store/           — Zustand stores (navigation, per-feature)
src/components/layout/ — AppShell, Sidebar, Header
```

## Tech Stack
- **Desktop**: Tauri 2 + Rust backend (not yet initialized — Rust must be installed first)
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (CSS-first @theme config in src/index.css)
- **Components**: shadcn/ui (New York style, configured in components.json)
- **State**: Zustand (global) + TanStack Query (data fetching/cache)
- **Local DB**: Dexie.js (IndexedDB) — src/adapters/storage/db.ts
- **Icons**: lucide-react (NOT Material Symbols)

## Design System (The Orokin Digital Standard)
- **Theme**: src/index.css @theme block — 30+ Material Design 3 dark tokens
- **Colors**: Background #131313, Primary gold #E3C372, Container #C1A355, Secondary #C6C6C7
- **Fonts**: Noto Serif (headlines/display), Inter (body/labels)
- **Border radius**: Very small (0.125rem default) — Orokin precision aesthetic
- **Patterns**: Glass panels (backdrop-blur), filigree corners, somatic gold lines, ghost borders (20% opacity)
- **Rules**: No heavy borders, no rounded corners > 8px, no pure white (#F2F2F2 max), asymmetric layouts

## Navigation (Zustand tab store — src/store/navigation.ts)
No router. Tab switching is instant via `useNavigationStore`.
10 sidebar tabs (lore-named):
1. celestial-pendulum → World Cycles/Timers
2. void-reliquaries → Fissures/Relics
3. arsenal-fabrication → Inventory & Foundry
4. ascension-registry → Dailies & Weeklies / Mastery
5. scholars-arcanum → Builds & Theorycraft
6. bazaar-of-seven → Market & Trading
7. solar-rail-feed → News/Alerts/Dashboard
8. platinum-ledger → Economy tracking
9. neural-archive → Analytics & Session Logs
10. cephalon-weave → Settings/Overlays

## Page Pattern
Every page uses the "Celestial Asymmetry Header": 12-col grid with large serif title (col-span-8) + status block (col-span-4). Second word of title is gold italic.

## Data Sources
- Worldstate: https://api.warframestat.us/ (WFCD)
- Market: https://api.warframe.market/v2/
- Items/Relics: Bundled JSON from WFCD/warframe-items + warframe-relic-data
- EE.log: Tauri FS plugin + Rust parser

## Key Conventions
- Offline-first: Dexie is source of truth, background sync when online
- Feature slices: each feature gets its own folder under src/features/
- All UI labels: uppercase, wide tracking, Inter font
- Import alias: `@/` maps to `src/`

## Commands
```bash
npm run dev        # Vite dev server (frontend only)
npm run build      # Production build
npm run lint       # ESLint
# npm run tauri:dev  # Full Tauri dev (requires Rust installation)
# npm run tauri:build # Full Tauri production build
```

## Current Phase
Phase 0 (Foundation) — COMPLETE
- AppShell + Sidebar + Header + 10 placeholder pages
- Tailwind v4 design system with full MD3 tokens
- Zustand navigation store
- Dexie database schema
- BackgroundDecorations (void watermark + light leaks)

## Next Phase
Phase 1: Core domain types + Celestial Pendulum (world cycles dashboard)
