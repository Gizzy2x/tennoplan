/**
 * useIconPreloader — just-in-time CDN icon preloading for the active world.
 *
 * Injects <link rel="preload" as="image"> tags for every unique icon in the
 * provided bounty list so the browser fetches them before they scroll into
 * view, eliminating perceived load time on first-render of reward pools —
 * particularly noticeable on older PCs with slower HDDs.
 *
 * Strategy:
 *   1. Collect all unique itemNames across every rotation + fallback pool.
 *   2. Resolve imageName for each via the build-time static items map (O(1),
 *      no network call) — same path the RewardIconCell in BountyJobList uses.
 *   3. Inject one <link rel="preload" as="image"> per unique imageName.
 *   4. Clean up when the bounties array changes (world switch) or on unmount.
 *
 * Lives in the feature folder because it touches the DOM (document.head).
 * Pure logic (imageName resolution) delegates to itemsAdapter + IconResolver.
 */

import { useEffect, useRef } from 'react';
import type { EnrichedBounty } from '@/core/domain/bounty';
import { findByName } from '@/adapters/items/codexCatalog';

export function useIconPreloader(bounties: EnrichedBounty[]): void {
  // Keep a stable ref to the injected <link> elements so we can remove
  // them on cleanup without needing them in the effect dependency array.
  const linksRef = useRef<HTMLLinkElement[]>([]);

  useEffect(() => {
    // ── Remove previous world's preloads ─────────────────────────────────
    for (const link of linksRef.current) {
      link.remove();
    }
    linksRef.current = [];

    if (bounties.length === 0) return;

    // ── Collect unique icon URLs (codex-first, items-map fallback) ─────────
    const urls = new Set<string>();

    for (const bounty of bounties) {
      // Regular rotation rewards
      for (const rotation of bounty.rotations) {
        for (const reward of rotation.rewards) {
          const item = findByName(reward.itemName);
          if (item?.iconUrl) urls.add(item.iconUrl);
        }
      }
      // Fallback pool (pre-sync flat list)
      if (bounty.fallbackPool) {
        for (const name of bounty.fallbackPool) {
          const item = findByName(name);
          if (item?.iconUrl) urls.add(item.iconUrl);
        }
      }
    }

    // ── Inject <link rel="preload"> for each icon ─────────────────────────
    const newLinks: HTMLLinkElement[] = [];
    for (const url of urls) {
      const link = document.createElement('link');
      link.rel          = 'preload';
      link.as           = 'image';
      link.href         = url;
      link.crossOrigin  = 'anonymous';
      document.head.appendChild(link);
      newLinks.push(link);
    }
    linksRef.current = newLinks;

    // ── Cleanup: remove on unmount or next run ────────────────────────────
    return () => {
      for (const link of newLinks) {
        link.remove();
      }
      linksRef.current = [];
    };
  }, [bounties]);
}
