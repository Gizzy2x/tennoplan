/**
 * useSortieRewardPool — the Sortie's static reward POOL, codex-identity-stamped.
 *
 * Why a drop-table source, not the live worldstate string: a Sortie awards ONE
 * random reward on completion, so the live worldstate can't name it in advance —
 * the parser emits a placeholder ("Sortie Rewards"). What players actually want
 * to see is the POOL (everything the Sortie can drop: Riven, Kuva, Forma,
 * Legendary Core, Anasa Sculpture, …), which IS static and lives in the drop
 * tables (`db.dropLocations`, type 'Sortie Reward', written by DropDataService
 * from drops.warframestat.us — the same table the bounty board reads).
 *
 * Each reward string is resolved to a codex `uniqueName` via the shared
 * `dropResolver` so tiles deep-link deterministically (icon + quick-look), then
 * deduped to one entry per item keyed by uniqueName ?? itemName, best chance
 * kept, sorted by chance descending. Reactive to drop + codex syncs.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { getDropResolver } from '@/adapters/items/dropResolverAdapter';

export interface SortieReward {
  itemName:    string;
  uniqueName?: string;
  /** Drop chance, 0–100. */
  chance:      number;
  rarity:      string;
}

export function useSortieRewardPool(): SortieReward[] {
  return useLiveQuery(
    async () => {
      const [resolver, rows] = await Promise.all([
        getDropResolver(),
        db.dropLocations.where('type').equals('Sortie Reward').toArray(),
      ]);

      // Dedupe across every 'Sortie Reward' row (the table may split the pool by
      // rewardType bucket) into one tile per unique item, keeping the best chance.
      const byKey = new Map<string, SortieReward>();
      for (const row of rows) {
        for (const r of row.rewards) {
          const uniqueName = r.uniqueName ?? resolver.resolve(r.itemName)?.uniqueName;
          const key = uniqueName ?? r.itemName;
          const existing = byKey.get(key);
          if (!existing || r.chance > existing.chance) {
            byKey.set(key, { itemName: r.itemName, uniqueName, chance: r.chance, rarity: r.rarity });
          }
        }
      }

      return [...byKey.values()].sort(
        (a, b) => b.chance - a.chance || a.itemName.localeCompare(b.itemName),
      );
    },
    [],
    [] as SortieReward[],
  ) ?? [];
}
