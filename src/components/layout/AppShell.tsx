import { useEffect, type ComponentType } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNavigationStore, type NavTab } from "@/store/navigation";
import { SyncService } from "@/services/SyncService";
import { ItemsService } from "@/adapters/api/ItemsService";

import { DailiesWeekliesPage } from "@/features/dailies-weeklies/DailiesWeekliesPage";
import { CelestialPendulumPage } from "@/features/celestial-pendulum/CelestialPendulumPage";
import { VoidReliquariesPage } from "@/features/void-reliquaries/VoidReliquariesPage";
import { ArsenalFabricationPage } from "@/features/arsenal-fabrication/ArsenalFabricationPage";
import { AscensionRegistryPage } from "@/features/ascension-registry/AscensionRegistryPage";
import { ScholarsArcanumPage } from "@/features/scholars-arcanum/ScholarsArcanumPage";
import { BazaarOfSevenPage } from "@/features/bazaar-of-seven/BazaarOfSevenPage";
import { SolarRailFeedPage } from "@/features/solar-rail-feed/SolarRailFeedPage";
import { PlatinumLedgerPage } from "@/features/platinum-ledger/PlatinumLedgerPage";
import { NeuralArchivePage } from "@/features/neural-archive/NeuralArchivePage";
import { CephalonWeavePage } from "@/features/cephalon-weave/CephalonWeavePage";

const EXPANDED_W = 260;
const RAIL_W = 72;

const PAGE_MAP: Record<NavTab, ComponentType> = {
  "dailies-weeklies": DailiesWeekliesPage,
  "celestial-pendulum": CelestialPendulumPage,
  "void-reliquaries": VoidReliquariesPage,
  "arsenal-fabrication": ArsenalFabricationPage,
  "ascension-registry": AscensionRegistryPage,
  "scholars-arcanum": ScholarsArcanumPage,
  "bazaar-of-seven": BazaarOfSevenPage,
  "solar-rail-feed": SolarRailFeedPage,
  "platinum-ledger": PlatinumLedgerPage,
  "neural-archive": NeuralArchivePage,
  "cephalon-weave": CephalonWeavePage,
};

export function AppShell() {
  const activeTab = useNavigationStore((s) => s.activeTab);
  const isCollapsed = useNavigationStore((s) => s.isCollapsed);
  const ActivePage = PAGE_MAP[activeTab];
  const sidebarW = isCollapsed ? RAIL_W : EXPANDED_W;

  useEffect(() => {
    SyncService.init();
    ItemsService.init();
    return () => {
      SyncService.destroy();
      ItemsService.destroy();
    };
  }, []);

  // Keep the CSS variable in sync so fixed cinematic backgrounds adapt automatically
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${sidebarW}px`);
  }, [sidebarW]);

  return (
    <>
      <Sidebar />
      <Header />

      <main
        style={{
          marginLeft: sidebarW,
          transition: "margin-left 250ms ease-in-out",
        }}
        className="pt-24 pb-12 px-12 min-h-screen relative overflow-hidden"
      >
        <ActivePage />
      </main>
    </>
  );
}
