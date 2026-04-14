import { setWsCache, getWsCache, getWsTimestamp } from '../adapters/storage/worldstateCache';

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
  }
};
