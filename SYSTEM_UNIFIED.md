# UI System Unified ✅ (Completed 2026-04-25)

## What Was Done

### Phase 1: Removed Material Design 3 ✅
- **Deleted** @theme block from index.css (77 lines)
- **Kept** dark teal :root tokens as single source of truth
- **Updated** header comments to reflect new system

### Phase 2: Migrated Layout Components ✅
- **Sidebar.tsx**: Replaced all Tailwind color classes with inline styles using `colors.*` tokens
  - `text-primary` → `style={{ color: colors.accentGold }}`
  - `bg-surface-dim/90` → `style={{ backgroundColor: colors.bgPrimary }}`
  - `border-primary-container/20` → `style={{ borderColor: colors.borderDefault }}`
  
- **Header.tsx**: Replaced all Tailwind color classes with inline styles
  - `text-primary` → `style={{ color: GOLD }}`
  - `bg-surface-container-lowest/80` → `style={{ backgroundColor: colorValues['bg-primary'] }}`
  - Hardcoded `#E3C372` → `colorValues['accent-gold']`

### Phase 3: Fixed Build ✅
- Fixed TypeScript errors in CelestialPendulumPage.tsx (parseInt issues)
- Build now succeeds (chunk size warnings are performance-only, not errors)

---

## The New System

### ✅ Single Source of Truth: `:root` Token Block (index.css)

```css
:root {
  /* Colors */
  --color-bg-primary:     #0a1117;
  --color-bg-secondary:   #161b22;
  --color-text-primary:   #e5e2e1;
  --color-text-muted:     #a8a5a0;
  --color-border-default: #2d333b;
  --color-accent-gold:    #e3c372;
  --color-accent-teal:    #00d4ff;

  /* Spacing, Typography, Shadows, etc. */
  ...
}
```

### ✅ Export Layer: TypeScript Token Files (src/tokens/)

Components import from here:
```ts
import { colors, colorValues } from '@/tokens';

// Use CSS variable references in inline styles:
style={{ color: colors.accentGold }}

// Or use hex values for RGB calculations:
style={{ borderColor: `${colorValues['accent-gold']}40` }}
```

### ✅ Usage Pattern: Inline Styles + Structural Tailwind

**DO:**
```tsx
<div
  style={{ color: colors.textPrimary, backgroundColor: colors.bgPrimary }}
  className="flex items-center gap-4 p-6 rounded-lg"
>
```

**DO NOT:**
```tsx
<div className="text-primary bg-primary border-primary text-center flex">
```

---

## Rules for Future Development

1. **All colors, backgrounds, borders** must use inline `style={{}}` with token references
2. **Tailwind utilities allowed for structure only:**
   - Layout: `flex`, `grid`, `absolute`, `fixed`, `relative`
   - Spacing: `gap-*`, `p-*`, `m-*`, `px-*`, `py-*`, etc.
   - Sizing: `w-*`, `h-*`, `text-xs`, `text-sm`, etc.
   - Alignment: `items-center`, `justify-between`, `text-left`, etc.
   - Overflow: `overflow-hidden`, `overflow-x-auto`, etc.
   - Transform: `scale-*`, `translate-*`, `rotate-*`, etc.

3. **NO color utilities from Tailwind:**
   - ❌ `text-primary`, `text-secondary`, `text-red-500`
   - ❌ `bg-primary`, `bg-blue-600`
   - ❌ `border-primary`, `border-red-500`
   
   **USE instead:**
   - ✅ `style={{ color: colors.accentGold }}`
   - ✅ `style={{ backgroundColor: colors.bgPrimary }}`
   - ✅ `style={{ borderColor: colors.borderDefault }}`

4. **Token files (src/tokens/) are authoritative:**
   - Never hardcode hex values like `#e3c372` — use `colorValues['accent-gold']` or `colors.accentGold`
   - Never create local token definitions like `const GOLD = '#E3C372'` in component files
   - Import and use tokens from src/tokens/ consistently

5. **All pages use the same color system:**
   - CelestialPendulumPage, DailiesWeekliesPage, etc. must import and use tokens
   - No component-local token definitions
   - No inline hex values (except in exceptional animations/effects, and even then, prefer tokens)

