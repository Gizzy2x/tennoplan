# Tennoplan Component Audit

**Purpose**: Identify exactly which components to build first, in priority order, validated against references and actual page needs.

---

## Component Analysis

### What Stitch Concepts Show (Reference Patterns)

From the general images, the component structure is:
```
Page
├── PageHero (title, subtitle, status indicator)
├── Section
│   ├── SectionHeader (section title, optional description)
│   └── ContentArea
│       ├── Cards (grid or list)
│       ├── Grids (responsive card layouts)
│       └── Lists (sequential items)
├── TimerGroup (critical, large numbers with labels)
└── InfoCard (icon + text, metadata)
```

### What Currently Exists (Code Audit)

**Already Built** ✅:
- `PageHero` — Page title + subtitle (exists)
- `Panel` — Container with padding/border (exists but minimal)
- `SectionHeader` — Section titles (exists)
- `ContentCard` — Basic card wrapper (exists but underdeveloped)
- `TabNav` — Tab navigation (exists)

**Partially Built** ⚠️:
- `ResetCounter` (hardcoded in DailiesWeekliesPage) — Timer display, should be reusable
- `KindHeader` (hardcoded in DailiesWeekliesPage) — Section header with colored background
- Icon rendering — ItemIcon, LazyItemIcon (exist but not integrated with design system)

**Missing/Needs Redesign** ❌:
- `Card` — Reusable card with standardized borders, padding, spacing (reference shows this a lot)
- `Grid` — Auto-fit responsive grid (reference shows grids everywhere)
- `List` & `ListItem` — Organized sequential layout (reference shows lists)
- `Timer` — Reusable timer/countdown component (reference shows large numbered timers)
- `Section` — Container for major content sections with title + dividers
- `Badge` / `Tag` — Small labeled badges (reference shows labels on cards)
- `InfoIcon` + `InfoText` — Icon + text pair (reference uses this for metadata)
- `ProgressBar` — Progress indicator (needed for tracking completion)
- `Alert` / `StatusIndicator` — Status pills/badges (live/offline/syncing)
- `Divider` — Subtle separator (somatic line from design system)

---

## Component Priority Matrix

### TIER 1: Foundation (Build First — Everything Needs These)

These are used in EVERY page. Build these first so you can build other components on top.

| Component | Used In | Reason | Complexity |
|-----------|---------|--------|-----------|
| `Card` | Solar Feed, Dailies, Celestial, Void Reliquaries | Every content item is in a card | Low |
| `Section` + `SectionHeader` | Every page | Organize major content areas | Low |
| `Grid` | Solar Feed (invasions, alerts), Void Reliquaries (fissures), Celestial (resources) | Responsive card layouts | Low |
| `List` + `ListItem` | Celestial (resources, bounties), Dailies (challenges) | Sequential information | Low |
| `Timer` | Dailies (reset counters), Celestial (cycle timers), Solar Feed (alert times) | Countdowns are critical | Medium |
| `Divider` | Every page (separating sections) | Visual organization | Trivial |

### TIER 2: Enhancement (Build Next — Improves Readability)

These add polish and hierarchy to content.

| Component | Used In | Reason | Complexity |
|-----------|---------|--------|-----------|
| `Badge` / `Tag` | Solar Feed (alert types), Celestial (mission types) | Labels for categorization | Low |
| `ProgressBar` | Dailies (challenge progress), Celestial (bounty progress) | Visual completion indicators | Low |
| `StatusIndicator` | Solar Feed (live/offline indicator), Sync states | Status display | Low |
| `InfoRow` (icon + text) | Celestial (resources), Solar Feed (card metadata) | Compact info display | Low |

### TIER 3: Polish (Build Last — Refinement)

These are optional but make the app feel more polished.

