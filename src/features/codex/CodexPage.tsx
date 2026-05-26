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
import { ModDetailModal } from './components/ModDetailModal';
import { CodexEntryPage } from './entry/CodexEntryPage';
import { CodexLanding } from './landing/CodexLanding';
import type { CodexCollectionKey } from './landing/blocks/CollectionsGrid';

type CodexView = 'landing' | 'browser' | 'detail';
type SubTab    = 'mods' | 'warframes';

const SUBTABS: Array<{ key: SubTab; label: string }> = [
  { key: 'mods',      label: 'Mods' },
  { key: 'warframes', label: 'Warframes' },
];

// Session flag: did the user already see the landing this app session?
// Module-scoped so it survives Codex unmount/remount on sidebar tab
// switches, but resets on app reload — exactly the "first visit per
// session" semantics the design calls for.
let hasSeenLandingThisSession = false;

export function CodexPage() {
  const initialView: CodexView = hasSeenLandingThisSession ? 'browser' : 'landing';
  const [view, setView]                   = useState<CodexView>(initialView);
  const [subTab, setSubTab]               = useState<SubTab>('mods');
  const [selectedEntry, setSelectedEntry] = useState<TennoplanItem | null>(null);
  const [selectedMod, setSelectedMod]     = useState<ModEntry | null>(null);
  const [modsCount, setModsCount]         = useState<number>(0);
  const [warframesCount, setWarframesCount] = useState<number>(0);

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
    setSelectedEntry(entry);
    setView('detail');
  }, [pushHistory]);

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
    // Only Mods + Warframes are wired today; coming-soon tiles can't fire
    // this handler (they're disabled at the tile level).
    if (key === 'mods')      setSubTab('mods');
    if (key === 'warframes') setSubTab('warframes');
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

  // From detail view, "back" returns to the browser that owns the item's
  // category. For a warframe entry, that means the Warframes browser.
  // From the landing-launched spotlight, return to the landing.
  const handleBackFromDetail = useCallback(() => {
    setSelectedEntry(null);
    // If we entered detail from the landing (the landing was the previous
    // view), bias back to landing rather than dumping the user into a
    // browser they didn't open. The session flag tracks this implicitly:
    // if hasSeenLandingThisSession is still false at this moment, the
    // user came from the landing. After they move past it (set in the
    // effect), this returns to browser.
    setView(hasSeenLandingThisSession ? 'browser' : 'landing');
  }, []);

  const handleCloseModal = useCallback(() => setSelectedMod(null), []);

  // The page hero subtitle reads the active sub-tab's count.
  const browserSubtitle = useMemo(() => {
    const n = subTab === 'mods' ? modsCount : warframesCount;
    return `${n.toLocaleString()} ${subTab} · Click to inspect`;
  }, [subTab, modsCount, warframesCount]);

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
