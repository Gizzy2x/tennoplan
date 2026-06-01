/**
 * ModsBrowser — grid + filters for the Codex Mods sub-tab.
 *
 * Pure browser: filters + grid, no modal. Selection bubbles up to
 * CodexPage which owns the modal state — that lets the landing's
 * spotlight and other surfaces open mod detail through the same path
 * without each consumer managing modal state.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ModCardV3 } from '../components/ModCardV3';
import {
  useAllMods,
  useAllCompatNames,
  filterMods,
  type ModEntry,
  type ModRarity,
} from '@/lib/mods/codexModsAdapter';

const RARITIES: Array<ModRarity | 'all'> = ['all', 'Legendary', 'Rare', 'Uncommon', 'Common'];

const COMPAT_DISPLAY: Record<string, string> = {
  PLEXUS: 'Railjack',
};
const PAGE_SIZE = 60;

function FilterChip({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`codex-browse-chip${active ? ' codex-browse-chip--active' : ''}`}
      onClick={onClick}
    >
      <span className="typo-label-xs">{label}</span>
    </button>
  );
}

interface ModsBrowserProps {
  /** Open a mod in its detail modal. The parent owns the modal state. */
  onSelectMod:    (mod: ModEntry) => void;
  /** Lets the parent display a total count in the page hero. */
  onCountChange?: (count: number) => void;
}

export function ModsBrowser({ onSelectMod, onCountChange }: ModsBrowserProps) {
  const [query, setQuery]             = useState('');
  const [rarity, setRarity]           = useState<ModRarity | 'all'>('all');
  const [compat, setCompat]           = useState<string | undefined>(undefined);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const allMods    = useAllMods();
  const allCompats = useAllCompatNames();

  const results = useMemo(
    () => filterMods(allMods, { query, rarity, compatName: compat }),
    [allMods, query, rarity, compat],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, rarity, compat]);
  useEffect(() => { onCountChange?.(results.length); }, [results.length, onCountChange]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, results.length));
        }
      },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [results.length]);

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount],
  );

  return (
    <>
      <div className="codex-browse-search-row">
        <input
          className="codex-browse-search typo-body"
          type="search"
          placeholder="Search mods…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search mods"
          autoComplete="off"
          spellCheck={false}
        />
        {query.length > 0 && (
          <button
            type="button"
            className="codex-browse-search-clear"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        )}
      </div>

      <div className="codex-browse-filter-row">
        {RARITIES.map((r) => (
          <FilterChip
            key={r}
            active={rarity === r}
            label={r === 'all' ? 'All Rarities' : r}
            onClick={() => setRarity(r)}
          />
        ))}
      </div>

      <div className="codex-browse-filter-row codex-browse-filter-row--compat">
        <FilterChip
          active={compat === undefined}
          label="All Types"
          onClick={() => setCompat(undefined)}
        />
        {allCompats.map((c) => (
          <FilterChip
            key={c}
            active={compat === c}
            label={COMPAT_DISPLAY[c] ?? c}
            onClick={() => setCompat(c === compat ? undefined : c)}
          />
        ))}
      </div>

      {results.length === 0 ? (
        <p className="codex-browse-empty typo-label-xs">
          No mods match the current filter.
        </p>
      ) : (
        <>
          <div className="codex-browse-grid">
            {visibleResults.map((mod) => (
              <ModCardV3
                key={mod.uniqueName}
                mod={mod}
                onClick={() => onSelectMod(mod)}
              />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="codex-browse-load-more">
              <span className="typo-label-xs">
                Showing {visibleCount} of {results.length} mods — scroll for more
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
