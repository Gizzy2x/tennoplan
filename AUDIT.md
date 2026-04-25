# UI System Audit — Conflicting Design Systems

## Problem Summary
The codebase has **FOUR OVERLAPPING DESIGN SYSTEMS** that create inconsistency and visual chaos:

1. **Material Design 3 @theme tokens** (index.css lines 24-100) — `--color-primary`, `--color-surface-dim`, etc.
2. **Dark teal :root tokens** (index.css lines 110-169) — `--color-bg-primary`, `--color-text-primary`, etc.
3. **TypeScript token files** (src/tokens/) — References to the :root tokens, but inconsistently used
4. **Tailwind utilities** (still in package.json) — Allowing arbitrary styling that bypasses tokens

Plus:
- **Inline style constants** in page files (CelestialPendulumPage.tsx creates its own token definitions)
- **Cinematic utility classes** (.glass-panel, .relic-glow, .orokin-etched, etc.)
- **Typography classes** (.typo-hero, .typo-body, etc.) that override component styles

---

## Current System State

### ✗ Sidebar (src/components/layout/Sidebar.tsx)
**Using:** Tailwind + Material Design 3 @theme tokens
```tsx
className="bg-surface-dim/90 text-primary border-primary-container/20"
```
- Colors reference `@theme` block, NOT the new :root tokens
- Mixing structural Tailwind (flex, px, py) with old color tokens
- **Inconsistent with intended token system**

### ✗ CelestialPendulumPage (src/features/celestial-pendulum/)
**Using:** Inline style constants referencing :root tokens
```ts
const COLOR_PRIMARY = 'var(--color-accent-gold)';
const FONT_SANS = 'var(--font-sans)';
```
- Creates local token copies instead of importing from src/tokens/
- Hardcoded in file instead of system-wide
- Duplicates what already exists in token files

### ✓ Token Files (src/tokens/)
**Status:** Created but underused
- `colors.ts` — Exports color references (mostly unused)
- `typography.ts` — Exports fontRoles and size tokens
- `spacing.ts` — Exports spacing scale (probably unused)
- `shadows.ts` — Exports shadow definitions
- **Problem:** Not being imported by pages/components; mostly dead code

### ✗ index.css Duplication
**Lines 24-100:** Material Design 3 @theme tokens
- `--color-primary`, `--color-surface-dim`, `--color-on-surface`, etc.
- **NO LONGER USED** — sidebar is the last place using these

**Lines 110-169:** Dark teal :root tokens (NEW SYSTEM)
- `--color-bg-primary`, `--color-text-primary`, `--color-accent-gold`, etc.
- This is the intended authoritative system
- Should be the ONLY color source

**Lines 214-699:** Utility classes & cinematic styles
- `.glass-panel`, `.relic-glow`, `.orokin-etched`, `.fissure-variant-tag`, etc.
- `.typo-hero`, `.typo-body`, `.typo-label-sm`, etc.
- `.panel`, `.panel-header`, `.panel-body`, `.panel-label`, etc.
- **Problem:** Multiple competing typography systems; unclear which to use

### ✗ package.json Dependencies
- `tailwindcss` and `@tailwindcss/vite` still present
- Allows Tailwind utilities to be used, creating escape routes from token system
- Components can do `className="text-red-500"` and bypass tokens entirely

---

## Which System Pages/Components Are Using

| Component | System | Notes |
|-----------|--------|-------|
| **Sidebar** | Tailwind + @theme | Using `text-primary`, `bg-surface-dim`, etc. |
| **Header** | ? | Not yet audited |
| **CelestialPendulumPage** | :root tokens (inline consts) | Redefines tokens locally |
| **DailiesWeekliesPage** | ? | Not yet audited |
| **UI Components** (Badge, Card, Grid, etc.) | ? | Newly created, unclear if using system |
| **FissureCard** | ? | Not yet audited |

---

## The Fix: Consolidation Plan

### Phase 1: Establish Single Source of Truth
1. Keep **:root tokens only** (lines 110-169 in index.css)
2. Remove **@theme Material Design 3 block** entirely
3. Verify all :root CSS variables are complete (colors, spacing, typography, shadows)
4. Export token values from src/tokens/ consistently

### Phase 2: Migrate All Components to Token System
1. **Sidebar & Header** — Replace Tailwind color classes with inline styles using `colors.*`
2. **All pages** — Import and use tokens from src/tokens/ instead of inline consts
3. **UI components** — Ensure they import tokens and use them consistently
4. **Remove Tailwind utilities** — Replace with token-based styles

### Phase 3: Consolidate Typography
1. Decide between `.typo-*` classes and `fontRoles.*` objects
2. Standard: Use `fontRoles.*` for inline styles (React components)
3. Use `.typo-*` classes only for static HTML (not needed in React)
4. Remove duplication

### Phase 4: Cleanup
1. Remove Tailwind from package.json (if no longer used)
2. Delete @theme block from index.css
3. Delete unused token definitions
4. Audit cinematic utility classes — keep only what's actively used

---

## Audit Checklist

- [ ] Map all pages and their current styling approach
- [ ] Map all components and their current styling approach
- [ ] Identify which Tailwind utilities are irreplaceable vs. redundant
- [ ] Verify :root token coverage (colors, spacing, sizing, shadows, borders, radius)
- [ ] Identify unused cinematic classes
- [ ] Identify unused Material Design 3 @theme tokens
- [ ] Create migration order (lowest impact → highest impact)