| Component | Used In | Reason | Complexity |
|-----------|---------|--------|-----------|
| `Tooltip` | Cards, timers (on hover for details) | Optional context | Medium |
| `Modal` / `Popover` | Deep-dive details | Not essential at MVP | High |
| `Button` variants | CTAs, toggles | Not heavily used initially | Low |

---

## Build Order (What to Implement First)

### Phase 1: Core Layout (Do This First)
1. `Card` — Reusable container with border, padding, hover state
2. `Section` — Container with top padding/divider for major sections
3. `Grid` — `repeat(auto-fit, minmax(280px, 1fr))` responsive layout
4. `Divider` — Somatic line (gold gradient separator)

**Why**: Everything else goes inside these. They're foundational.

### Phase 2: Content Organization (Do This Second)
5. `List` + `ListItem` — Sequential content container
6. `Timer` — Large countdown display with label
7. `Badge` — Small labeled pills for categorization
8. `ProgressBar` — Visual progress indicator

**Why**: These are used to organize information within the cards/sections.

### Phase 3: Enhancement (Do This Third)
9. `StatusIndicator` — Live/offline/syncing status pill
10. `InfoRow` — Icon + text + metadata combo
11. Polish existing components (PageHero, SectionHeader)

**Why**: These improve hierarchy and polish, but aren't blocking.

---

## Component Specifications (Aligned to .impeccable.md)

### 1. Card
```tsx
<Card 
  border="accent"  // 'accent', 'gold', 'teal', or 'none'
  padding="md"     // 'sm' (16px), 'md' (20px), 'lg' (24px)
  hover="subtle"   // 'subtle', 'glow', 'none'
>
  {children}
</Card>
```
**From .impeccable.md**: 1px border, teal-tinted or gold accent. Secondary background color. Radius 6px. 16–24px padding. Minimal shadow.

### 2. Section
```tsx
<Section title="CELESTIAL PENDULUM MASTER HUB" subtitle="Optional subtitle">
  {children}
</Section>
```
**From .impeccable.md**: h2 title (bold, gold). Extra space above (32px+ margin). 24–32px padding. Optional somatic line divider.

### 3. Grid
```tsx
<Grid gap="sm">  // 'sm' (12px), 'md' (16px), 'lg' (24px)
  {items}
</Grid>
```
**CSS**: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--gap)`

### 4. Timer
```tsx
<Timer 
  ms={timeRemainingMs}
  label="VOID FISSURE ACTIVE"
  accentColor="gold"  // or 'teal' for secondary
  size="lg"           // 'sm', 'md', 'lg'
/>
```
**From .impeccable.md**: Large, bold typography. Gold or accent color. Supporting label below in muted color.

### 5. List + ListItem
```tsx
<List gap="md">  // 'sm' (8px), 'md' (12px)
  <ListItem icon={<Icon />} label="Primary" meta="Secondary info" />
</List>
```
**From .impeccable.md**: Icon left-aligned, title bold, meta muted. 8–12px between items.

### 6. Badge
```tsx
<Badge variant="default" size="sm">
  Alert Type
</Badge>
```
**From .impeccable.md**: Small label, muted background, 1px border. Consistent styling across variants.

### 7. ProgressBar
```tsx
<ProgressBar 
  value={3}
  max={5}
  accentColor="gold"
