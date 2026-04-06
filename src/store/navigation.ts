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
  | "scholars-arcanum"
  | "bazaar-of-seven"
  | "solar-rail-feed"
  | "platinum-ledger"
  | "neural-archive"
  | "cephalon-weave";

export interface NavItem {
  id: NavTab;
  label: string;
  breadcrumb: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "celestial-pendulum",
    label: "CELESTIAL PENDULUM",
    breadcrumb: "CELESTIAL_PENDULUM",
    icon: Clock,
  },
  {
    id: "void-reliquaries",
    label: "VOID RELIQUARIES",
    breadcrumb: "VOID_RELIQUARIES",
    icon: Archive,
  },
  {
    id: "arsenal-fabrication",
    label: "ARSENAL FABRICATION",
    breadcrumb: "ARSENAL_FABRICATION",
    icon: Wrench,
  },
  {
    id: "ascension-registry",
    label: "ASCENSION REGISTRY",
    breadcrumb: "ASCENSION_REGISTRY",
    icon: Medal,
  },
  {
    id: "scholars-arcanum",
    label: "THE SCHOLAR'S ARCANUM",
    breadcrumb: "SCHOLARS_ARCANUM",
    icon: BookOpen,
  },
  {
    id: "bazaar-of-seven",
    label: "BAZAAR OF THE SEVEN",
    breadcrumb: "BAZAAR_OF_SEVEN",
    icon: Store,
  },
  {
    id: "solar-rail-feed",
    label: "THE SOLAR RAIL FEED",
    breadcrumb: "SOLAR_RAIL_FEED",
    icon: Rss,
  },
  {
    id: "platinum-ledger",
    label: "THE PLATINUM LEDGER",
    breadcrumb: "PLATINUM_LEDGER",
    icon: Wallet,
  },
  {
    id: "neural-archive",
    label: "THE NEURAL ARCHIVE",
    breadcrumb: "NEURAL_ARCHIVE",
    icon: Cpu,
  },
  {
    id: "cephalon-weave",
    label: "CEPHALON WEAVE",
    breadcrumb: "CEPHALON_WEAVE",
    icon: Network,
  },
];

interface NavigationState {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: "celestial-pendulum",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
