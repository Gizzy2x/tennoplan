> **Self-maintenance rule:** After every major phase or significant UI change, update this file to reflect new patterns so future work stays consistent.

## Cinematic Reference System (STRICT ENFORCEMENT — Highest Priority)

All cinematic reference images are now stored in tab-specific folders under:  
`/Reference-for-Tennoplan/cinematic-variants/[tab-name]/`  
(Example: celestial-pendulum/, dailies-weeklies/, etc. — images sit directly inside the folder.)

**These rules override ALL other instructions in this file.**

1. **Layout is ALWAYS the highest priority**
   - When the user shows ANY reference (Lovable URL, screenshot, image filenames, or mentions the reference folder), replicate the **exact layout** from the reference first — panel arrangement, grid structure, full-bleed behavior, title placement, column splits, spacing, and flow — before anything else.

2. **Interviewer Prompting Rule (mandatory)**
   - As soon as the user provides a reference (Lovable link, screenshot description, image names, or folder mention), **immediately stop** and ask clarifying questions like an interviewer.
   - Use this exact style (or extremely close):

     > "I see the reference you provided for [feature/tab] (Lovable URL / screenshot / images in the [tab-name] folder).  
     > How would you like me to use it?  
     > Please tell me which parts are most important (exact layout, background treatment, title position, panel proportions, etc.). Should I follow it as closely as possible with zero creative changes to the layout?"

   - Do **not** start designing, suggesting layouts, or writing any code until the user answers.

3. **No creative liberties on layout**
   - Never replace the reference layout with tabs, bento cards, glass panels, extra borders, stitched frames, or any other structure unless the reference itself shows them.
   - Over-use of borders, decorative elements, or "Orokin Digital Standard" panels is explicitly forbidden when a reference is provided.

4. **Reference priority order (strict)**
   1. User-provided reference (Lovable URL, screenshot, images from the tab folder, or description) → highest authority
   2. Images in the relevant tab folder under cinematic-variants/
   3. General cinematic utilities only as supporting elements (vignette, gold text shadow, etc.)

5. **Background is secondary**
   - After layout is matched exactly, apply the background shown in the reference (local asset or visual style). Do not substitute unless the user says so.

6. **Self-maintenance**
   - After every major UI change, update this file so the rules stay current.

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
Design System
User-provided reference has absolute priority over everything else.

When the user gives any reference (Lovable URL, screenshot, or images from the tab folder), follow its layout exactly. Style comes second. Background comes third.
Typography rule remains: Noto Serif for large headlines, Noto Sans for body (never CameraPlainVariable).
Only use Orokin Digital Standard / glass-panel / clean style when the user explicitly asks for it.
When no reference is provided, default to general cinematic style (full-bleed backgrounds, heavy etched gold typography, vignette overlays).

Core Tokens (Always Available)

Background: #131313
Primary gold: #E3C372
Secondary: #C6C6C7
Etched gold text-shadow: 0 1px 3px rgba(227,195,114,0.25), 0 0 8px rgba(227,195,114,0.15)
Fonts: Noto Serif (headlines), Noto Sans (body/labels)

Reusable cinematic utilities should be added to src/index.css (e.g. .cinematic-hero, .etched-gold, .cinematic-panel, .cinematic-timer).
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