# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tennoplan: offline-first Warframe companion desktop app built with Tauri 2 + React 19.
One window for world cycles, relics, foundry, trading, dailies, and analytics.

## Commands

```bash
npm run dev          # Vite dev server (frontend only — no Rust needed)
npm run build        # tsc -b && vite build (production)
npx tsc --noEmit     # Type-check without emitting (use this instead of lint — see below)

# Tauri (requires Rust/rustup installed first, then: npx tauri init)
# npm run tauri:dev
# npm run tauri:build
```

> **Note:** `npm run lint` is currently broken — the project has `eslint` v9 installed but no `eslint.config.js` file. Use `npx tsc --noEmit` for validation.

## Architecture

Hexagonal (Clean Architecture). The invariant is: **`src/core/` has zero imports from React, Dexie, or fetch.**

```
src/core/domain/       — pure TS types & entities (no deps)
src/core/services/     — pure business logic functions (no deps)
src/adapters/api/      — fetch + Dexie cache (calls core types, never React)
src/adapters/storage/  — Dexie schema (db.ts: settings, cache, userMarks tables)
src/features/<tab>/    — vertical slice per sidebar tab
  components/          — UI components specific to this feature
  hooks/               — React hooks (React Query + local state)
src/store/             — Zustand stores (navigation.ts + future per-feature stores)
src/components/layout/ — AppShell, Sidebar, Header (structural only)
```

### Data flow (offline-first)

1. **Adapter** (`src/adapters/api/`) checks Dexie cache first. If fresh (within TTL), returns cached data. Otherwise fetches the API, writes raw response to `db.cache`, then returns mapped domain object.
2. If the network call fails, the adapter falls back to any Dexie record — even an expired one — and throws only if there is no cache at all.
3. **Service** (`src/core/services/`) receives domain objects and computes derived state (e.g. `extrapolateCycle` walks expired timestamps forward using approximate durations; `computeCycleStatus` derives `msRemaining` and `progress` from `Date.now()`).
4. **Hook** (`src/features/<tab>/hooks/`) wires React Query (for fetching) to a 1-second `setInterval` (for live ticking). These two concerns are kept separate so a countdown tick never triggers a re-fetch.
5. **Component** receives `CycleStatus[]` and renders — no business logic in JSX.

### React Query defaults (src/App.tsx)

`staleTime: 5min`, `gcTime: 30min`, `retry: 2`, `refetchOnWindowFocus: false`.
Feature hooks override these as needed (e.g. world cycles use `staleTime: 60s`, `refetchInterval: 60s`, `networkMode: 'always'`).

### Dexie schema (src/adapters/storage/db.ts)

| Table | Key | Purpose |
|-------|-----|---------|
| `settings` | `key: string` | Key-value app settings |
| `cache` | `key: string` | API response cache with `expiresAt` |
| `userMarks` | `++id` | User-created marks/flags on items |

Cache keys follow the pattern `worldstate:cycle:<id>` (e.g. `worldstate:cycle:cetus`).

### Navigation (src/store/navigation.ts)

No router. `useNavigationStore` holds `activeTab: NavTab`. `AppShell` maps each tab to its page component via `PAGE_MAP`. Adding a new tab = add to `NavTab` union + `NAV_ITEMS` array + `PAGE_MAP`.

## Design System — The Orokin Digital Standard

All tokens live in `src/index.css` inside `@theme {}` (Tailwind v4 CSS-first config).

- **Background** `#131313`, **Primary gold** `#E3C372`, **Secondary** `#C6C6C7`, **Tertiary** `#bac3fe`
- **Fonts**: `font-headline` = Noto Serif (titles only), `font-label` / `font-body` = Inter
- **Radius**: 0.125 rem default — never exceed 8 px (`rounded-lg`)
- **No pure white** — `#F2F2F2` is the ceiling (`text-on-surface` = `#E5E2E1`)

Custom CSS utilities defined in `index.css`:

| Class | Effect |
|-------|--------|
| `.glass-panel` | `backdrop-blur(12px)` + semi-transparent dark bg + top border |
| `.somatic-line` | Full-width 1 px gold gradient divider |
| `.filigree-corner` | Absolute-positioned corner bracket (gold, 20% opacity) |
| `.ghost-border` | 1 px border at 20% opacity |
| `.relic-glow` | Hover glow with gold shadow |

### Page header pattern ("Celestial Asymmetry Header")

Every page uses a `grid grid-cols-12` header:
- `col-span-8`: large serif title (`text-7xl font-black`) — second word in `text-primary italic`
- `col-span-4`: right-aligned status/metric block with `border-l border-primary/20`
- Followed by a `<div class="somatic-line mb-8" />`

### State color conventions (established in CycleCard)

Use `style={{ color: hex }}` for non-theme colors rather than inventing Tailwind classes:
`#E3C372` day/gold, `#bac3fe` night/tertiary, `#fb923c` warm/fass, `#67e8f9` cold, `#c084fc` vome, `#60a5fa` corpus, `#f87171` grineer.

## Implemented features

| Tab | Status | Key files |
|-----|--------|-----------|
| celestial-pendulum | **Phase 1 complete** | `core/domain/cycles.ts`, `core/services/cycleService.ts`, `adapters/api/worldstateAdapter.ts`, `features/celestial-pendulum/` |
| All others | Placeholder stub | `features/<tab>/<Tab>Page.tsx` |

## Data sources

- Worldstate: `https://api.warframestat.us/pc/{cetusCycle|vallisCycle|cambionCycle|zarimanCycle|earthCycle}`
- Market: `https://api.warframe.market/v2/` (not yet implemented)
- EE.log: Tauri FS plugin + Rust parser (not yet implemented — requires Rust)

### Warframe worldstate API quirks

- Cambion Drift uses `active` field (not `state`) for fass/vome — see `normalizeState()` in `worldstateAdapter.ts`
- All expiry/activation values are ISO 8601 strings — convert with `new Date(str).getTime()`
- `timeLeft` string from the API is human-readable only; always derive remaining time from `expiry` timestamp
