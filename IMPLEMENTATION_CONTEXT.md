# Tennoplan Component Implementation Context

**For New Chat Session** — Paste this as context when starting the next phase.

---

## What We've Accomplished

✅ **Design Context Established** (`.impeccable.md`)
- Dark teal/cyan base (#0a1117 or similar)
- Gold accent (#e3c372, used sparingly)
- Complete typography scale, spacing system, color tokens
- Information hierarchy rules, anti-patterns guide
- Component patterns (sections, cards, grids, timers, lists)

✅ **Component Audit Complete** (`COMPONENT_AUDIT.md`)
- Analyzed Stitch reference designs
- Audited current code (what's hardcoded, what's missing)
- Identified 7–10 core components needed
- Prioritized by tier (foundation → enhancement → polish)
- Validated against design system and reference layouts

✅ **Ready to Build**
- We know exactly which components to build (no guessing)
- We know why (each is used by 2+ features)
- We know the order (foundation first)
- We know the specs (aligned to `.impeccable.md`)

---

## What Needs to Happen Next

### Phase 1: Design Tokens (CRITICAL FIRST)
**Goal**: Create a token system so components have concrete values

**Files to create**:
- `src/tokens/colors.ts` — Color system (dark teal, gold, text colors, etc.)
- `src/tokens/spacing.ts` — 4pt modular scale (4, 8, 12, 16, 24, 32, 48, 64px)
- `src/tokens/typography.ts` — Font scales (h1–caption), weights, line heights
- `src/tokens/index.ts` — Export all tokens as CSS variables

**Why first**: Components need these values. Don't hardcode styling in components—use tokens.

**Refs**:
- `.impeccable.md` → Color System section (exact hex values)
- `.impeccable.md` → Spacing System section (4pt scale)
- `.impeccable.md` → Typography System section (fixed rem scales)

### Phase 2: Tier 1 Components (Foundation)
**Goal**: Build the 4 foundational components everything else uses

**Order**:
1. `src/components/ui/Card.tsx` — Reusable container (border, padding, hover)
2. `src/components/ui/Section.tsx` — Major section container with title
3. `src/components/ui/Grid.tsx` — Responsive `auto-fit` card grid
4. `src/components/ui/Divider.tsx` — Somatic line separator

**From `COMPONENT_AUDIT.md`**: Component Specifications section (exact props, structure)

### Phase 3: Tier 2 Components (Enhancement)
**Goal**: Add content organization and polish

1. `src/components/ui/Timer.tsx` — Countdown display (large, bold, accent color)
2. `src/components/ui/List.tsx` + `ListItem.tsx` — Sequential item container
3. `src/components/ui/Badge.tsx` — Small labeled pill
4. `src/components/ui/ProgressBar.tsx` — Visual progress indicator
5. `src/components/ui/StatusIndicator.tsx` — Live/offline/syncing pill

**From `COMPONENT_AUDIT.md`**: Component Specifications section

### Phase 4: Refactor Pages (Test Components)
**Goal**: Refactor one page per component phase to validate they work

**After Tier 1**: Refactor Celestial Pendulum to use Section + Grid
**After Tier 2**: Refactor Solar Rail Feed to use Card + Timer + Badge + StatusIndicator

---

## How to Approach This

### Best Order:
1. **Build design tokens first** (10–15 min) — Everything depends on this
2. **Build Tier 1 components** (1–2 hours) — Foundation that everything uses
3. **Refactor one page** (30 min) — Validate the components work with real data
4. **Build Tier 2 components** (1–2 hours) — Enhancement layer
5. **Refactor remaining pages** (1–2 hours) — Apply everywhere

### Key Principles:
- **Use tokens, not hardcoded values** — Colors, spacing, sizing all from tokens
- **Test immediately** — Build a component, refactor a page to use it right away
- **Reference `.impeccable.md` constantly** — Every spacing, color, size comes from there
- **Keep feature-specific components** (InvasionCard, ChallengeCard) but wrap them in Card
- **No side-stripe borders, no gradient text, no nesting** — Follow anti-patterns guide

---

## Recommended Model/Skill for Next Chat

**Start with**: `/shape` (UX/UI planning skill)
- Brief it on: "I have `.impeccable.md` (design system) and `COMPONENT_AUDIT.md` (component list). I'm ready to build the design tokens and Tier 1 components. Plan the token structure and component implementation in detail."
- It will lay out the exact file structure, token names, and component props

**OR start directly**: If you want to just build without planning, tell the next Claude:
- "I'm building design tokens and Tier 1 components. Use `.impeccable.md` and `COMPONENT_AUDIT.md` as the spec. Start with `src/tokens/` directory structure, then build Card, Section, Grid, Divider."

---

## Reference Files (In Your Project)

- **`.impeccable.md`** — Complete design system (colors, spacing, typography, components, rules)
- **`COMPONENT_AUDIT.md`** — Component list, priority, specs, validation
- **Reference images**: `Reference-for-Tennoplan/cinematic-variants/General/` (Stitch concepts)
- **Reference specifics**: 
  - `cinematic-variants/Celestial-Pendulum/` 
  - `cinematic-variants/Solar-Rail-Feed/`

---

## Current Code Structure

**UI Components** (nascent, need expansion):
- `src/components/ui/PageHero.tsx` — Exists
- `src/components/ui/Panel.tsx` — Exists (minimal)
- `src/components/ui/SectionHeader.tsx` — Exists
- `src/components/ui/ContentCard.tsx` — Exists (underdeveloped)
- `src/components/ui/TabNav.tsx` — Exists

**Feature-Specific Components** (keep these, but wrap in Card/Section):
- `src/features/dailies-weeklies/components/ChallengeCard.tsx`
- `src/features/solar-rail-feed/components/InvasionCard.tsx`
- `src/features/solar-rail-feed/components/AlertCard.tsx`
- (etc. for each content type)

**Pages** (will be refactored):
- `src/features/celestial-pendulum/CelestialPendulumPage.tsx`
- `src/features/solar-rail-feed/SolarRailFeedPage.tsx`
- `src/features/dailies-weeklies/DailiesWeekliesPage.tsx`

---

## Why This Approach Works

1. **Tokens first** → Components have concrete, consistent values (no guessing)
2. **Foundation first** → Everything else is built on Card/Section/Grid (no rework)
3. **Test immediately** → Catch issues early by refactoring a real page
4. **Tier-based** → High-impact components first, polish later
5. **Systematic** → Every component is validated by audit before building
6. **Themeable** → Tokens make future color themes trivial (just swap CSS variables)

---

## Metrics of Success

After each phase:
- ✅ Components are used in 2+ pages
- ✅ No hardcoded spacing/colors in pages (all use components + tokens)
- ✅ Spacing is consistent (follows 4pt scale from `.impeccable.md`)
- ✅ Typography is consistent (uses scale from `.impeccable.md`)
- ✅ Colors match theme (dark teal + gold from `.impeccable.md`)
- ✅ Pages look closer to Stitch reference designs
- ✅ Adding new features means combining existing components (faster shipping)

---

## Quick Links

**Design System**: `.impeccable.md` (complete reference)
**Component List**: `COMPONENT_AUDIT.md` (what to build, in order)
**References**: `Reference-for-Tennoplan/cinematic-variants/`

**Tech Stack**: React 19, Tauri 2, TailwindCSS 4, Zustand (state)

---

## What Model/Skill to Tell the Next Claude

Tell them:
> "I'm building design tokens and Tier 1 React components for Tennoplan. I have `.impeccable.md` (design system) and `COMPONENT_AUDIT.md` (component audit). Use these as the spec.
>
> Start with Phase 1: Design tokens (colors.ts, spacing.ts, typography.ts). Then Phase 2: Tier 1 components (Card, Section, Grid, Divider). Then refactor Celestial Pendulum page to use them.
>
> Use `/shape` to plan the token structure and component APIs first, then implement."

---

## Session Notes

- **Last updated**: 2026-04-25
- **Status**: Ready to build
- **Momentum**: Don't lose it—implement tokens → components → refactor immediately
- **Key decision**: Dark teal/cyan base + gold accent (validated as distinctive, professional, Warframe-authentic)
- **Principle**: Components first, pages refactor to match (not the other way)

---

**You're 90% ready to ship the component library. Now you build it. Let's go.**
