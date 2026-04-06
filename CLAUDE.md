# CLAUDE.md

> **Self-maintenance rule:** After every major phase or significant UI change, update this file to reflect new patterns so future work stays consistent.

## Project

Tennoplan: offline-first Warframe companion desktop app built with Tauri 2 + React 19.

## Commands

```bash
npm run dev          # Vite dev server (frontend only)
npm run build        # tsc -b && vite build
npx tsc --noEmit     # Type-check



Architecture
Hexagonal (Clean Architecture). src/core/ has zero imports from React, Dexie, or fetch.
src/core/domain/       — pure TS types & entities
src/core/services/     — pure business logic
src/adapters/api/      — fetch + Dexie cache
src/adapters/storage/  — Dexie schema
src/features/<tab>/    — vertical slice per tab
src/store/             — Zustand stores
src/components/layout/ — AppShell, Sidebar, Header


Navigation: No router. Zustand useNavigationStore drives sidebar + top-bar tabs.
Tab Strategy
Tab,Purpose
Dailies & Weeklies,"Killer feature — Nightwave challenges, Pulse tracker, Netracell, EDA/ETA, weekly checklist. Persistent top-bar access. All completion state lives here."
Ascension Registry,"Mastery & Progression Tracker — MR rank, unlock/check off Warframes, weapons, companions, archwings, etc."
Celestial Pendulum,"Live world cycle timers. Simple focused view + small ""Completed"" flag linking to Dailies & Weeklies."
Void Reliquaries,"Active fissures. Simple focused view + small ""Completed"" flag linking to Dailies & Weeklies."
Solar Rail Feed,"Invasions, alerts, events. Simple focused view."
All others,Placeholder or future vertical slices.

Rule: Side tabs are simple and focused. They may only show a small "Completed" flag + link to the Dailies & Weeklies tab. Completion state is owned only by the Dailies & Weeklies tab (and synced to Dexie).

Design System — The Orokin Digital Standard
Tokens live in src/index.css inside @theme {} (Tailwind v4 CSS-first).

Background #131313, Primary gold #E3C372, Secondary #C6C6C7, Tertiary #bac3fe
Fonts: font-headline = Noto Serif, font-label / font-body = Inter
Radius: max 8 px (rounded-lg). No pure white — ceiling is #F2F2F2
Class,Effect
.glass-panel,backdrop-blur(12px) + semi-transparent dark bg + top border
.somatic-line,Full-width 1 px gold gradient divider
.filigree-corner,"Absolute corner bracket (gold, 20% opacity)"
.ghost-border,1 px border at 20% opacity

Orokin Typography & Text Effects

Mission types and tier headers: Noto Serif + font-black.
Etched gold text-shadow: 0 1px 3px rgba(227,195,114,0.25).
Body text gets no text-shadow.

Glanceability Principles

Icon + mission type first (left spotlight with transparency).
SP / tier badge immediately right of icon.
Time + progress bar rightmost.

Tier gradients: Subtle right-to-left, 10–15% opacity max.
Implemented Features
Tab,Status,Notes
celestial-pendulum,Phase 1 complete,Live timers
void-reliquaries,UI polished,FissureCard with top tags
ascension-registry,Stub,Mastery & Progression Tracker
dailies-weeklies,Not started,Killer feature — will receive current challenge cards
All others,Placeholder,features/<tab>/<Tab>Page.tsx

Data Sources

Worldstate / Nightwave / Fissures: https://api.warframestat.us/
Market: https://api.warframe.market/v2/
EE.log: Future Tauri Rust parser