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

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from '@/hooks/useHotkeys';
import { pushToast } from '@/store/toasts';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import { useCodexHistory, type CodexHistoryEntry } from '@/store/codexHistory';
import { useNavigationStore, NAV_ITEMS } from '@/store/navigation';
import { modEntryToItem, type ModEntry } from '@/lib/mods/codexModsAdapter';
import { ModsBrowser } from './browsers/ModsBrowser';
import { WarframesBrowser } from './browsers/WarframesBrowser';
import { WeaponsBrowser } from './browsers/WeaponsBrowser';
import { CompanionsBrowser } from './browsers/CompanionsBrowser';
import { ArcanesBrowser } from './browsers/ArcanesBrowser';
import { ResourcesBrowser } from './browsers/ResourcesBrowser';
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

const SUBTAB_LABEL: Record<SubTab, string> = {
  mods:       'Mods',
  warframes:  'Warframes',
  weapons:    'Weapons',
  companions: 'Companions',
  arcanes:    'Arcanes',
  resources:  'Resources',
};

/**
 * Map a TennoplanItem.category to the browser sub-tab where it lives.
 * Sentinels share the Companions browser. Returns null for categories
 * that aren't surfaced through a browser yet (Blueprint, Equipment, …);
 * the breadcrumb collapses gracefully when null.
 */
function categoryToSubTab(category: TennoplanItem['category']): SubTab | null {
  switch (category) {
    case 'Mod':       return 'mods';
    case 'Warframe':  return 'warframes';
    case 'Weapon':    return 'weapons';
    case 'Companion':
    case 'Sentinel':  return 'companions';
    case 'Arcane':    return 'arcanes';
    case 'Resource':  return 'resources';
    default:          return null;
  }
}

interface BreadcrumbSegment {
  label:    string;
  current?: boolean;
  onClick?: () => void;
}

interface CodexBreadcrumbProps {
  segments: BreadcrumbSegment[];
}

/**
 * Persistent location breadcrumb — replaces the bare Back / Home button.
 * The chain mirrors the user's path: `Codex / Warframes / Inaros /
 * Inaros Chassis`. Every non-current segment back-navigates to its own
 * level so users can jump up multiple steps without unwinding one click
 * at a time.
 */
