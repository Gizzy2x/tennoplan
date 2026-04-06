# Design System Document: The Orokin Digital Standard

## 1. Overview & Creative North Star
**Creative North Star: "The Celestial Archive"**

This design system is not a mere utility; it is a digital artifact. It draws inspiration from Orokin architecture—a marriage of ancient biological elegance and cold, advanced geometric precision. To achieve the "Prime" aesthetic, we move away from the "flat web" and toward **Digital Reliquaries**.

The interface must feel like it is projected onto panels of white marble and obsidian glass. We break the standard grid through **Intentional Asymmetry**: using large serif display type that bleeds off-center, paired with secondary information tucked into ultra-clean, minimalist corners. The goal is to make the user feel like an archivist uncovering secrets, not an app user scrolling through data.

---

## 2. Colors & Surface Philosophy
The palette is rooted in high-contrast luxury. We use depth and material properties to define space, rather than structural lines.

### The Palette (Material Design Tokens)
*   **Background (Obsidian):** `#131313` (Surface) | `#0E0E0E` (Surface Container Lowest)
*   **Primary (Polished Gold):** `#E3C372` | `#C1A355` (Primary Container)
*   **Accents (Ivory Marble):** `#F2F2F2` (On-Surface) | `#C6C6C7` (Secondary)
*   **State Colors:** Errors use `#FFB4AB` (Gold-tinted reds) to maintain the regal warmth.

### The "No-Line" Rule
Explicitly prohibit 1px solid, opaque borders for sectioning. Boundaries are defined by:
1.  **Tonal Shifts:** Placing a `surface-container-high` card on a `surface` background.
2.  **Negative Space:** Using the spacing scale to create "cloisters" of information.
3.  **Light Leaks:** Using subtle `primary` gradients (5% opacity) to suggest an edge.

### Glassmorphism & Texture
Floating panels (Modals, Navigation Bars) must utilize **Glassmorphism**:
*   **Background:** `surface` at 60% opacity.
*   **Effect:** `backdrop-blur(12px)`.
*   **Watermark:** Integrate a 5% opacity Tennobet script watermark into the `surface-container-lowest` to create the "Ancient" brand personality.

---

## 3. Typography
We use a high-contrast pairing to reflect the "Ancient yet Advanced" personality.

| Role | Token | Font | Size | Character |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Noto Serif | 3.5rem | All Caps, wide tracking (0.1em). |
| **Headline**| `headline-md` | Noto Serif | 1.75rem | The "Voice" of the Archive. |
| **Title**   | `title-lg` | Inter | 1.375rem | Bold, utilitarian, advanced. |
| **Body**    | `body-md` | Inter | 0.875rem | High readability, neutral. |
| **Label**   | `label-sm` | Inter | 0.6875rem | Monospaced feel for technical data. |

**Editorial Note:** Use `display-lg` sparingly. It should feel like an architectural inscription. Always left-align or dramatically right-align; never center-align large blocks of serif text.

---

## 4. Elevation & Depth
In this system, depth is "Physical Stacking." We do not use traditional drop shadows that look like "web shadows."

*   **The Layering Principle:** 
    *   Base Layer: `surface-dim` (#131313).
    *   In-set Content: `surface-container-lowest` (#0E0E0E) to create a "carved" look.
    *   Raised Content: `surface-container-high` (#2A2A2A) to create a "protruding" look.
*   **Ambient Shadows:** If a floating element requires lift (e.g., a "Prime" relic tooltip), use a shadow color of `#C1A355` at 6% opacity with a 32px blur. It should look like a golden glow, not a shadow.
*   **The Ghost Border:** For containment, use the `outline-variant` token at **20% opacity**. This creates the "1px gold border" requested, but keeps it ethereal and premium.

---

## 5. Components

### Buttons (The "Sigils")
*   **Primary:** Solid `primary-container` (#C1A355). Text in `on-primary-container`. 0.25rem (sm) corner radius. No shadow.
*   **Secondary:** `Ghost Border` (20% Gold) with a subtle 5% gold fill.
*   **Tertiary:** Text-only, All Caps `label-md` with 0.15em letter spacing.

### Cards & Lists (The "Relics")
*   **Constraint:** Zero dividers.
*   **Styling:** Use `surface-container-low` with a 1px `Ghost Border` top-stroke only. This creates a "tiered" shelf look.
*   **Interaction:** On hover, the border opacity increases from 20% to 60%.

### Input Fields (The "Inscriptions")
*   **Style:** Bottom-border only (Ghost Border style). Background is a subtle `surface-container-highest` gradient.
*   **Focus:** The bottom border transitions to 100% `primary` gold with a 4px "outer glow" (blur).

### Specialized Component: The Relic Tracker
*   Use a **Radial Progress Dial** instead of a linear bar. The "empty" track should be `surface-variant` and the "filled" track a gradient of `primary` to `primary-fixed-dim`.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Place small, technical Inter labels next to large Noto Serif headers.
*   **Layer with Intent:** Use `backdrop-blur` to show that the "Void" (the background) exists behind the data.
*   **Use Micro-Interactions:** Elements should "fade and slide" 10px upward when appearing, mimicking a holographic projection.

### Don't:
*   **Don't use 100% Opacity Borders:** It breaks the "mystical" quality and makes the app look like a standard dashboard.
*   **Don't use Rounded Corners > 8px:** The Orokin aesthetic is sharp and precise. Keep `roundedness-sm` or `none` for a more "advanced" feel. 
*   **Don't Over-center:** Centered layouts feel like templates. Keep content anchored to the edges to feel like a high-end editorial spread.
*   **Don't use Pure White:** Use the Ivory Marble (#F2F2F2) or the Gold-tinted `on-surface-variant` to ensure the screen doesn't feel clinical.