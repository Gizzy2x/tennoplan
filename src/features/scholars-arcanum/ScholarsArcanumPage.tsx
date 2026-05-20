import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { PageHero } from '@/components/ui/PageHero';
import { ModCardV3 } from './components/ModCardV3';
import { ModDetailModal } from './components/ModDetailModal';
import { searchMods, getAllCompatNames, type ModEntry, type ModRarity } from '@/lib/mods/modsAdapter';

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
      className={`arcanum-chip${active ? ' arcanum-chip--active' : ''}`}
      onClick={onClick}
    >
      <span className="typo-label-xs">{label}</span>
    </button>
  );
}

export function ScholarsArcanumPage() {
  const [selectedMod, setSelectedMod] = useState<ModEntry | null>(null);
  const [query, setQuery]             = useState('');
  const [rarity, setRarity]           = useState<ModRarity | 'all'>('all');
  const [compat, setCompat]           = useState<string | undefined>(undefined);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const allCompats = useMemo(() => getAllCompatNames(), []);

  const results = useMemo(
    () => searchMods({ query, rarity, compatName: compat }),
    [query, rarity, compat],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, rarity, compat]);

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

  const handleClose = useCallback(() => setSelectedMod(null), []);

  return (
    <div className="arcanum-root">
      <PageHero
        prefix="SCHOLAR'S"
        title="ARCANUM"
        subtitle={`${results.length.toLocaleString()} mods · Click to inspect`}
      />

      {/* Search bar */}
      <div className="arcanum-search-row">
        <input
          className="arcanum-search typo-body"
          type="search"
          placeholder="Search mods…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search mods"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Rarity filter */}
      <div className="arcanum-filter-row">
        {RARITIES.map((r) => (
          <FilterChip
            key={r}
            active={rarity === r}
            label={r === 'all' ? 'All Rarities' : r}
            onClick={() => setRarity(r)}
          />
        ))}
      </div>

      {/* Compat filter */}
      <div className="arcanum-filter-row arcanum-filter-row--compat">
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

      {/* Results grid */}
      {results.length === 0 ? (
        <p className="arcanum-empty typo-label-xs">
          No mods match the current filter.
        </p>
      ) : (
        <>
          <div className="arcanum-browse-grid">
            {visibleResults.map((mod) => (
              <ModCardV3
                key={mod.uniqueName}
                mod={mod}
                onClick={() => setSelectedMod(mod)}
              />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="arcanum-load-more">
              <span className="typo-label-xs">
                Showing {visibleCount} of {results.length} mods — scroll for more
              </span>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedMod && (
        <ModDetailModal mod={selectedMod} onClose={handleClose} />
      )}
    </div>
  );
}