function CodexBreadcrumb({ segments }: CodexBreadcrumbProps) {
  return (
    <nav className="codex-breadcrumb" aria-label="Codex location">
      {segments.map((seg, i) => (
        <Fragment key={`${i}-${seg.label}`}>
          {i > 0 && (
            <span className="codex-breadcrumb-sep" aria-hidden="true">/</span>
          )}
          {seg.current || !seg.onClick ? (
            <span
              className="codex-breadcrumb-segment codex-breadcrumb-segment--current"
              aria-current={seg.current ? 'page' : undefined}
            >
              {seg.label}
            </span>
          ) : (
            <button
              type="button"
              className="codex-breadcrumb-segment"
              onClick={seg.onClick}
            >
              {seg.label}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

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
  const [modsCount, setModsCount]             = useState<number>(0);
  const [warframesCount, setWarframesCount]   = useState<number>(0);
  const [weaponsCount, setWeaponsCount]       = useState<number>(0);
  const [companionsCount, setCompanionsCount] = useState<number>(0);
  const [arcanesCount, setArcanesCount]       = useState<number>(0);
  const [resourcesCount, setResourcesCount]   = useState<number>(0);

  /**
   * Sub-tabs the user has opened at least once. Once a sub-tab is
   * visited, its browser component stays mounted (hidden via CSS when
   * inactive) so search query, filter chips, visible count, and grid
   * scroll position survive view transitions to/from detail and to/
   * from other sub-tabs. Mirrors AppShell's tab-mount pattern.
   *
   * The first visit is the only mount; thereafter switching sub-tabs
   * or bouncing in/out of detail is a free CSS toggle. Starts empty —
   * a sub-tab is added the moment its browser is shown, including the
   * default 'mods' if the user lands directly in browser view (only
   * happens on a hypothetical CodexPage remount; AppShell normally
   * keeps the tab mounted across sidebar switches).
   */
  const [visitedSubTabs, setVisitedSubTabs] = useState<Set<SubTab>>(
    () => initialView === 'browser' ? new Set<SubTab>(['mods']) : new Set<SubTab>(),
  );
  useEffect(() => {
    if (view !== 'browser') return;
    setVisitedSubTabs((prev) => {
      if (prev.has(subTab)) return prev;
      const next = new Set(prev);
      next.add(subTab);
      return next;
    });
  }, [view, subTab]);

  // Mark landing as "seen" once the user moves past it. Subsequent
  // Codex tab visits in this session resume the browser instead.
  useEffect(() => {
    if (view !== 'landing') hasSeenLandingThisSession = true;
  }, [view]);

  const pushHistory = useCodexHistory((s) => s.push);

  // Cross-tab deep-link channel (wiki-style "open in codex, then back").
  const pendingCodexEntry        = useNavigationStore((s) => s.pendingCodexEntry);
  const consumePendingCodexEntry = useNavigationStore((s) => s.consumePendingCodexEntry);
  const codexReturnTab           = useNavigationStore((s) => s.codexReturnTab);
  const clearCodexReturn         = useNavigationStore((s) => s.clearCodexReturn);
  const setActiveTab             = useNavigationStore((s) => s.setActiveTab);

  // Single source of truth for "open this entry". Routes mods to the
  // modal (current UX) and everything else to the full detail view.
  const handleSelectEntry = useCallback((entry: TennoplanItem) => {
    pushHistory({
      uniqueName: entry.uniqueName,
      name:       entry.name,
      category:   entry.category,
      iconUrl:    entry.iconUrl,
    });

    // Mods now open as a full detail page (ModCard block), same as every
    // other entry — no more modal. So no category special-case here.
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

  // ── Cross-tab deep link ───────────────────────────────────────────────
  // A surface elsewhere (bounty reward, drop row, …) queued an entry via
  // navigation.openCodexEntry. Resolve it from Dexie and open it. uniqueName
  // is the primary key; fall back to a name scan when an items-map id doesn't
  // line up with the codex id. If it resolves to nothing, bounce back to
  // origin so the user isn't stranded on a blank codex.
  // NOTE: we resolve FIRST and consume the pending entry only after the async
  // settles, on the live instance. Consuming up-front breaks under React
  // StrictMode (dev): the first mount consumes + starts the async, its cleanup
  // marks it stale, and the remounted instance finds nothing left to open — so
  // the tab switches but no entry opens. Reading (not clearing) the store value
  // lets whichever instance survives do the work exactly once.
  useEffect(() => {
    const link = pendingCodexEntry;
    if (!link) return;
    let active = true;
    (async () => {
      try {
        const byId = await db.tennoplanItems.get(link.uniqueName);
        const item = byId ?? (link.name
          ? await db.tennoplanItems
              .filter((i) => i.name.toLowerCase() === link.name!.toLowerCase())
              .first()
          : undefined);
        if (!active) return;
        consumePendingCodexEntry();
        if (item) {
          handleSelectEntry(item);
        } else {
          pushToast({
            variant: 'warning',
            message: `"${link.name ?? link.uniqueName}" isn't in the codex yet.`,
          });
          const origin = useNavigationStore.getState().codexReturnTab;
          clearCodexReturn();
          if (origin) setActiveTab(origin);
        }
      } catch {
        if (active) consumePendingCodexEntry();
      }
    })();
    return () => { active = false; };
  }, [pendingCodexEntry, consumePendingCodexEntry, handleSelectEntry, clearCodexReturn, setActiveTab]);

  // Origin label + handler for the "← Back to {page}" affordance.
  const originLabel = useMemo(
    () => (codexReturnTab ? NAV_ITEMS.find((n) => n.id === codexReturnTab)?.label ?? null : null),
    [codexReturnTab],
  );
  const handleBackToOrigin = useCallback(() => {
    const tab = codexReturnTab;
    clearCodexReturn();
    if (tab) setActiveTab(tab);
  }, [codexReturnTab, clearCodexReturn, setActiveTab]);

  // Browsers pass a projected ModEntry. Resolve the underlying codex item
  // (TennoplanItem) so the mod opens as a full detail page like everything
  // else; fall back to a synthesised item when the live codex row isn't in
  // Dexie yet (build-time fallback path). handleSelectEntry owns history.
  const handleSelectMod = useCallback(async (mod: ModEntry) => {
    const item = (await db.tennoplanItems.get(mod.uniqueName)) ?? modEntryToItem(mod);
    handleSelectEntry(item);
  }, [handleSelectEntry]);

  // Continue-browsing cards carry a minimal history shape, not a full
  // TennoplanItem. Re-resolve from Dexie before reopening so we get the
  // current canonical data (the underlying item may have been re-enriched
  // since it was last viewed).
  const handleSelectHistory = useCallback(async (entry: CodexHistoryEntry) => {
    const item = await db.tennoplanItems.get(entry.uniqueName);
    if (item) {
      handleSelectEntry(item);
    } else {
      // Item is no longer in the codex (vaulted out, renamed, dropped
      // from pipeline). Surface this via a toast rather than failing
      // silently — the user clicked a card and deserves to know why
      // nothing happened. The toast auto-dismisses on its own timer.
      pushToast({
        variant: 'warning',
        message: `"${entry.name}" is no longer in the codex — likely vaulted out or renamed in a recent update.`,
      });
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
    clearCodexReturn();
  }, [clearCodexReturn]);

  const handleSubTab = useCallback((next: SubTab) => {
    setSubTab(next);
    setView('browser');
    setSelectedEntry(null);
    clearCodexReturn();
  }, [clearCodexReturn]);

  const handleBackToLanding = useCallback(() => {
    setView('landing');
    setSelectedEntry(null);
    clearCodexReturn();
  }, [clearCodexReturn]);

  /**
   * Jump to a specific level in the detail stack. The clicked entry
   * becomes the current `selectedEntry`; everything that came after
   * it in the chain is discarded. Used by the breadcrumb so the user
   * can leap up multiple steps without unwinding one back-click at
   * a time.
   */
  const handleGoToStackLevel = useCallback((stackIndex: number) => {
    const target = detailStack[stackIndex];
    if (!target) return;
    setSelectedEntry(target);
    setDetailStack((prev) => prev.slice(0, stackIndex));
  }, [detailStack]);

  /**
   * Back-one-level handler — invoked by the `Esc` keyboard shortcut.
   *   • Detail view, stack non-empty: pop the most recent stack entry.
   *   • Detail view, stack empty:     fall back to wherever the user
   *                                   came from before entering detail.
   *   • Browser view:                 return to landing.
   *   • Landing view:                 no-op (nowhere shallower to go).
   * The breadcrumb segments cover the same paths via clicks; this
   * keyboard shortcut is the same behaviour minus the mouse trip.
   */
  const handleEscBack = useCallback(() => {
    if (view === 'detail') {
      if (detailStack.length > 0) {
        const next = detailStack[detailStack.length - 1]!;
        setDetailStack((prev) => prev.slice(0, -1));
        setSelectedEntry(next);
        return;
      }
      setSelectedEntry(null);
      setView(previousView);
      return;
    }
    if (view === 'browser') {
      handleBackToLanding();
    }
  }, [view, detailStack, previousView, handleBackToLanding]);

  /**
   * Search input ref + focus handler — `/` from anywhere on the
   * landing view jumps to the search bar, matching the wiki / Notion
   * / GitHub convention endgame players are already calibrated to.
   * Other views don't get the shortcut because the search bar only
   * lives on the landing today.
   */
  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleFocusSearch = useCallback(() => {
    if (view !== 'landing') return;
    const input = searchInputRef.current;
    if (!input) return;
    input.focus();
    input.select?.();
  }, [view]);

  /**
   * Global keyboard shortcuts — registered with the central hotkeys
   * registry so they appear in the `?` cheat sheet automatically.
   *
   * Implemented:
   *   • `/`   focuses the LandingSearch input (landing view only)
   *   • `Esc` back-one-level (browser → landing; detail → browser/parent)
   *
   * Future shortcuts to consider:
   *   • `←/→` cycle siblings in the summary rail
   *   • `j/k` scroll between entry blocks
   *   • Arrow keys for grid-focus traversal in browsers
   */
  useHotkeys(useMemo(() => [
    {
      combo:       '/',
      description: 'Focus codex search',
      scope:       'codex',
      handler: (e) => {
        if (view !== 'landing') return;
        e.preventDefault();
        handleFocusSearch();
      },
    },
    {
      combo:       'Escape',
      description: 'Back / close',
      scope:       'codex',
      handler: (e) => {
        if (view === 'landing') return;
        e.preventDefault();
        handleEscBack();
      },
    },
  ], [view, handleEscBack, handleFocusSearch]));

  // ── Scroll save/restore ──────────────────────────────────────────────
  //
  // Body-level scroll is shared across all three views, so toggling
  // between them naively leaves the scroll wherever the previous view
  // happened to be — that's the "page jumps to middle" symptom users
  // see when returning from a deep entry to a shallow browser, and
  // also why returning to a browser lands at the top of an unrelated
  // list instead of where the user was scanning.
  //
  // Fix: capture window.scrollY under the OLD view's key whenever the
  // view changes, then restore the NEW view's saved Y (defaulting to 0
  // for first visits / fresh detail entries). All scroll math runs in
  // useLayoutEffect so the restore happens after the new view's DOM
  // commits but before the browser paints — no visible flicker.

  const viewKey: string = useMemo(() => {
    if (view === 'landing') return 'landing';
    if (view === 'browser') return `browser:${subTab}`;
    if (view === 'detail' && selectedEntry) return `detail:${selectedEntry.uniqueName}`;
    return 'unknown';
  }, [view, subTab, selectedEntry]);

  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const previousViewKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const prevKey = previousViewKeyRef.current;
    // Save the previous view's scroll position so returning to it
    // resumes where the user left off. Skipped on the very first render
    // (no previous view yet).
    if (prevKey && prevKey !== viewKey) {
      scrollPositionsRef.current.set(prevKey, window.scrollY);
    }
    previousViewKeyRef.current = viewKey;

    // Restore the new view's scroll position. Fresh detail entries and
    // first-visit browsers default to 0 — landing top, entry top, etc.
    const restoredY = scrollPositionsRef.current.get(viewKey) ?? 0;
    window.scrollTo(0, restoredY);
  }, [viewKey]);

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

  // ── Breadcrumb segments ───────────────────────────────────────────────

  /**
   * Build the segments for the persistent breadcrumb. The first segment
   * is always "Codex" (→ landing). In browser view we append the active
   * sub-tab as the current segment. In detail view we infer the sub-tab
   * from the entry's category (clickable so the user can jump back to
   * the browser), then walk the detailStack so each previously-viewed
   * entry becomes its own clickable level, then end on the current
   * entry as the non-clickable tail.
   */
  const breadcrumbSegments: BreadcrumbSegment[] = useMemo(() => {
    const segs: BreadcrumbSegment[] = [
      { label: 'Codex', onClick: handleBackToLanding },
    ];

    if (view === 'browser') {
      segs.push({ label: SUBTAB_LABEL[subTab], current: true });
      return segs;
    }

    if (view === 'detail' && selectedEntry) {
      const entrySubTab = categoryToSubTab(selectedEntry.category);
      if (entrySubTab) {
        segs.push({
          label:   SUBTAB_LABEL[entrySubTab],
          onClick: () => handleSubTab(entrySubTab),
        });
      }
      detailStack.forEach((stackEntry, i) => {
        segs.push({
          label:   stackEntry.name,
          onClick: () => handleGoToStackLevel(i),
        });
      });
      segs.push({ label: selectedEntry.name, current: true });
    }

    return segs;
  }, [
    view, subTab, selectedEntry, detailStack,
    handleBackToLanding, handleSubTab, handleGoToStackLevel,
  ]);

  // ── Render ────────────────────────────────────────────────────────────
  //
  // Unified render rather than three early-return paths. Browsers stay
  // mounted across browser↔detail toggles so search query, filter
  // chips, infinite-scroll cursor, and IntersectionObserver subscription
  // all survive without the component re-mounting each time. Hidden
  // tabs / views use display:none + the React 19 `inert` flag so they
  // don't render content into the layout and don't steal focus.

  const browserStackHidden = view !== 'browser';

  return (
    <>
      {/* Cross-tab return affordance — present whenever the user arrived
          via a deep link from another page. Leaving codex laterally
          (landing / sub-tab) clears it; the rabbit hole keeps it so the
          user can always bail back to where they started. */}
      {originLabel && (
        <button type="button" className="codex-return-bar" onClick={handleBackToOrigin}>
          <span aria-hidden="true">←</span> Back to {originLabel}
        </button>
      )}

      {/* Landing — only when active. No state worth preserving when
          the user leaves, so unmount-when-hidden is fine. */}
      {view === 'landing' && (
        <>
          <CodexLanding
            onSelectEntry={handleSelectEntry}
            onSelectMod={handleSelectMod}
            onSelectHistory={handleSelectHistory}
            onSelectCollection={handleSelectCollection}
            onShowMoreRecent={() => handleSelectCollection('mods')}
            searchInputRef={searchInputRef}
          />
        </>
      )}

      {/* Browser + detail share the codex-browse-root + breadcrumb. The
          browser stack stays mounted whenever the user has visited it
          at least once; the detail view mounts/unmounts per entry. */}
      {view !== 'landing' && (
        <div className="codex-browse-root">
          <CodexBreadcrumb segments={breadcrumbSegments} />

          {view === 'detail' && selectedEntry && (
            <CodexEntryPage entry={selectedEntry} onSelectEntry={handleSelectEntry} />
          )}

          {/* Browser stack — sub-tab nav + the visited browsers, all kept
              mounted. The whole stack hides via display:none when we're
              in detail view; individual browsers within hide the same
              way when a sibling sub-tab is active. */}
          <div
            style={browserStackHidden ? { display: 'none' } : undefined}
            aria-hidden={browserStackHidden}
            {...(browserStackHidden ? { inert: true } : {})}
          >
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

            {visitedSubTabs.has('mods') && (
              <div
                style={subTab === 'mods' ? undefined : { display: 'none' }}
                {...(subTab === 'mods' ? {} : { inert: true })}
              >
                <ModsBrowser onSelectMod={handleSelectMod} onCountChange={setModsCount} />
              </div>
            )}
            {visitedSubTabs.has('warframes') && (
              <div
                style={subTab === 'warframes' ? undefined : { display: 'none' }}
                {...(subTab === 'warframes' ? {} : { inert: true })}
              >
                <WarframesBrowser
                  onSelect={handleSelectEntry}
                  onCountChange={setWarframesCount}
                />
              </div>
            )}
            {visitedSubTabs.has('weapons') && (
              <div
                style={subTab === 'weapons' ? undefined : { display: 'none' }}
                {...(subTab === 'weapons' ? {} : { inert: true })}
              >
                <WeaponsBrowser
                  onSelect={handleSelectEntry}
                  onCountChange={setWeaponsCount}
                />
              </div>
            )}
            {visitedSubTabs.has('companions') && (
              <div
                style={subTab === 'companions' ? undefined : { display: 'none' }}
                {...(subTab === 'companions' ? {} : { inert: true })}
              >
                <CompanionsBrowser
                  onSelect={handleSelectEntry}
                  onCountChange={setCompanionsCount}
                />
              </div>
            )}
            {visitedSubTabs.has('arcanes') && (
              <div
                style={subTab === 'arcanes' ? undefined : { display: 'none' }}
                {...(subTab === 'arcanes' ? {} : { inert: true })}
              >
                <ArcanesBrowser
                  onSelect={handleSelectEntry}
                  onCountChange={setArcanesCount}
                />
              </div>
            )}
            {visitedSubTabs.has('resources') && (
              <div
                style={subTab === 'resources' ? undefined : { display: 'none' }}
                {...(subTab === 'resources' ? {} : { inert: true })}
              >
                <ResourcesBrowser
                  onSelect={handleSelectEntry}
                  onCountChange={setResourcesCount}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
