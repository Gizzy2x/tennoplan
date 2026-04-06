# CLAUDE.md

> **Self-maintenance rule:** After every major phase or significant UI change, update this file to reflect new patterns so future work stays consistent.

## Project

Tennoplan: offline-first Warframe companion desktop app built with Tauri 2 + React 19.
One window for world cycles, relics, foundry, trading, dailies, and analytics.

## Commands

```bash
npm run dev          # Vite dev server (frontend only)
npm run build        # tsc -b && vite build
npx tsc --noEmit     # Type-check (use instead of lint — no eslint.config.js exists)
```

## Architecture

Hexagonal (Clean Architecture). **`src/core/` has zero imports from React, Dexie, or fetch.**

```
src/core/domain/       — pure TS types & entities
src/core/services/     — pure business logic
src/adapters/api/      — fetch + Dexie cache
src/adapters/storage/  — Dexie schema (db.ts: settings, cache, userMarks)
src/features/<tab>/    — vertical slice per tab (components/ + hooks/)
src/store/             — Zustand stores (navigation.ts)
src/components/layout/ — AppShell, Sidebar, Header
```

**Data flow:** Adapter checks Dexie cache → fetches if stale → falls back to expired cache on network failure. Service computes derived state. Hook wires React Query + 1 s tick (separate concerns — tick never triggers re-fetch). Component renders only.

**Navigation:** No router. `useNavigationStore` → `activeTab: NavTab`. Adding a tab = update `NavTab` union + `NAV_ITEMS` + `PAGE_MAP` in AppShell.

## Design System — The Orokin Digital Standard

Tokens live in `src/index.css` inside `@theme {}` (Tailwind v4 CSS-first).

- **Background** `#131313`, **Primary gold** `#E3C372`, **Secondary** `#C6C6C7`, **Tertiary** `#bac3fe`
- **Fonts**: `font-headline` = Noto Serif, `font-label` / `font-body` = Inter
- **Radius**: max 8 px (`rounded-lg`). **No pure white** — ceiling is `#F2F2F2` (`text-on-surface` = `#E5E2E1`)

| Class | Effect |
|-------|--------|
| `.glass-panel` | `backdrop-blur(12px)` + semi-transparent dark bg + top border |
| `.somatic-line` | Full-width 1 px gold gradient divider |
| `.filigree-corner` | Absolute corner bracket (gold, 20% opacity) |
| `.ghost-border` | 1 px border at 20% opacity |
| `.relic-glow` | Hover glow with gold shadow |

**Page header ("Celestial Asymmetry Header"):** `grid grid-cols-12` — `col-span-8` large serif title (`text-7xl font-black`, second word `text-primary italic`) + `col-span-4` right-aligned metric block (`border-l border-primary/20`) + `<div class="somatic-line mb-8" />`.

**State colors** (use `style={{ color: hex }}`, not custom Tailwind classes):
`#E3C372` day/gold · `#bac3fe` night · `#fb923c` fass · `#67e8f9` cold · `#c084fc` vome · `#60a5fa` corpus · `#f87171` grineer/SP

## Orokin Typography & Text Effects

- Mission types and tier headers: `font-headline` (Noto Serif) + `font-black`.
- Etched gold text-shadow: `0 1px 3px rgba(227,195,114,0.25)` — soft depth, never a glow.
- Body text gets no text-shadow. Reserve glow effects for active-state indicators only.
- Tier labels: `text-xs uppercase tracking-widest text-primary/60` (muted gold).

## Glanceability Principles

Scan order within a card must be intentional. Established in FissureCard (Void Reliquaries):

1. **Icon + mission type** — leftmost, highest contrast. Left ~35% of card uses near-full transparency + strong `backdrop-blur` so the relic icon reads against the blurred background, not a flat fill.
2. **SP / tier badge** — immediately right of icon. Steel Path gets a 1 px `#f87171` top border at ~15% opacity + subtle warm interior tint — signals danger without shouting.
3. **Time + progress bar** — rightmost; lowest urgency at a glance, highest precision when inspected.

**Tier gradients:** Subtle right-to-left gradient per tier, 10–15% opacity max. Intact = warm amber, Exceptional = cool blue, Flawless = violet, Radiant = gold. Never use solid fills — always transparent overlays.

## Implemented Features

| Tab | Status | Notes |
|-----|--------|-------|
| celestial-pendulum | Phase 1 complete | CycleCard, live ticking, offline-first |
| void-reliquaries | UI Phase 1 complete | FissureCard: left spotlight, tier gradients, SP treatment, Orokin typography |
| All others | Placeholder stub | `features/<tab>/<Tab>Page.tsx` |

## Data Sources

- Worldstate cycles: `https://api.warframestat.us/pc/{cetusCycle|vallisCycle|cambionCycle|zarimanCycle|earthCycle}`
- Fissures: `https://api.warframestat.us/pc/fissures`
- Market: `https://api.warframe.market/v2/` (not yet implemented)
- EE.log: Tauri FS plugin + Rust parser (not yet implemented — requires Rust)

**API quirks:** Cambion uses `active` field (not `state`) for fass/vome. Always derive remaining time from `expiry` ISO timestamp — `timeLeft` string is display-only.
