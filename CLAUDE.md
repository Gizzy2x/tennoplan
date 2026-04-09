# CLAUDE.md

> **Self-maintenance rule (critical):**  
> After **any** major UI change, visual overhaul, new layout pattern, or design direction shift — no matter how big or small — immediately update this file to reflect the new reality.  
> This is the only way Claude stays aligned with your evolving vision instead of locking into old rules.

## Project

**Tennoplan** — Your personal, offline-first Warframe companion (Tauri 2 + React 19 + Tailwind v4).  
A living, breathing desktop app that you are free to reshape **entirely** whenever you want.  
No tab is sacred. No layout is permanent. The entire UI is yours to redesign, expand, or completely reinvent at any time.

**Core Philosophy (2026)**  
Make it feel like Warframe — dark, luxurious, Orokin-gold, cinematic, immersive — but **your** version.  
Mix full-bleed atmospheric beauty with perfect glanceability wherever it serves the player.  
Use progressive disclosure, bento grids, compact cards, hero sections, modals, or any new pattern you invent.  
Claude must never fight your changes — it must amplify them.

## Commands

```bash
npm run dev          # Vite dev server (frontend only)
npm run build        # tsc -b && vite build
npx tsc --noEmit     # Type-check
Architecture
Hexagonal / Clean Architecture.
src/core/ stays framework-free.
Every feature lives in its own vertical slice (src/features/<tab-name>/) so you can redesign or replace entire tabs without touching the rest of the app.
Navigation is driven by Zustand (useNavigationStore). No router. You can change this at any time.
UI Evolution Freedom (New 2026 Rule)
You are explicitly allowed — and encouraged — to change the entire UI at any time.

Any tab can become fully cinematic (full-bleed backgrounds, particles, massive typography, atmospheric images).
Any tab can become a dense bento grid, a compact list, a single hero card, a dashboard-style layout, or something completely new you invent.
Progressive disclosure (summary cards → modals/full pages) is available but optional.
There are no longer any “this tab must stay simple” or “only cinematic for Celestial Pendulum” restrictions.
The old “Side tabs are simple and focused” rule is retired. Replace or remove any previous constraints that limit your creativity.

When you decide on a new direction:

Implement the change in code.
Update this CLAUDE.md file immediately with the new pattern.
Claude will then treat your new pattern as the new standard for all future work.

This prevents the exact problem you had before (Claude sticking to outdated “glass-panel only” rules while you wanted the high-fidelity cinematic references).
Design System — The Orokin Digital Standard (Base Only)
This is your starting foundation, not a cage. You may override, extend, or replace any part of it.
Core Tokens (in src/index.css @theme {})

Background: #131313
Primary gold: #E3C372
Secondary: #C6C6C7
Tertiary: #bac3fe
Fonts: font-headline = Noto Serif, font-body = Inter
Radius: rounded-lg (8 px) — but you may introduce new radii or remove this entirely

Base Classes (always available)

.glass-panel — backdrop-blur + semi-transparent dark + top border
.somatic-line — gold gradient divider
.filigree-corner — subtle gold corner bracket
.ghost-border — faint border

You may create new classes at any time (e.g. .cinematic-hero, .bento-grid, .compact-data-card, .void-nebula-panel, etc.).
When you do, document them here so future changes stay consistent with your latest vision.
Typography & Effects

Headlines: Noto Serif + etched gold shadow (you may change shadow intensity or remove it).
Body: Inter (or switch fonts globally if you want).

Layout Patterns You Can Use Freely

Cinematic full-bleed — atmospheric wiki images, heavy overlays, massive timers/medallions (like your original Celestial Pendulum references).
Bento grids — mixed card sizes, asymmetric layouts for visual interest.
Compact data cards — tight, glanceable info (perfect for fissures, alerts, etc.).
Hero sections + supporting cards — one big immersive panel + smaller supporting ones.
Progressive disclosure — summary → modal/full detail page (optional).
Any hybrid or completely new pattern you create.

No pattern is locked to any specific tab.
Implemented Features (Current Snapshot)

TabStatusCurrent Style Notescelestial-pendulumCinematic overhaul completeFull-bleed 2×3 panels with atmospheric backgroundsvoid-reliquariesUI polishedCompact FissureCards (ready for redesign)ascension-registryStubBasic trackerdailies-weekliesNot startedKiller feature — completely open for your new visionAll othersPlaceholderfeatures/<tab>/<Tab>Page.tsx — replace freely
Data Sources

Worldstate / Nightwave / Fissures: https://api.warframestat.us/
Market: https://api.warframe.market/v2/
EE.log: Future Tauri Rust parser