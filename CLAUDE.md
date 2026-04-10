# CLAUDE.md

> **Self-maintenance rule:** After every major phase or significant UI change, update this file to reflect new patterns so future work stays consistent.

## Cinematic Reference & Mixing System (Primary Visual Bible — Use for ALL UI Work)

This is the **single source of truth** for all visual and layout decisions in the app.

1. All cinematic reference images live in `/Reference-for-Tennoplan/cinematic-variants/` (create this subfolder if it doesn't exist).
2. When the user uploads or references multiple cinematic images:
   - Analyze **every** provided image.
   - Extract specific elements the user likes (e.g. “full-bleed cinematic background from image 1”, “multi-panel layout with gold borders from image 3”, “etched gold lettering + text-shadow from image 2”, “timer ring + icon style from image 4”, “location tabs at bottom from image 5”).
   - Explicitly note what the user dislikes and avoid it.
   - Mix elements across images exactly as instructed. Never default back to the clean glass-panel “Orokin Digital Standard” unless the user specifically asks for it.
3. Typography (non-negotiable for cinematic style):
   - Headlines / large titles: Orokin-inspired serif (use `font-family: "Noto Serif"` or closest loaded Orokin-style serif; heavy weight, gold #E3C372 with etched text-shadow: `0 1px 3px rgba(227,195,114,0.25), 0 0 8px rgba(227,195,114,0.15)`).
   - Body / labels: Noto Sans (exactly as Warframe uses for UI text).
   - Never use Inter or default sans unless user says so.
4. Layout rules for cinematic style:
   - Full-bleed cinematic backgrounds (high-res cycle/location images with vignette/dark overlay).
   - Multi-panel layouts where requested (seam lines, gold borders, dramatic lighting).
   - Timer rings, location tabs (Plains / Orb Vallis / Cambion Drift style), and mood/faction indicators must match the reference images exactly.
   - Minimize or avoid shadcn/ui Card / Panel components. Use raw divs + custom Tailwind arbitrary values + @layer utilities.
5. Reuse across the entire app:
   - This system applies to **every page and every new feature**, not just Celestial Pendulum.
   - When user says “apply cinematic style to [new page]” or “mix styles from these images for Solar Rail Feed”, do it.
   - Create reusable CSS utilities in `src/index.css` (e.g. `.cinematic-hero`, `.cinematic-timer`, `.etched-gold`, `.cinematic-panel`) so future pages can import the same look instantly.
6. Prompting workflow:
   - User will reference specific images + say what they like/dislike.
   - Output must feel like an in-game Warframe HUD screenshot, never a clean SaaS dashboard.

Self-maintenance: After any cinematic-style UI change, add the new pattern to this section so future work stays consistent.

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