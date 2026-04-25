> **Self-maintenance rule:** Update this file after every major phase or significant change. This is the single source of truth.

## Project

**Tennoplan** — offline-first Warframe companion desktop app. Stack: Tauri 2 + React 19 + Vite + Cloudflare Pages/Workers.

## Commands

```bash
npm run dev          # Vite dev server (frontend only)
npm run build        # tsc -b && vite build
npx tsc --noEmit     # Type-check (run before every commit)
npm run deploy       # Build + wrangler deploy (Cloudflare)
```

## Architecture

Hexagonal (Clean Architecture). `src/core/` has zero imports from React, Dexie, or fetch.

```
src/core/domain/       — pure TS types & entities
src/core/services/     — pure business logic
src/adapters/api/      — fetch + Dexie cache
src/adapters/storage/  — Dexie schema (db.ts)
src/features/<tab>/    — vertical slice per tab
src/store/             — Zustand stores
src/components/layout/ — AppShell, Sidebar, Header
src/tokens/            — TS token exports (colors, spacing, typography, shadows)
```

**Navigation:** No router. `useNavigationStore` (Zustand) drives sidebar + top-bar tabs.

**Deployment:** Cloudflare Pages (frontend) + Cloudflare Workers (backend KV proxy). No Vercel.

---

## Tab Strategy

| Tab | Purpose | Status |
|-----|---------|--------|
| **Dailies & Weeklies** | Killer feature — Nightwave, Pulse tracker, Netracell, EDA/ETA, weekly checklist | Not started |
| **Celestial Pendulum** | Live world cycle timers | Phase 1 complete |
| **Void Reliquaries** | Active fissures | UI polished |
| **Ascension Registry** | Mastery & Progression Tracker | Stub |
| **Solar Rail Feed** | Invasions, alerts, events | Stub |
| All others | Placeholder vertical slices | — |

**Rule:** Side tabs are simple and focused. Completion state is owned exclusively by Dailies & Weeklies (synced to Dexie). Other tabs may show a small "Completed" flag + link there, nothing more.

---

## Design System

**Canonical spec: `.impeccable.md`** (root of project). Read it before building any UI.

### Reference Priority (strict order)
1. User-provided reference image, URL, or description → highest authority, implement exactly
2. Images in `/Reference-for-Tennoplan/cinematic-variants/[tab-name]/`
3. `.impeccable.md` design principles as defaults

**Layout always wins.** Match panel arrangement, grid structure, title placement, column splits, spacing — before thinking about colors or backgrounds. Never substitute tabs, bento grids, glass panels, or extra borders when a reference shows something else.

### Core Tokens (always available via CSS variables)

```
Background primary:  #0a1117  (--color-bg-primary)
Background cards:    #161b22  (--color-bg-secondary)
Accent gold:         #e3c372  (--color-accent-gold)
Accent teal:         #00d4ff  (--color-accent-teal)
Text primary:        #e5e2e1  (--color-text-primary)
Text muted:          #a8a5a0  (--color-text-muted)
Border:              #2d333b  (--color-border-default)

Font serif (headlines):  var(--font-serif)   → "Noto Serif"
Font sans  (body):       var(--font-sans)    → "Inter"
```

### Design Rules (enforced)
- Use CSS variables or `.typo-*` / `.panel-*` classes — never hardcode hex values
- Noto Serif for headlines, Inter for body/labels
- No glassmorphism, no gradient text, no side-stripe card borders
- Gold is accent (10–15% visual weight), not a background color
- Spacing from the 4pt scale: 4/8/12/16/24/32/48/64px only
- Motion: ease-out, 150–300ms, no bounce/elastic easing

### CSS Class System (`src/index.css`)
- `.typo-hero`, `.typo-tab-title`, `.typo-section-header`, `.typo-emphasis`, `.typo-body`, `.typo-label-sm`, `.typo-label-xs`
- `.panel`, `.panel-header`, `.panel-body`, `.panel-label`, `.panel-highlight`
- `.data-row`, `.data-row-label`, `.data-row-value`, `.data-row-value-accent`
- `.section-divider`, `.section-divider-label`, `.section-divider-line`
- `.content-card`, `.content-card-interactive`
- `.tab-nav`, `.tab-nav-item`, `.tab-nav-count`
- `.page-hero-heading`, `.page-hero-subtitle`
- `.coming-soon-body`, `.coming-soon-label`
- Animations: `.heartbeat-dot-pulse`, `.system-pulse-ring`, `.somatic-pulse`, `.terminal-power-on`

---

## Data Sources

| Source | Use |
|--------|-----|
| `https://api.warframestat.us/` | Worldstate, Nightwave, Fissures (live) |
| `https://api.warframe.market/v2/` | Market prices |
| Cloudflare Worker (KV) | Worldstate proxy + cache |
| Dexie (IndexedDB) | Drop data, items, icons (download-once) |
| EE.log | Future Tauri Rust parser |

---

## Workflow: Post-Mortem Logging

When I say "Archive this bug," "Log this," or "Post-mortem":
1. Identify the root cause and final working solution.
2. Use the Obsidian MCP to create or append to `Notes/Post_Mortems.md`.
3. Format:
   - **Date:** [Current Date]
   - **The Bug:** Short description.
   - **The "Gotcha":** Why it happened.
   - **The Fix:** The exact code or command that solved it.

## Workflow: Session Context Sync

At the end of a significant session, use Obsidian MCP to update `Notes/Tennoplan-Context.md` with:
- Current phase and what was just completed
- Any active blockers
- Concrete next steps

This note is auto-read at session start (via hook) so future sessions have instant context without token-expensive re-exploration.
