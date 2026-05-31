/**
 * CompanionsBrowser — grid view for Pets + Sentinels combined.
 *
 * Mirrors Warframe's in-game Companions tab: one list for both pets and
 * sentinels, with a kind chip to scope down. The TennoplanItem category
 * stays distinct underneath so the entry view can dispatch the right rail
 * (both currently share CompanionSummaryCard, but the path is open).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CodexItemCard } from '../components/CodexItemCard';
import {
  useAllCompanions,
  filterCompanions,
  type CompanionKind,
} from '@/lib/companions/codexCompanionsAdapter';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';

type KindFilter = CompanionKind | 'all';
type VariantFilter = 'all' | 'prime' | 'base';

const KIND_OPTIONS: Array<{ key: KindFilter; label: string }> = [
  { key: 'all',      label: 'All' },
  { key: 'pet',      label: 'Pets' },
  { key: 'sentinel', label: 'Sentinels' },
];

const VARIANT_OPTIONS: Array<{ key: VariantFilter; label: string }> = [
  { key: 'all',   label: 'All' },
  { key: 'base',  label: 'Base' },
  { key: 'prime', label: 'Prime' },
];

const PAGE_SIZE = 60;

interface CompanionsBrowserProps {
  onSelect: (entry: TennoplanItem) => void;
  onCountChange?: (count: number) => void;
}

export function CompanionsBrowser({ onSelect, onCountChange }: CompanionsBrowserProps) {
  const [query, setQuery]     = useState('');
  const [kind, setKind]       = useState<KindFilter>('all');
  const [variant, setVariant] = useState<VariantFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const all = useAllCompanions();

  const results = useMemo(
    () => filterCompanions(all ?? [], { query, kind, variant }),
    [all, query, kind, variant],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, kind, variant]);
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
          placeholder="Search companions…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search companions"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="codex-browse-filter-row">
        {KIND_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`codex-browse-chip${kind === opt.key ? ' codex-browse-chip--active' : ''}`}
            onClick={() => setKind(opt.key)}
          >
            <span className="typo-label-xs">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="codex-browse-filter-row">
        {VARIANT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`codex-browse-chip${variant === opt.key ? ' codex-browse-chip--active' : ''}`}
            onClick={() => setVariant(opt.key)}
          >
            <span className="typo-label-xs">{opt.label}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="codex-browse-empty typo-label-xs">Loading companions…</p>
      )}

      {isCodexEmpty && (
        <p className="codex-browse-empty typo-label-xs">
          No companions in the codex yet. The codex syncs on launch and after every Worker deploy.
        </p>
      )}

      {!isLoading && !isCodexEmpty && results.length === 0 && (
        <p className="codex-browse-empty typo-label-xs">
          No companions match the current filter.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="codex-browse-grid">
            {visibleResults.map((c) => (
              <CodexItemCard
                key={c.uniqueName}
                entry={c}
                onClick={() => onSelect(c)}
              />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="codex-browse-load-more">
              <span className="typo-label-xs">
                Showing {visibleCount} of {results.length} companions — scroll for more
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
