/**
 * LazyItemIcon — viewport-aware icon with Dexie-backed URL resolution.
 *
 * Renders a skeleton until the element enters the viewport, then resolves
 * the icon URL and shows the image. Never produces a broken "(image.png)".
 *
 * Resolution when `uniqueName` is supplied:
 *   1. db.items.iconUrl  — pre-resolved at Phase 1 sync, guaranteed non-empty
 *   2. itemsAdapter.findByUniqueName → getIconUrl  — baked build-time fallback
 *   3. /lotus-placeholder.svg
 *
 * When `imageName` or `item` is supplied, delegates to ItemIcon (sync, no Dexie).
 * Empty `imageName` renders a placeholder instead of a broken CDN request.
 */

import { useRef, useState, useEffect } from 'react';
import type React from 'react';
import { ItemIcon, type ItemIconProps } from './ItemIcon';
import { cn } from '@/lib/utils';
import { db } from '@/adapters/storage/db';
import { findByUniqueName } from '@/adapters/items/itemsAdapter';
import { getIconUrl } from '@/lib/icons/IconResolver';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SIZE_PX = { xs: 24, sm: 32, md: 48, lg: 64, xl: 96 } as const;

function toPx(size: ItemIconProps['size'] = 'md'): number {
  return typeof size === 'number' ? size : SIZE_PX[size as keyof typeof SIZE_PX] ?? 48;
}

async function resolveUniqueNameUrl(uniqueName: string): Promise<string> {
  try {
    const stored = await db.items.get(uniqueName);
    if (stored?.iconUrl) return stored.iconUrl;
  } catch {
    // Dexie not yet available (first-ever launch) — fall through to baked map
  }
  const entry = findByUniqueName(uniqueName);
  return entry?.imageName ? getIconUrl(entry.imageName) : '/lotus-placeholder.svg';
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type LazyItemIconProps = ItemIconProps & {
  /** Expand detection margin (CSS margin syntax). Default: "100px". */
  rootMargin?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function LazyItemIcon(props: LazyItemIconProps) {
  const {
    rootMargin = '100px',
    className,
    size = 'md',
    name,
    style: styleProp,
  } = props;

  // Extract uniqueName safely from the union prop — present only in one variant
  const uniqueName = 'uniqueName' in props ? props.uniqueName : undefined;

  const observerRef    = useRef<HTMLDivElement>(null);
  const [visible,      setVisible]      = useState(false);
  const [resolvedUrl,  setResolvedUrl]  = useState<string | null>(null);
  const [imgErrored,   setImgErrored]   = useState(false);

  const px = toPx(size);

  // ── Viewport detection ───────────────────────────────────────────────────
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  // ── Dexie resolution (uniqueName path only) ──────────────────────────────
  useEffect(() => {
    if (!visible || !uniqueName) return;

    let cancelled = false;
    resolveUniqueNameUrl(uniqueName).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });
    return () => { cancelled = true; };
  }, [visible, uniqueName]);

  // ── Pre-visibility skeleton (holds ref for IntersectionObserver) ─────────
  if (!visible) {
    return (
      <div
        ref={observerRef}
        className={cn('shrink-0 rounded-sm bg-surface-container-highest/30', className)}
        style={{ width: px, height: px }}
        aria-hidden="true"
      />
    );
  }

  // ── uniqueName path: render with pre-resolved Dexie URL ──────────────────
  if (uniqueName !== undefined) {
    // Still awaiting Dexie resolution
    if (resolvedUrl === null) {
      return (
        <div
          className={cn('shrink-0 rounded-sm bg-surface-container-highest/30', className)}
          style={{ width: px, height: px }}
          aria-hidden="true"
        />
      );
    }

    return (
      <img
        src={imgErrored ? '/lotus-placeholder.svg' : resolvedUrl}
        alt={name ?? 'Warframe item'}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        onError={() => setImgErrored(true)}
        className={cn('object-contain shrink-0', className)}
        style={{ width: px, height: px, ...(styleProp as React.CSSProperties | undefined) }}
      />
    );
  }

  // ── imageName / item path: delegate to ItemIcon (sync, no Dexie) ─────────
  return <ItemIcon {...props} size={size} className={className} />;
}