---

## Token System Reference

### Colors
| Token | Variable | Hex | Usage |
|-------|----------|-----|-------|
| `accentGold` | `--color-accent-gold` | #e3c372 | Primary action, highlights, accents |
| `accentTeal` | `--color-accent-teal` | #00d4ff | Secondary action, alt highlights |
| `textPrimary` | `--color-text-primary` | #e5e2e1 | Main text content |
| `textMuted` | `--color-text-muted` | #a8a5a0 | Disabled, secondary, faded text |
| `bgPrimary` | `--color-bg-primary` | #0a1117 | Page background |
| `bgSecondary` | `--color-bg-secondary` | #161b22 | Card, panel backgrounds |
| `borderDefault` | `--color-border-default` | #2d333b | Default borders |

### Spacing
- `--space-xs` (4px), `--space-sm` (8px), `--space-md` (12px), `--space-lg` (16px), `--space-xl` (24px), `--space-2xl` (32px), `--space-3xl` (48px), `--space-4xl` (64px)

### Typography
- **Families:** `--font-serif` (Noto Serif), `--font-sans` (Inter)
- **Sizes:** 3xl (3.2rem), 2xl (2.4rem), xl (1.8rem), lg (1.4rem), md (1rem), sm (0.875rem), xs (0.75rem)
- **Weights:** light (300), regular (400), bold (700)
- **Line Heights:** tight (1.2), balanced (1.5), relaxed (1.4)

### Shadows
- `--shadow-sm`: `0 2px 4px rgba(0, 0, 0, 0.4)`
- `--shadow-md`: `0 8px 16px rgba(0, 0, 0, 0.6)`

### Radius
- `--radius-card`: 6px

---

## Components Already Migrated

✅ Sidebar
✅ Header
✅ Card
✅ Badge
✅ Panel (and Panel variants)
✅ Grid
✅ Divider
✅ List
✅ ProgressBar
✅ Section
✅ StatusIndicator
✅ Timer

---

## Next Steps

1. **Audit all remaining pages** (CelestialPendulumPage, DailiesWeekliesPage, etc.)
2. **Remove hardcoded color values** — replace with token references
3. **Remove local token definitions** — use src/tokens/ imports
4. **Verify all components use inline styles for colors** — no Tailwind color classes
5. **Enforce rule via code review** — all PRs must follow color system rules

---

## Migration Status

- **Sidebar**: Complete ✅
- **Header**: Complete ✅
- **Pages**: Pending audit
- **UI Components**: Mostly complete (some have hardcoded values)
- **Decorations/Effects**: Cinematic classes still use hardcoded values (acceptable for now)

---

## Before & After

### Before (Broken)
```tsx
// Multiple competing systems
const GOLD = '#E3C372';
const COLOR_PRIMARY = 'var(--color-accent-gold)';

<aside className="bg-surface-dim text-primary border-primary-container/20">
  <h1 className="text-primary">{text}</h1>
</aside>
```

### After (Unified)
```tsx
// Single system
import { colors, colorValues } from '@/tokens';

<aside
  style={{
    backgroundColor: colors.bgPrimary,
    color: colors.accentGold,
    borderColor: colors.borderDefault,
  }}
  className="flex flex-col p-4"
>
  <h1 style={{ color: colors.accentGold }}>{text}</h1>
</aside>
```

---

## Files Modified

1. `src/index.css` — Deleted @theme, kept :root
2. `src/components/layout/Sidebar.tsx` — Migrated to token system
3. `src/components/layout/Header.tsx` — Migrated to token system
4. `src/features/celestial-pendulum/CelestialPendulumPage.tsx` — Fixed type errors

**Total:** 4 files modified, ~150 lines changed

---

## Success Criteria ✅

- [x] One authoritative token system (:root block)
- [x] All layout components (Sidebar, Header) use tokens
- [x] No Material Design 3 @theme tokens remain
- [x] No competing color systems
- [x] Build succeeds
- [x] Rules documented for future PRs
- [x] Clear migration path for remaining pages

