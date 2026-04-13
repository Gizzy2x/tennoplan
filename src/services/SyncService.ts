import { setWsCache, getWsCache, getWsTimestamp } from '../adapters/storage/worldstateCache';
import { queryClient } from '../lib/queryClient';

export const SyncService = {
  async performSync() {
    // 1. The 60s Lock (Anti-Spam)
    const lastSync = await getWsTimestamp('last_sync_time');
    const now = Date.now();

    if (lastSync && now - lastSync < 60_000) {
      return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
    }

    try {
      // 2. Fetch the full worldstate packet
      const response = await fetch('/api/worldstate');
      const data = await response.json();

      // 3. Save to Dexie (1h TTL; 60s lock controls live refresh rate)
      await setWsCache('worldstate_master', data, 3_600_000);
      await setWsCache('last_sync_time', now);

      // 4. Invalidate all active worldstate queries so the UI snaps to life
      await queryClient.invalidateQueries({ queryKey: ['ws:worldCycles'] });
      await queryClient.invalidateQueries({ queryKey: ['ws:fissures'] });
      await queryClient.invalidateQueries({ queryKey: ['ws:nightwave'] });
      await queryClient.invalidateQueries({ queryKey: ['ws:rail'] });

      return data;
    } catch (error) {
      console.error('Sync failed, falling back to offline data.');
      return (await getWsCache<unknown>('worldstate_master'))?.data ?? null;
    }
  }
};
