/**
 * CodexPage — the Codex tab. Three-view state machine.
 *
 *   view: 'landing'  — overview / spotlight / collections (default first visit)
 *         'browser'  — category sub-tab (Mods, Warframes)
 *         'detail'   — single TennoplanItem entry (full-page) for non-mod
 *                      categories. Mods open in ModDetailModal (overlay)
 *                      regardless of view, so the modal lives at the root
 *                      and isn't owned by ModsBrowser anymore.
 *
 * Session behaviour: the very first time the user opens the Codex tab in
 * a given app session, they land on the overview. Subsequent visits resume
 * whatever view they had left. The flag is module-level so it resets on
 * app reload but survives sidebar tab switches.
 *
 * History tracking: every entry-open path — spotlight, recently added,
 * continue-browsing card, browser card — funnels through handleSelectEntry
 * which pushes to codexHistory + routes to the right surface. There is
 * exactly one place to update the contract.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Home } from 'lucide-react';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import { useCodexHistory, type CodexHistoryEntry } from '@/store/codexHistory';
import { projectMod, type ModEntry } from '@/lib/mods/codexModsAdapter';
import { ModsBrowser } from './browsers/ModsBrowser';
import { WarframesBrowser } from './browsers/WarframesBrowser';
import { WeaponsBrowser } from './browsers/WeaponsBrowser';
import { CompanionsBrowser } from './browsers/CompanionsBrowser';
import { ArcanesBrowser } from './browsers/ArcanesBrowser';
import { ResourcesBrowser } from './browsers/ResourcesBrowser';
import { ModDetailModal } from './components/ModDetailModal';
import { CodexEntryPage } from './entry/CodexEntryPage';
import { CodexLanding } from './landing/CodexLanding';
import type { CodexCollectionKey } from './landing/blocks/CollectionsGrid';

type CodexView = 'landing' | 'browser' | 'detail';
type SubTab    = 'mods' | 'warframes' | 'weapons' | 'companions' | 'arcanes' | 'resources';

const SUBTABS: Array<{ key: SubTab; label: string }> = [
  { key: 'mods',       label: 'Mods' },
  { key: 'warframes',  label: 'Warframes' },
  { key: 'weapons',    label: 'Weapons' },
  { key: 'companions', label: 'Companions' },
  { key: 'arcanes',    label: 'Arcanes' },
  { key: 'resources',  label: 'Resources' },
];

// Session flag: did the user already see the landing this app session?
// Module-scoped so it survives Codex unmount/remount on sidebar tab
// switches, but resets on app reload — exactly the "first visit per
// session" semantics the design calls for.
let hasSeenLandingThisSession = false;

export function CodexPage() {
  const initialView: CodexView = hasSeenLandingThisSession ? 'browser' : 'landing';
  const [view, setView]                   = useState<CodexView>(initialView);
  const [previousView, setPreviousView]   = useState<CodexView>('landing');
  const [subTab, setSubTab]               = useState<SubTab>('mods');
  const [selectedEntry, setSelectedEntry] = useState<TennoplanItem | null>(null);
  /**
   * Detail-nav breadcrumb. When the user opens an entry FROM another entry
   * (e.g. clicks a component on a warframe page), the current entry is
   * pushed here so Back unwinds the chain instead of jumping all the way
   * out to landing/browser. Empties when the chain is fully unwound; at
   * that point Back falls through to `previousView`.
   */
  const [detailStack, setDetailStack]     = useState<TennoplanItem[]>([]);
  const [selectedMod, setSelectedMod]     = useState<ModEntry | null>(null);
  const [modsCount, setModsCount]             = useState<number>(0);
  const [warframesCount, setWarframesCount]   = useState<number>(0);
  const [weaponsCount, setWeaponsCount]       = useState<number>(0);
  const [companionsCount, setCompanionsCount] = useState<number>(0);
  const [arcanesCount, setArcanesCount]       = useState<number>(0);
  const [resourcesCount, setResourcesCount]   = useState<number>(0);

  // Mark landing as "seen" once the user moves past it. Subsequent
  // Codex tab visits in this session resume the browser instead.
  useEffect(() => {
    if (view !== 'landing') hasSeenLandingThisSession = true;
  }, [view]);

  const pushHistory = useCodexHistory((s) => s.push);

  // Single source of truth for "open this entry". Routes mods to the
  // modal (current UX) and everything else to the full detail view.
  const handleSelectEntry = useCallback((entry: TennoplanItem) => {
    pushHistory({
      uniqueName: entry.uniqueName,
      name:       entry.name,
      category:   entry.category,
      iconUrl:    entry.iconUrl,
    });

    if (entry.category === 'Mod') {
      setSelectedMod(projectMod(entry));
      return;
    }
    // Detail → Detail (e.g. clicking a component card from a warframe
    // page): push the CURRENT entry onto the stack so Back returns to it
    // rather than skipping straight back to landing/browser. previousView
    // stays whatever it was when the chain began.
    if (view === 'detail' && selectedEntry) {
      setDetailStack((prev) => [...prev, selectedEntry]);
    } else {
      // Fresh entry into the detail view (from landing or browser) —
      // record where we came from and start with an empty chain.
      setPreviousView(view);
      setDetailStack([]);
    }
    setSelectedEntry(entry);
    setView('detail');
  }, [pushHistory, view, selectedEntry]);

  // Browsers pass projected ModEntry directly — no Dexie round-trip needed
  // since ModsBrowser already has the projection in hand.
  const handleSelectMod = useCallback((mod: ModEntry) => {
    pushHistory({
      uniqueName: mod.uniqueName,
      name:       mod.name,
      category:   'Mod',
      iconUrl:    mod.iconUrl,
    });
    setSelectedMod(mod);
  }, [pushHistory]);

  // Continue-browsing cards carry a minimal history shape, not a full
  // TennoplanItem. Re-resolve from Dexie before reopening so we get the
  // current canonical data (the underlying item may have been re-enriched
  // since it was last viewed).
  const handleSelectHistory = useCallback(async (entry: CodexHistoryEntry) => {
    const item = await db.tennoplanItems.get(entry.uniqueName);
    if (item) {
      handleSelectEntry(item);
    } else {
      // Item is no longer in the codex (vaulted out, renamed, dropped from
      // pipeline). For now just open the modal stub for mods or fail quietly
      // — a toast system can land here later.
      // eslint-disable-next-line no-console
      console.warn('[codex] history entry no longer in Dexie:', entry.uniqueName);
    }
  }, [handleSelectEntry]);

  const handleSelectCollection = useCallback((key: CodexCollectionKey) => {
    // Coming-soon tiles are disabled at the tile level, so this handler
    // only fires for ready collections. Each key maps 1:1 to a subTab.
    if (key === 'mods')       setSubTab('mods');
    if (key === 'warframes')  setSubTab('warframes');
    if (key === 'weapons')    setSubTab('weapons');
    if (key === 'companions') setSubTab('companions');
    if (key === 'arcanes')    setSubTab('arcanes');
    if (key === 'resources')  setSubTab('resources');
    setView('browser');
  }, []);

  const handleSubTab = useCallback((next: SubTab) => {
    setSubTab(next);
    setView('browser');
    setSelectedEntry(null);
  }, []);

  const handleBackToLanding = useCallback(() => {
    setView('landing');
    setSelectedEntry(null);
  }, []);

  // Back unwinds one step:
  //   1. If we're mid-chain (clicked into a component), pop the stack and
  //      show the previous entry. Stays in 'detail' view.
  //   2. Once the chain is empty, fall through to whichever view the user
  //      was on before entering detail (landing or browser).
  const handleBackFromDetail = useCallback(() => {
    if (detailStack.length > 0) {
      const next = detailStack[detailStack.length - 1]!;
      setDetailStack((prev) => prev.slice(0, -1));
      setSelectedEntry(next);
      return;
    }
    setSelectedEntry(null);
    setView(previousView);
  }, [detailStack, previousView]);

  const handleCloseModal = useCallback(() => setSelectedMod(null), []);

  // The page hero subtitle reads the active sub-tab's count.
  const browserSubtitle = useMemo(() => {
    const n =
      subTab === 'mods'       ? modsCount       :
      subTab === 'warframes'  ? warframesCount  :
      subTab === 'weapons'    ? weaponsCount    :
      subTab === 'companions' ? companionsCount :
      subTab === 'arcanes'    ? arcanesCount    :
                                resourcesCount;
    return `${n.toLocaleString()} ${subTab} · Click to inspect`;
  }, [subTab, modsCount, warframesCount, weaponsCount, companionsCount, arcanesCount, resourcesCount]);

  // ── Render ────────────────────────────────────────────────────────────

  // Detail view: full bleed with back affordance
  if (view === 'detail' && selectedEntry) {
    return (
      <>
        <div className="codex-browse-root">
          <div className="codex-back-bar">
            <button
              className="codex-back-btn"
              onClick={handleBackFromDetail}
              type="button"
            >
              <ChevronLeft size={14} strokeWidth={2.25} />
              Back
            </button>
          </div>
          <CodexEntryPage entry={selectedEntry} onSelectEntry={handleSelectEntry} />
        </div>
        {selectedMod && (
          <ModDetailModal mod={selectedMod} onClose={handleCloseModal} />
        )}
      </>
    );
  }

  // Browser view: sub-tab nav + active browser
  if (view === 'browser') {
    return (
      <>
        <div className="codex-browse-root">
          <div className="codex-back-bar">
            <button
              className="codex-back-btn"
              onClick={handleBackToLanding}
              type="button"
            >
              <Home size={13} strokeWidth={2.25} />
              Codex Home
            </button>
          </div>

          <div className="codex-subtabs" role="tablist" aria-label="Codex categories">
            {SUBTABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={subTab === t.key}
                data-active={subTab === t.key}
                className="codex-subtab"
                onClick={() => handleSubTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            <span className="codex-subtab-count">{browserSubtitle}</span>
          </div>

          {subTab === 'mods' && (
            <ModsBrowser onSelectMod={handleSelectMod} onCountChange={setModsCount} />
          )}
          {subTab === 'warframes' && (
            <WarframesBrowser
              onSelect={handleSelectEntry}
              onCountChange={setWarframesCount}
            />
          )}
          {subTab === 'weapons' && (
            <WeaponsBrowser
              onSelect={handleSelectEntry}
              onCountChange={setWeaponsCount}
            />
          )}
          {subTab === 'companions' && (
            <CompanionsBrowser
              onSelect={handleSelectEntry}
              onCountChange={setCompanionsCount}
            />
          )}
          {subTab === 'arcanes' && (
            <ArcanesBrowser
              onSelect={handleSelectEntry}
              onCountChange={setArcanesCount}
            />
          )}
          {subTab === 'resources' && (
            <ResourcesBrowser
              onSelect={handleSelectEntry}
              onCountChange={setResourcesCount}
            />
          )}
        </div>
        {selectedMod && (
          <ModDetailModal mod={selectedMod} onClose={handleCloseModal} />
        )}
      </>
    );
  }

  // Landing view (default)
  return (
    <>
      <CodexLanding
        onSelectEntry={handleSelectEntry}
        onSelectHistory={handleSelectHistory}
        onSelectCollection={handleSelectCollection}
        onShowMoreRecent={() => handleSelectCollection('mods')}
      />
      {selectedMod && (
        <ModDetailModal mod={selectedMod} onClose={handleCloseModal} />
      )}
    </>
  );
}
