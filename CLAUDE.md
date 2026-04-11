# CLAUDE.md

> **Self-maintenance rule:** After every major phase or significant UI change, update this file to reflect new patterns so future work stays consistent.

## Cinematic Reference System & Index Usage

All cinematic reference images are stored in: `/Reference-for-Tennoplan/cinematic-variants/`

There is a helper file: `cinematic-variants-index.md` inside that folder which contains:
- An automatically updated list of all images
- Grouped sections by feature (Celestial Pendulum, Void Reliquaries, etc.)
- Description and "Best For" columns (some may be filled in by the user)

### Rules for Using References (Strict)

1. **Always check the index first**
   - Before designing or redesigning any UI, read `cinematic-variants-index.md` to see what reference images exist for that category.

2. **When the user asks to redesign or create a page:**
   - First look for images under the relevant section in the index (e.g. "Celestial Pendulum" section).
   - Use **exact filenames** from the index when referencing them.
   - Mix elements from multiple images exactly as the user describes (background, layout, timer style, borders, typography, etc.).

3. **If references exist for the category:**
   - Prioritize and mix from those images.
   - Never default back to the clean glass-panel "Orokin Digital Standard" style unless the user explicitly asks.

4. **If NO references exist for the requested category or page:**
   - Do **NOT** invent a new style from scratch.
   - Instead, reply with this exact message (or very close):

     > "I don't see any cinematic reference images yet for [Category/Page Name] in cinematic-variants-index.md.  
     > Would you like to add some reference images first, or should I create a design based on the general cinematic style from the existing Celestial Pendulum / General images?"

   - Wait for user confirmation before proceeding.

5. **General fallback rule**
   - Only use "general / reusable" images (e.g. etched-gold-typography, stitched borders, vignette overlays) when no specific category references exist.
   - Always ask the user for clarification rather than guessing the full visual direction.

6. **Self-maintenance**
   - After the user adds new images and runs the update script, re-read `cinematic-variants-index.md` so you have the latest list.

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

## Design System — The Orokin Digital Standard (Fallback Only)

This is the **clean / minimal** style. It should only be used when the user explicitly asks for the "Orokin Digital Standard", "glass-panel", or "clean dashboard" look.

**Cinematic Style (from reference images) has higher priority.**

When the user wants cinematic / stitch / in-game HUD style:
- Prioritize the Cinematic Reference System & Index Usage (see section above).
- Use full-bleed backgrounds, stitched multi-panels, heavy etched gold typography, dramatic lighting, and vignette overlays from the reference images.
- Minimize or avoid glass-panel, somatic-line, filigree-corner, and ghost-border classes unless the user specifically requests them.
- Typography: Noto Serif for large headlines with strong etched gold text-shadow. Noto Sans for body text.

### When to Use Orokin Digital Standard
- Only when user says: “use clean style”, “glass panel”, “minimal”, or “Orokin Digital Standard”.
- Default to cinematic style whenever reference images or “cinematic” is mentioned.

### Core Tokens (Always Available)
- Background: #131313
- Primary gold: #E3C372
- Secondary: #C6C6C7
- Etched gold text-shadow: `0 1px 3px rgba(227,195,114,0.25), 0 0 8px rgba(227,195,114,0.15)`
- Fonts: Noto Serif (headlines), Noto Sans (body/labels)

Reusable cinematic utilities should be added to `src/index.css` (e.g. `.cinematic-hero`, `.etched-gold`, `.cinematic-panel`, `.cinematic-timer`).

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