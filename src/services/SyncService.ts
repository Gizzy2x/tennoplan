import { db } from '../adapters/storage/db';
import { setWsCache, getWsCache, getWsTimestamp } from '../adapters/storage/worldstateCache';

const USER_INVENTORY_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const SyncService = {
  /**
   * The single entry-point for all worldstate network requests.
   *
   * @param force - bypass the 60s anti-spam lock (for manual user-triggered refreshes)
   */
  async performSync(force = false) {
    const now = Date.now();

    // 1. The 60s Lock (Anti-Spam) — skipped when force=true
    if (!force) {
      const lastSync = await getWsTimestamp('last_sync_time');
      if (lastSync && now - lastSync < 60_000) {
        return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
      }
    }

    try {
      // 2. Fetch the full worldstate packet — this is the ONLY place in the app
      //    that calls fetch('/api/worldstate').
      const response = await fetch('/api/worldstate');
      const data = await response.json();

      // 3. Save the entire payload to one Dexie entry (1h TTL).
      //    All useLiveQuery subscribers auto-update — no manual invalidation needed.
      await setWsCache('worldstate_master', data, 3_600_000);
      await setWsCache('last_sync_time', now);

      return data;
    } catch (error) {
      console.error('Sync failed, falling back to offline data.');
      return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
    }
  },

  /**
   * Gateway method for persisting user inventory from parsed EE.log.
   *
   * @param items - Array of discovered item names from LogParserService.parseLog()
   *
   * This is the ONLY place in the app that writes user_inventory to cache.
   * It ensures:
   * - Consistent TTL (24 hours)
   * - Single write path (SyncService enforces)
   * - Coordination with worldstate sync cadence
   */
  async updateUserInventory(items: string[]) {
    const now = Date.now();

    try {
      await db.cache.put({
        key: 'user_inventory',
        data: items,
        updatedAt: now,
        expiresAt: now + USER_INVENTORY_TTL,
      });
    } catch (error) {
      console.error('Failed to persist user inventory:', error);
      throw error;
    }
  },
};
