/**
 * WarframesBrowser — grid view for the Codex warframe list.
 *
 * Read-only browser. Selection is bubbled to CodexPage which owns the
 * detail-view state. Filtering (search / variant) is local to this
 * component so the parent stays simple.
 *
 * Loading model: useAllWarframes returns `undefined` while Dexie reads.
 * We render an empty grid + status line in that case rather than a
 * skeleton — the codex is local-first, so reads typically resolve
 * within a frame and a flash of skeleton would be noisier than helpful.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { WarframeCard } from '../components/WarframeCard';
import {
  useAllWarframes,
  filterWarframes,
} from '@/lib/warframes/codexWarframesAdapter';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';

type VariantFilter = 'all' | 'prime' | 'base';

const VARIANT_OPTIONS: Array<{ key: VariantFilter; label: string }> = [
  { key: 'all',   label: 'All' },
  { key: 'base',  label: 'Base' },
  { key: 'prime', label: 'Prime' },
];

const PAGE_SIZE = 60;

interface WarframesBrowserProps {
  onSelect: (entry: TennoplanItem) => void;
  /** Lets the parent display a total count in the page hero. */
  onCountChange?: (count: number) => void;
}

export function WarframesBrowser({ onSelect, onCountChange }: WarframesBrowserProps) {
  const [query, setQuery]     = useState('');
  const [variant, setVariant] = useState<VariantFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const all = useAllWarframes();

  const results = useMemo(
    () => filterWarframes(all ?? [], { query, variant }),
    [all, query, variant],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, variant]);
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

  // Loading vs empty differentiation:
  //   • `all` undefined → codex hasn't resolved yet; quiet placeholder
  //   • `all` empty     → codex resolved but no warframes (never synced)
  //   • results empty   → filter excludes everything
  const isLoading    = all === undefined;
  const isCodexEmpty = !isLoading && all.length === 0;

  return (
    <>
      <div className="codex-browse-search-row">
        <input
          className="codex-browse-search typo-body"
          type="search"
          placeholder="Search warframes…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search warframes"
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
        <p className="codex-browse-empty typo-label-xs">Loading warframes…</p>
      )}

      {isCodexEmpty && (
        <p className="codex-browse-empty typo-label-xs">
          No warframes in the codex yet. The codex syncs on launch and after every Worker deploy.
        </p>
      )}

      {!isLoading && !isCodexEmpty && results.length === 0 && (
        <p className="codex-browse-empty typo-label-xs">
          No warframes match the current filter.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="codex-browse-grid">
            {visibleResults.map((wf) => (
              <WarframeCard
                key={wf.uniqueName}
                warframe={wf}
                onClick={() => onSelect(wf)}
              />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="codex-browse-load-more">
              <span className="typo-label-xs">
                Showing {visibleCount} of {results.length} warframes — scroll for more
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
