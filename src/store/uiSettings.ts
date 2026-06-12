import { create } from "zustand";

/* ================================================================
   UI Settings Store — Density Mode (Impeccable v3, 2026-05-31)

   The density mode controls which set of --density-* CSS tokens
   is active. See src/index.css for the token definitions and
   .impeccable.md §6 for the rationale.

   - "standard" (default ≥1440px viewport): h1 28px, body 14px,
     12px gap, 16px edge padding. Comfortable for large monitors.
   - "compact" (default <1440px viewport, e.g. 1080p second
     monitors): h1 24px, body 13px, 8px gap, 12px edge padding.
     Power-user dense.

   Auto vs sticky (dossier §8.7.1): until the user explicitly picks
   a density, we AUTO-detect from viewport width and keep following
   window resizes live (matchMedia listener below) — fixing the
   "shrink the window, nothing recompresses" flaw. The moment the
   user chooses via setDensity()/toggleDensity(), the choice is
   persisted to localStorage and auto-detection stops for good.
   Fine-grained in-session adaptation below the density floor is
   handled by container queries on `.panel` (see index.css).
   ================================================================ */

export type Density = "compact" | "standard";

/* Theme (dossier §8.5) — pre-wired so the eventual multi-theme system is
   a pure CSS swap: each theme is a `[data-theme="…"]` block in index.css
   redefining the SEMANTIC token tier; components never change. Only one
   theme exists today; add new names to this union as themes ship. */
export type Theme = "mutalist-glow";

const STORAGE_KEY = "tennoplan:density";
const THEME_STORAGE_KEY = "tennoplan:theme";
const DEFAULT_THEME: Theme = "mutalist-glow";
const COMPACT_VIEWPORT_MAX = 1440;

function detectInitial(): Density {
  if (typeof window === "undefined") return "standard";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "compact" || stored === "standard") return stored;

  return window.innerWidth < COMPACT_VIEWPORT_MAX ? "compact" : "standard";
}

function applyDensityAttr(density: Density): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = density;
}

function detectInitialTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "mutalist-glow") return stored;
  return DEFAULT_THEME;
}

function applyThemeAttr(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

interface UiSettingsState {
  density: Density;
  theme: Theme;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
  setTheme: (theme: Theme) => void;
}

const initialDensity = detectInitial();
applyDensityAttr(initialDensity);

const initialTheme = detectInitialTheme();
applyThemeAttr(initialTheme);

export const useUiSettingsStore = create<UiSettingsState>((set, get) => ({
  density: initialDensity,
  theme: initialTheme,
  setDensity: (density) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, density);
    }
    applyDensityAttr(density);
    set({ density });
  },
  toggleDensity: () => {
    const next: Density = get().density === "compact" ? "standard" : "compact";
    get().setDensity(next);
  },
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    applyThemeAttr(theme);
    set({ theme });
  },
}));

/* While the user hasn't explicitly chosen (no localStorage entry), follow
   viewport-width changes live. setDensity() persists a choice, after which
   the guard below makes this listener a no-op — sticky wins. */
if (typeof window !== "undefined") {
  const mql = window.matchMedia(`(max-width: ${COMPACT_VIEWPORT_MAX - 1}px)`);
  const onViewportChange = (e: MediaQueryListEvent) => {
    if (window.localStorage.getItem(STORAGE_KEY) !== null) return;
    const next: Density = e.matches ? "compact" : "standard";
    applyDensityAttr(next);
    useUiSettingsStore.setState({ density: next });
  };
  mql.addEventListener("change", onViewportChange);
}
