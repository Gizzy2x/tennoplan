import { create } from "zustand";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Archive,
  Wrench,
  Medal,
  BookOpen,
  Store,
  Rss,
  Wallet,
  Cpu,
  Network,
} from "lucide-react";

export type NavTab =
  | "dailies-weeklies"
  | "celestial-pendulum"
  | "void-reliquaries"
  | "arsenal-fabrication"
  | "ascension-registry"
  | "codex"
  | "bazaar-of-seven"
  | "solar-rail-feed"
  | "platinum-ledger"
  | "neural-archive"
  | "cephalon-weave"
  | "settings";

export interface NavItem {
  id: NavTab;
  /** Long-form label used in the hamburger dropdown + aria-labels. */
  label: string;
  /** Short label rendered in the inline desktop nav bar (≤10 chars). */
  short: string;
  breadcrumb: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "celestial-pendulum",
    label: "CELESTIAL PENDULUM",
    short: "Pendulum",
    breadcrumb: "CELESTIAL_PENDULUM",
    icon: Clock,
  },
  {
    id: "void-reliquaries",
    label: "VOID RELIQUARIES",
    short: "Reliquaries",
    breadcrumb: "VOID_RELIQUARIES",
    icon: Archive,
  },
  {
    id: "arsenal-fabrication",
    label: "ARSENAL FABRICATION",
    short: "Arsenal",
    breadcrumb: "ARSENAL_FABRICATION",
    icon: Wrench,
  },
  {
    id: "ascension-registry",
    label: "ASCENSION REGISTRY",
    short: "Registry",
    breadcrumb: "ASCENSION_REGISTRY",
    icon: Medal,
  },
  {
    id: "codex",
    label: "CODEX",
    short: "Codex",
    breadcrumb: "CODEX",
    icon: BookOpen,
  },
  {
    id: "bazaar-of-seven",
    label: "BAZAAR OF THE SEVEN",
    short: "Bazaar",
    breadcrumb: "BAZAAR_OF_SEVEN",
    icon: Store,
  },
  {
    id: "solar-rail-feed",
    label: "THE SOLAR RAIL FEED",
    short: "Feed",
    breadcrumb: "SOLAR_RAIL_FEED",
    icon: Rss,
  },
  {
    id: "platinum-ledger",
    label: "THE PLATINUM LEDGER",
    short: "Ledger",
    breadcrumb: "PLATINUM_LEDGER",
    icon: Wallet,
  },
  {
    id: "neural-archive",
    label: "THE NEURAL ARCHIVE",
    short: "Archive",
    breadcrumb: "NEURAL_ARCHIVE",
    icon: Cpu,
  },
  {
    id: "cephalon-weave",
    label: "CEPHALON WEAVE",
    short: "Weave",
    breadcrumb: "CEPHALON_WEAVE",
    icon: Network,
  },
];

/**
 * A queued request to open a codex entry from anywhere in the app.
 * `uniqueName` is the primary key into db.tennoplanItems; `name` is an
 * optional fallback the codex can resolve by when the uniqueName misses
 * (e.g. a reward whose items-map id differs slightly from the codex id).
 */
export interface CodexDeepLink {
  uniqueName: string;
  name?:      string;
}

interface NavigationState {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;

  /**
   * Cross-tab "wiki link" channel. Any surface (bounty reward, drop row,
   * recipe component, …) can deep-link into the Codex; the Codex tab opens
   * the entry and a "← Back to {origin}" affordance returns the user to the
   * page they came from. Codex is the canonical detail view — every other
   * surface is a window into it.
   */
  pendingCodexEntry: CodexDeepLink | null;
  /** Tab to return to from a deep-linked codex entry. null once consumed/cleared. */
  codexReturnTab: NavTab | null;

  /** Open a codex entry from anywhere; remembers the current tab for Back. */
  openCodexEntry: (uniqueName: string, name?: string) => void;
  /** Codex reads + clears the queued deep-link on its next render. */
  consumePendingCodexEntry: () => CodexDeepLink | null;
  /** Drop the saved return tab (Back used, or the user explored codex laterally). */
  clearCodexReturn: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  activeTab: "celestial-pendulum",
  setActiveTab: (tab) => set({ activeTab: tab }),

  pendingCodexEntry: null,
  codexReturnTab: null,

  openCodexEntry: (uniqueName, name) =>
    set((s) => ({
      pendingCodexEntry: { uniqueName, name },
      // Preserve the original origin if a deep-link fires while already in codex.
      codexReturnTab: s.activeTab === "codex" ? s.codexReturnTab : s.activeTab,
      activeTab: "codex",
    })),

  consumePendingCodexEntry: () => {
    const pending = get().pendingCodexEntry;
    if (pending) set({ pendingCodexEntry: null });
    return pending;
  },

  clearCodexReturn: () => set({ codexReturnTab: null }),
}));

// Dev-only: expose the store on window so the preview harness can
// jump tabs directly. Tree-shaken out of prod by Vite when import.meta.env.DEV
// is false; the assignment lives in a guarded block.
if (import.meta.env.DEV) {
  (window as unknown as { __nav?: typeof useNavigationStore }).__nav = useNavigationStore;
}
