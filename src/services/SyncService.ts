/**
 * SyncService — inventory-only gateway (Phase E).
 *
 * Worldstate polling has moved to WorldstateSync (which talks to the V2
 * Cloudflare Worker). The legacy warframestat.us polling pipeline,
 * LocalStorage snapshot seed, ETag handling, and visibility-aware poll
 * loop have all been retired — feature hooks now read ParsedWorldstate
 * directly via useWorldstate().
 *
 * What's left: the EE.log → Dexie inventory write path used by
 * <LogDropZone />. This is a single Dexie write; it kept the SyncService
 * name purely so existing call sites don't need to change. Once the
 * Tauri/Rust EE.log parser lands (see CLAUDE.md), this is a candidate
 * for relocation to a dedicated InventoryService.
 */

import { db } from '../adapters/storage/db';
import { logger } from '../core/utils/logger';

const log = logger.scope('SyncService');

const USER_INVENTORY_TTL_MS = 24 * 60 * 60 * 1000;

export const SyncService = {
  /**
   * Persist the parsed EE.log inventory snapshot to Dexie. Used by the
   * inventory drop-zone after the user supplies an EE.log file. The
   * 24-h TTL matches the upstream warframestat.us cache lifetime.
   */
  async updateUserInventory(items: string[]) {
    const now = Date.now();
    try {
      await db.cache.put({
        key:       'user_inventory',
        data:      items,
        updatedAt: now,
        expiresAt: now + USER_INVENTORY_TTL_MS,
      });
    } catch (error) {
      log.error('Failed to persist user inventory.', error);
      throw error;
    }
  },
};
