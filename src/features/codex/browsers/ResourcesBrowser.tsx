/**
 * ResourcesBrowser — grid view for the Resource category.
 *
 * Resources are the broadest category by row count (~1k+ when synced),
 * so the browser leans search-first. Rarity is the only chip filter
 * because most of the practical "what should I farm?" decisions key off
 * rarity tier — Common/Uncommon resources are abundant, Rares
 * (Orokin Cells, Argon Crystals, Tellurium) are the bottleneck targets.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CodexItemCard } from '../components/CodexItemCard';
import {
  useAllResources,
  filterResources,
} from '@/lib/resources/codexResourcesAdapter';
import type { TennoplanItem, ItemRarity } from '@/core/domain/tennoplanApi';

type RarityFilter = ItemRarity | 'all';

const RARITY_OPTIONS: Array<{ key: RarityFilter; label: string }> = [
  { key: 'all',      label: 'All' },
  { key: 'Rare',     label: 'Rare' },
  { key: 'Uncommon', label: 'Uncommon' },
  { key: 'Common',   label: 'Common' },
];

const PAGE_SIZE = 60;

interface ResourcesBrowserProps {
  onSelect: (entry: TennoplanItem) => void;
  onCountChange?: (count: number) => void;
}

export function ResourcesBrowser({ onSelect, onCountChange }: ResourcesBrowserProps) {
  const [query, setQuery]   = useState('');
  const [rarity, setRarity] = useState<RarityFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const all = useAllResources();

  const results = useMemo(
    () => filterResources(all ?? [], { query, rarity }),
    [all, query, rarity],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, rarity]);
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

  const isLoading    = all === undefined;
  const isCodexEmpty = !isLoading && all.length === 0;

  return (
    <>
      <div className="codex-browse-search-row">
        <input
          className="codex-browse-search typo-body"
          type="search"
          placeholder="Search resources…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search resources"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="codex-browse-filter-row">
        {RARITY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`codex-browse-chip${rarity === opt.key ? ' codex-browse-chip--active' : ''}`}
            onClick={() => setRarity(opt.key)}
          >
            <span className="typo-label-xs">{opt.label}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="codex-browse-empty typo-label-xs">Loading resources…</p>
      )}

      {isCodexEmpty && (
        <p className="codex-browse-empty typo-label-xs">
          No resources in the codex yet. The codex syncs on launch and after every Worker deploy.
        </p>
      )}

      {!isLoading && !isCodexEmpty && results.length === 0 && (
        <p className="codex-browse-empty typo-label-xs">
          No resources match the current filter.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="codex-browse-grid">
            {visibleResults.map((r) => (
              <CodexItemCard
                key={r.uniqueName}
                entry={r}
                onClick={() => onSelect(r)}
              />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="codex-browse-load-more">
              <span className="typo-label-xs">
                Showing {visibleCount} of {results.length} resources — scroll for more
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
