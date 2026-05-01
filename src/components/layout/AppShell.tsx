import { useEffect, useState, type ComponentType } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNavigationStore, type NavTab } from "@/store/navigation";
import { SyncService } from "@/services/SyncService";
import { WorldstateSync } from "@/services/WorldstateSync";
import { StaticDataService } from "@/services/StaticDataService";

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
import { SettingsPage } from "@/features/settings/SettingsPage";
import { StaleBanner } from "@/components/common/StaleBanner";
import { useStaticDataCheck } from "@/hooks/useStaticDataCheck";

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
  "settings": SettingsPage,
};

export function AppShell() {
  const activeTab = useNavigationStore((s) => s.activeTab);
  const isCollapsed = useNavigationStore((s) => s.isCollapsed);
  const [recheckTick, setRecheckTick] = useState(0);
  const ActivePage = PAGE_MAP[activeTab];
  const sidebarW = isCollapsed ? RAIL_W : EXPANDED_W;

  // On-launch stale check — lightweight Dexie read, no network call.
  // Banner hides automatically when staleInfo.isStale is false.
  // Re-checks when SettingsPage dispatches a 'static-data:synced' event.
  const { staleInfo } = useStaticDataCheck(recheckTick);

  useEffect(() => {
    // Live worldstate only. Static data (items + drops) is Settings-driven —
    // no auto-sync on launch. See DropDataService.
    //
    // Phase D.2/D.3 — V2 services (WorldstateSync + StaticDataService) run
    // alongside the legacy SyncService when VITE_WORLDSTATE_V2_ENABLED=true.
    // They write to disjoint Dexie tables (legacy: cache.worldstate_master +
    // items; V2: worldstate + syncMetadata + tennoplanItems) so they don't
    // conflict. Default is V2 OFF — D.4 will flip to V2-only once feature
    // consumers are migrated.
    //
    // StaticDataService.init() is fire-and-forget: it checks the local
    // codex's freshness and triggers a background refresh if stale. No
    // cleanup needed (it doesn't own any timers).
    const v2Enabled = import.meta.env.VITE_WORLDSTATE_V2_ENABLED === "true";

    SyncService.init();
    if (v2Enabled) {
      WorldstateSync.init();
      void StaticDataService.init();
    }

    return () => {
      SyncService.destroy();
      if (v2Enabled) WorldstateSync.destroy();
    };
  }, []);

  useEffect(() => {
    const handleSyncComplete = () => {
      setRecheckTick((t) => t + 1);
    };
    document.addEventListener('static-data:synced', handleSyncComplete);
    return () => {
      document.removeEventListener('static-data:synced', handleSyncComplete);
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

      {/* Global stale-data banner — shown just below the fixed header */}
      {staleInfo?.isStale && (
        <div
          style={{
            marginLeft: sidebarW,
            transition: "margin-left 250ms ease-in-out",
            position:   "fixed",
            top:        64, // header height
            right:      0,
            left:       sidebarW,
            zIndex:     39,
          }}
        >
          <StaleBanner staleInfo={staleInfo} />
        </div>
      )}

      <main
        style={{
          marginLeft: sidebarW,
          transition: "margin-left 250ms ease-in-out",
          // Extra top padding when banner is visible so content isn't hidden behind it
          paddingTop: staleInfo?.isStale ? 96 + 32 : undefined,
        }}
        className="pt-24 pb-8 px-6 min-h-screen relative overflow-hidden"
      >
        <ActivePage />
      </main>
    </>
  );
}
