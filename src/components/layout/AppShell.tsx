import { useEffect, useState, type ComponentType } from "react";
import { Sidebar, SIDEBAR_W } from "./Sidebar";
import { Header } from "./Header";
import { useNavigationStore, type NavTab } from "@/store/navigation";
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
  const [recheckTick, setRecheckTick] = useState(0);
  const ActivePage = PAGE_MAP[activeTab];

  const { staleInfo } = useStaticDataCheck(recheckTick);

  useEffect(() => {
    // Phase E — V2 is the only worldstate authority.
    //
    // All feature hooks (useWorldCycles, useFissures, useSolarRailFeed,
    // useSyndicateMissions, useSimaris, useDailiesData, useDailiesWeeklies)
    // read ParsedWorldstate from db.worldstate via useWorldstate(). The
    // legacy SyncService polling pipeline has been retired.
    //
    // StaticDataService.init() is fire-and-forget: it checks the local
    // codex's freshness and triggers a background refresh if stale. No
    // cleanup needed (it doesn't own any timers).
    WorldstateSync.init();
    void StaticDataService.init();

    return () => {
      WorldstateSync.destroy();
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

  // Sidebar width is fixed; sync once so cinematic backgrounds resolve correctly.
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${SIDEBAR_W}px`);
  }, []);

  return (
    <>
      <Sidebar />
      <Header />

      {staleInfo?.isStale && (
        <div
          style={{
            position: "fixed",
            top:      64,
            right:    0,
            left:     SIDEBAR_W,
            zIndex:   39,
          }}
        >
          <StaleBanner staleInfo={staleInfo} />
        </div>
      )}

      <main
        style={{
          marginLeft: SIDEBAR_W,
          paddingTop: staleInfo?.isStale ? 96 + 32 : undefined,
        }}
        className="pt-24 pb-8 px-6 min-h-screen relative overflow-hidden"
      >
        <ActivePage />
      </main>
    </>
  );
}
