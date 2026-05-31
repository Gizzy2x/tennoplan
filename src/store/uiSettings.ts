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

   On first run we auto-detect from viewport width. The user can
   override via Settings (UI not yet wired — store is ready to be
   consumed when the Settings panel ships). Subsequent runs read
   the user's choice from localStorage; we do not re-auto-detect
   on resize so the choice stays sticky.
   ================================================================ */

export type Density = "compact" | "standard";

const STORAGE_KEY = "tennoplan:density";
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

interface UiSettingsState {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
}

const initialDensity = detectInitial();
applyDensityAttr(initialDensity);

export const useUiSettingsStore = create<UiSettingsState>((set, get) => ({
  density: initialDensity,
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
}));
