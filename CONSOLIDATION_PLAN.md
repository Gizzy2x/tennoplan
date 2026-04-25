# UI System Unification — Consolidation Plan

## Executive Summary
The codebase has **two competing color systems**: Material Design 3 (@theme) used by Sidebar, and dark teal (:root) used by new UI components. We will unify everything under :root tokens and remove Material Design 3 entirely.

**Goal:** One token system, consistent across all components, all pages, sidebar, header.

---

## Current State Analysis

### ✓ What's Working
- **New UI components** (Card, Badge, Panel, etc.) use :root tokens ✓
- **:root tokens** are well-defined and comprehensive
- **Token TS files** (colors.ts, typography.ts) are created
- **Typography classes** in index.css work for pages

### ✗ What's Broken
- **Sidebar** uses Tailwind + Material Design 3 @theme tokens
- **Header** status unknown (likely also using @theme)
- **Material Design 3 block** still in index.css (line 24-100) — unused clutter
- **Hardcoded hex values** scattered in components (gold `#e3c372`, `rgba(227, 195, 114, ...)`)
- **Tailwind still in package.json** — escape hatch that allows non-token styling
- **Token TS files** created but not consistently imported by pages

---

## Consolidation Plan (4 Phases)

### PHASE 1: Remove Material Design 3 (Clean Slate)
**Time: ~15 min**

1. **Delete @theme block** from index.css (lines 24-100)
   - This removes `--color-primary`, `--color-surface-dim`, etc.
   - Keep :root block and all utilities below it

2. **Verify Sidebar doesn't break**
   - After deletion, Sidebar will error (classnames like `text-primary` won't resolve)
   - This tells us exactly what needs migration

3. **Update this doc** with migration order

**Files to edit:**
- `src/index.css` — Delete @theme block

**Expected impact:**
- Sidebar will have broken classnames
- Everything else should work (using :root tokens)

---

### PHASE 2: Expand :root Token Coverage
**Time: ~30 min**

Ensure :root tokens cover ALL design needs (colors, spacing, typography, shadows, borders, radiuses):

**Current :root tokens:**
- ✓ Colors (7: bg-primary, bg-secondary, text-primary, text-muted, border-default, accent-gold, accent-teal)
- ✓ Spacing (8: xs, sm, md, lg, xl, 2xl, 3xl, 4xl)
- ✓ Typography sizes (7: 3xl, 2xl, xl, lg, md, sm, xs)
- ✓ Font weights (3: light, regular, bold)
- ✓ Line heights (3: tight, balanced, relaxed)
- ✓ Shadows (2: sm, md)
- ✓ Radius (1: card)

**Missing from :root (needed by components):**
- Border styles (currently hardcoded in Card.tsx, Badge.tsx)
- Additional radiuses (sm, md, lg instead of just card)
- Additional shadows (sm-md scale is fine, but verify no custom ones)
- Status colors (success, warning, error, info)
- Opacity scale (for variants like `color}12`, `${color}45`)

**Action:**
- Add missing tokens to :root in index.css
- Update src/tokens/ TS files to export new tokens
- Create a reference table of what each token is for

---

### PHASE 3: Migrate Sidebar → Token System
**Time: ~45 min**

**Current Sidebar approach (WRONG):**
```tsx
className="bg-surface-dim/90 text-primary border-primary-container/20"
```
- Using Tailwind with @theme colors (which we just deleted)
- Mixing Tailwind utilities with token colors

**New Sidebar approach (CORRECT):**
```tsx
style={{
  backgroundColor: colors.bgSecondary,
  color: colors.textPrimary,
  borderColor: colors.borderDefault,
  // ... all structural styling via inline styles or new classes
}}
```

**Steps:**
1. Remove all Tailwind color classes from Sidebar (`text-*`, `bg-*`, `border-*`)
2. Keep structural Tailwind only (`flex`, `flex-col`, `items-center`, `gap-*`, `py-*`, `px-*`, etc.)
3. Replace color classes with inline `style={}` using `colors.*` from src/tokens/colors.ts
4. Replace cinematic effects with token references
5. Replace hardcoded box-shadows with `shadows.*` tokens

**Files to edit:**
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- Any other layout files using @theme colors

---

### PHASE 4: Audit & Cleanup
**Time: ~20 min**

1. **Remove Tailwind from package.json**
   - After migration, Tailwind is no longer needed
   - We're using inline styles + CSS classes from index.css

2. **Remove unused cinematic classes**
   - Keep only: `.panel`, `.panel-header`, `.panel-body`, `.panel-label`, `.data-row`, `.data-row-label`, `.data-row-value`, `.section-divider`
   - Remove decorative ones that aren't used: `.glass-panel`, `.filigree-corner`, `.somatic-line`, etc.
   - Keep animation keyframes if still used

3. **Consolidate typography**
   - `.typo-*` classes should only be used in static content
   - Components should use `fontRoles.*` or inline styles with `fontSize.*`
   - Remove duplicate definitions

4. **Verify all pages**
   - Scan CelestialPendulumPage, DailiesWeekliesPage, etc. for hardcoded token references
   - Replace inline constants with imports from src/tokens/

**Files to edit:**
- `package.json` — Remove tailwindcss, @tailwindcss/vite
- `src/index.css` — Remove unused classes
- All pages using inline token consts
- `tsconfig.json` or build config if Tailwind plugin is referenced

---

## Migration Checklist

### Phase 1: Delete @theme
- [ ] Backup src/index.css
- [ ] Delete @theme block (lines 24-100)
- [ ] Test build (`npm run build`)
- [ ] Note which components break

### Phase 2: Expand :root
- [ ] Add missing tokens to :root
- [ ] Update src/tokens/ TS files
- [ ] Create token reference document

### Phase 3: Migrate Sidebar
- [ ] Audit Sidebar.tsx line by line
- [ ] Replace Tailwind colors with inline styles
- [ ] Replace hardcoded hex values with token refs
- [ ] Test visual appearance (colors, spacing, shadows)
- [ ] Migrate Header.tsx
- [ ] Migrate other layout files

### Phase 4: Cleanup
- [ ] Remove Tailwind from package.json
- [ ] npm install
- [ ] Remove unused classes from index.css
- [ ] Audit all pages for inline token consts
- [ ] Build and test

---

## Expected Results

After consolidation:
- **One token system** (index.css :root block)
- **All components use tokens** (via inline styles or token-based classes)
- **Sidebar consistent** with rest of app
- **No Tailwind utilities** (except structural ones, which we keep)
- **No duplicate token definitions** in component files
- **No @theme tokens** in codebase

---

## Risk Assessment

### Low Risk
- Deleting @theme block — only Sidebar uses it
- Expanding :root — additive, doesn't break existing

### Medium Risk
- Removing Tailwind — need to ensure all styling is covered by token system
- Migrating Sidebar — visual regression if colors don't map 1:1

### Mitigation
- Run `npm run dev` after each phase
- Visual inspection of Sidebar after migration
- Keep backup of original index.css
- Test in browser before commit

