/**
 * WeaponsBrowser — grid view for the Codex weapon list.
 *
 * Read-only. Selection bubbles to CodexPage via onSelect; CodexPage owns
 * detail-view state. Local search + slot filter + variant filter (Base /
 * Prime) keep the parent simple.
 *
 * Slot filter folds WFCD productCategory into the four in-game equipment
 * buckets — Primary / Secondary / Melee / Arch — with an Other catch-all
 * for the long-tail (Amps, K-Drives, MechSuits, sentinel weapons).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CodexItemCard } from '../components/CodexItemCard';
import {
  useAllWeapons,
  filterWeapons,
  type WeaponSlot,
} from '@/lib/weapons/codexWeaponsAdapter';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';

type SlotFilter = WeaponSlot | 'all';
type VariantFilter = 'all' | 'prime' | 'base';

const SLOT_OPTIONS: Array<{ key: SlotFilter; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'primary',   label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'melee',     label: 'Melee' },
  { key: 'arch',      label: 'Arch' },
];

const VARIANT_OPTIONS: Array<{ key: VariantFilter; label: string }> = [
  { key: 'all',   label: 'All' },
  { key: 'base',  label: 'Base' },
  { key: 'prime', label: 'Prime' },
];

const PAGE_SIZE = 60;

interface WeaponsBrowserProps {
  onSelect: (entry: TennoplanItem) => void;
  onCountChange?: (count: number) => void;
}

export function WeaponsBrowser({ onSelect, onCountChange }: WeaponsBrowserProps) {
  const [query, setQuery]     = useState('');
  const [slot, setSlot]       = useState<SlotFilter>('all');
  const [variant, setVariant] = useState<VariantFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const all = useAllWeapons();

  const results = useMemo(
    () => filterWeapons(all ?? [], { query, slot, variant }),
    [all, query, slot, variant],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, slot, variant]);
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
          placeholder="Search weapons…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label="Search weapons"
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
        {SLOT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`codex-browse-chip${slot === opt.key ? ' codex-browse-chip--active' : ''}`}
            onClick={() => setSlot(opt.key)}
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
        <p className="codex-browse-empty typo-label-xs">Loading weapons…</p>
      )}

      {isCodexEmpty && (
        <p className="codex-browse-empty typo-label-xs">
          No weapons in the codex yet. The codex syncs on launch and after every Worker deploy.
        </p>
      )}

      {!isLoading && !isCodexEmpty && results.length === 0 && (
        <p className="codex-browse-empty typo-label-xs">
          No weapons match the current filter.
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="codex-browse-grid">
            {visibleResults.map((w) => (
              <CodexItemCard
                key={w.uniqueName}
                entry={w}
                onClick={() => onSelect(w)}
              />
            ))}
          </div>
          {visibleCount < results.length && (
            <div ref={sentinelRef} className="codex-browse-load-more">
              <span className="typo-label-xs">
                Showing {visibleCount} of {results.length} weapons — scroll for more
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