/>
```
**From .impeccable.md**: Visual fill indicator. Smooth animation. Gold accent.

---

## Validation Against Stitch Concepts

### Does This Component Set Support the Stitch Layouts?

**Celestial Pendulum Reference**: 
- ✅ Section (title "CELESTIAL PENDULUM MASTER HUB")
- ✅ Sections with titles ("IMPERIAL RELIC", "VOID RELIC", "CEPHALON INTELLIGENCE")
- ✅ Grid or List inside sections (icon + text layouts)
- ✅ Timer (countdown display)

**Solar Rail Feed Reference**:
- ✅ Section (title "SOLAR RAIL FEED")
- ✅ Sections ("ACTIVE ALERTS", "ACTIVE INVASIONS", "DARVOS DEALS")
- ✅ Grid of cards (each with border, color-coded)
- ✅ Timers in cards (countdowns)
- ✅ Badges (alert types, content types)

**Void Reliquaries Reference**:
- ✅ Section (title "VOID RELIQUARIES")
- ✅ Grid of cards (fissure cards)
- ✅ Icon + text combinations

**Dailies & Weeklies Reference**:
- ✅ Section (title "DAILIES & WEEKLIES")
- ✅ ResetCounter (Timer component)
- ✅ KindHeader (Section component)
- ✅ List of challenges (ListItem component)
- ✅ ProgressBar (challenge progress)

**Verdict**: ✅ **Yes, this component set fully supports all Stitch layouts.**

---

## Existing Code → Component Refactoring

### DailiesWeekliesPage Refactor Example

**Current** (hardcoded):
```tsx
function ResetCounter({ label, msRemaining, urgentMs }) {
  // ~30 lines of hardcoded styling
}
```

**After**: 
```tsx
<Timer ms={msRemaining} label={label} accentColor={isUrgent ? "orange" : "gold"} />
```

**KindHeader** (hardcoded section header):
```tsx
<Section 
  title={KIND_LABEL[kind]} 
  styling={KIND_SECTION[kind]}  // Standardized via design tokens
/>
```

### SolarRailFeedPage Refactor Example

**Current**:
```tsx
<InvasionCard {...invasionData} />  // Custom card per type
<AlertCard {...alertData} />
<DarvoDealCard {...darvoDealData} />
```

**After**:
```tsx
<Grid>
  {invasions.map(inv => (
    <Card border="gold" padding="md">
      <InvasionCardContent {...inv} />
    </Card>
  ))}
</Grid>
```

The feature-specific card components stay (InvasionCard, AlertCard, etc.) but they inherit styling from `Card`, not recreate it.

---

## Implementation Plan

### Step 1: Build Tier 1 (Foundation)
- Create `src/components/ui/Card.tsx`
- Create `src/components/ui/Section.tsx`
- Create `src/components/ui/Grid.tsx`
- Create `src/components/ui/Divider.tsx`
- Update design tokens in `src/tokens/` to support CSS variables

### Step 2: Build Tier 2 (Enhancement)
- Create `src/components/ui/Timer.tsx`
- Create `src/components/ui/List.tsx` + `ListItem.tsx`
- Create `src/components/ui/Badge.tsx`
- Create `src/components/ui/ProgressBar.tsx`
- Create `src/components/ui/StatusIndicator.tsx`

### Step 3: Refactor Pages
- Update DailiesWeekliesPage to use Timer instead of ResetCounter
- Update SolarRailFeedPage to use Card + Grid instead of custom layouts
- Update Celestial to use Section + Timer + List
- Update Void Reliquaries to use Card + Grid

### Step 4: Polish
- Add hover states, transitions, animations
- Refine spacing, typography
- Test across all pages for consistency

---

## Success Criteria

Once these components are built:
- ✅ All pages use the same Card, Section, Grid, Timer components
- ✅ No hardcoded spacing or styling in pages
- ✅ All design decisions live in `.impeccable.md` and component tokens
- ✅ Adding a new page/tab means just combining existing components
- ✅ Theming means swapping CSS variables, not rewriting components
- ✅ Future design changes = update component once, apply everywhere

---

## Notes

- **Don't build custom cards per content type yet** — Build generic Card, let feature-specific components add content
- **Feature-specific components stay** (InvasionCard, ChallengeCard, etc.) but they use Card as their wrapper, not their entire implementation
- **Tokens first** — Before building any component, ensure its colors, sizing, spacing are tokenized
- **Test with real data** — Once a component is built, refactor one page to use it immediately; catch issues early

---

*This audit validates that the component set supports both your design system (.impeccable.md) and your reference designs (Stitch concepts). Build in this order, refactor as you go.*
