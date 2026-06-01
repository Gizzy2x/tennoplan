/**
 * ArcanesBrowser — grid view for the Codex arcane list.
 *
 * Read-only, mirrors WarframesBrowser's UX. Rarity is the primary filter
 * because the practical hunt-list for arcanes is gated on rarity tier —
 * Legendary arcanes (Energize, Grace, Magus Repair) are the headline
 * targets, Rares/Uncommons are the bulk fillers.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CodexItemCard } from '../components/CodexItemCard';
import {
  useAllArcanes,
  filterArcanes,
} from '@/lib/arcanes/codexArcanesAdapter';
import type { TennoplanItem, ItemRarity } from '@/core/domain/tennoplanApi';

type RarityFilter = ItemRarity | 'all';

const RARITY_OPTIONS: Array<{ key: RarityFilter; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'Legendary', label: 'Legendary' },
  { key: 'Rare',      label: 'Rare' },
  { key: 'Uncommon',  label: 'Uncommon' },
  { key: 'Common',    label: 'Common' },
];

const PAGE_SIZE = 60;

interface ArcanesBrowserProps {
  onSelect: (entry: TennoplanItem) => void;
  onCountChange?: (count: number) => void;
}

export function ArcanesBrowser({ onSelect, onCountChange }: ArcanesBrowserProps) {
  const [query, setQuery]   = useState('');
  const [rarity, setRarity] = useState<RarityFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const all = useAllArcanes();

  const results = useMemo(
    () => filterArcanes(all ?? [], { query, rarity }),
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
          placeholder="Search arcanes…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search arcanes"
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
        <p className="codex-browse-empty typo-label-xs">Loading arcanes…</p>
      )}

      {isCodexEmpty && (
        <p className="codex-browse-empty typo-label-xs">
          No arcanes in the codex yet. The codex syncs on launch and after every Worker deploy.
        </p>
      )}

      {!isLoading && !isCodexEmpty && results.length === 0 && (
        <p className="codex-browse-empty typo-label-xs">
          No arcanes match the current filter.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="codex-browse-grid">
            {visibleResults.map((a) => (
              <CodexItemCard
                key={a.uniqueName}
                entry={a}
                onClick={() => onSelect(a)}
              />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="codex-browse-load-more">
              <span className="typo-label-xs">
                Showing {visibleCount} of {results.length} arcanes — scroll for more
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
