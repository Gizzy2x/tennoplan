import { useEffect, useState, type ComponentType } from "react";
import { Header } from "./Header";
import { HotkeysCheatSheet } from "@/components/common/HotkeysCheatSheet";
import { Toaster } from "@/components/common/Toaster";
import { CodexQuickLook } from "@/features/codex/components/CodexQuickLook";
import { setHotkeyScope } from "@/hooks/useHotkeys";
import { useNavigationStore, type NavTab } from "@/store/navigation";
import { WorldstateSync } from "@/services/WorldstateSync";
import { StaticDataService } from "@/services/StaticDataService";
import { DropDataService } from "@/adapters/api/DropDataService";

import { DailiesWeekliesPage } from "@/features/dailies-weeklies/DailiesWeekliesPage";
import { CelestialPendulumPage } from "@/features/celestial-pendulum/CelestialPendulumPage";
import { VoidReliquariesPage } from "@/features/void-reliquaries/VoidReliquariesPage";
import { ArsenalFabricationPage } from "@/features/arsenal-fabrication/ArsenalFabricationPage";
import { AscensionRegistryPage } from "@/features/ascension-registry/AscensionRegistryPage";
import { CodexPage } from "@/features/codex/CodexPage";
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
  "codex": CodexPage,
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

  // Tabs the user has visited at least once this session. Once a tab is
  // visited it stays mounted (hidden via CSS when inactive) so each
  // page's full state — Codex sub-tab + selected entry, scroll position,
  // any filters — survives sidebar tab switches. The first visit is the
  // only mount; thereafter it's free to return to.
  //
  // Lazy-add strategy: only mounted pages render. Tabs never visited stay
  // truly unmounted, so first-load doesn't pay for pages the user never
  // opens.
  const [visited, setVisited] = useState<Set<NavTab>>(
    () => new Set<NavTab>([activeTab]),
  );

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
    // Hotkeys scoped to a particular tab only fire when that tab is
    // active. Page-level hotkeys register with `scope: <tabId>` and
    // this single line at the shell level keeps them in sync.
    setHotkeyScope(activeTab);
  }, [activeTab]);

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
    //
    // DropDataService.init() does the same for the bounty/relic drop tables
    // (download-once, staleness-gated) so bounties populate WITHOUT the user
    // hitting a manual "Load bounty data" button. Identity (uniqueName) is
    // resolved at read-time against the codex via the dropResolver.
    WorldstateSync.init();
    void StaticDataService.init();
    void DropDataService.init();

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

  return (
    <>
      <Header />
      <HotkeysCheatSheet />
      <Toaster />
      {/* Global "smart window" — opened by any surface via quickLook.open(). */}
      <CodexQuickLook />

      {staleInfo?.isStale && (
        <div
          style={{
            position: "fixed",
            top:      'var(--header-h, 44px)',
            right:    0,
            left:     0,
            zIndex:   39,
          }}
        >
          <StaleBanner staleInfo={staleInfo} />
        </div>
      )}

      <main
        style={{
          /* Reserve header height up top + optional stale-banner extra.
             --header-h is written live by the header (useElementHeightVar). */
          paddingTop: staleInfo?.isStale
            ? 'calc(var(--header-h, 44px) + 56px)'
            : 'calc(var(--header-h, 44px) + 8px)',
        }}
        className="pb-8 px-6 min-h-screen relative overflow-hidden"
      >
        {(Object.entries(PAGE_MAP) as Array<[NavTab, ComponentType]>).map(
          ([tab, Page]) => {
            if (!visited.has(tab)) return null;
            const isActive = tab === activeTab;
            // Hidden tabs stay mounted (state + scroll position preserved)
            // but are display:none'd so they don't render or steal focus.
            // React 19's native `inert` removes them from the a11y tree.
            return (
              <div
                key={tab}
                style={{ display: isActive ? undefined : 'none' }}
                aria-hidden={isActive ? undefined : true}
                {...(isActive ? {} : { inert: true })}
              >
                <Page />
              </div>
            );
          },
        )}
      </main>
    </>
  );
}
