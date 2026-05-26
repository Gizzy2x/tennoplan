/**
 * Mock Data Adapter — inject fixtures into Dexie for development/testing.
 *
 * Usage:
 *   - Call `populateMockData()` on app init to fill Dexie with fixtures.
 *   - Set VITE_USE_MOCK_DATA=true in .env.development to auto-enable.
 *   - Mock data survives page reloads; use `clearAllMockData()` to reset.
 */

import { db } from '@/adapters/storage/db';
import { MOCK_DROP_LOCATIONS, MOCK_ITEMS, generateWorldCycles } from './fixtures';
import { logger } from '@/core/utils/logger';

const log = logger.scope('MockDataAdapter');

// ──────────────────────────────────────────────────────────────────────────────
// Mock Data Population
// ──────────────────────────────────────────────────────────────────────────────

export interface MockDataOptions {
  /** If true, wipe existing data before populating. Default: false. */
  wipeFirst?: boolean;
  /** If true, log progress to console. Default: true. */
  verbose?: boolean;
}

/**
 * Populate Dexie tables with mock fixtures.
 * Safe to call multiple times — checks for existing data by default.
 */
export async function populateMockData(options: MockDataOptions = {}): Promise<void> {
  const { wipeFirst = false, verbose = true } = options;

  if (verbose) log.info('Populating mock data…');

  try {
    await db.transaction('rw', [db.items, db.dropLocations, db.dataSyncState], async () => {
      // Optionally wipe before populate
      if (wipeFirst) {
        if (verbose) log.info('Wiping existing data…');
        await db.items.clear();
        await db.dropLocations.clear();
        await db.dataSyncState.clear();
      }

      // Check if data already exists
      const existingItems = await db.items.count();
      const existingDrops = await db.dropLocations.count();

      if (existingItems > 0 && existingDrops > 0 && !wipeFirst) {
        if (verbose) log.info('Mock data already populated. Skipping.');
        return;
      }

      // Populate items
      if (verbose) log.info(`Writing ${MOCK_ITEMS.length} items…`);
      await db.items.bulkPut(MOCK_ITEMS);

      // Populate drop locations
      if (verbose) log.info(`Writing ${MOCK_DROP_LOCATIONS.length} drop locations…`);
      await db.dropLocations.bulkPut(MOCK_DROP_LOCATIONS);

      // Write sync state (mark as freshly synced)
      const now = Date.now();
      await db.dataSyncState.put({
        id: 'items',
        lastUpdated: now,
        rowCount: MOCK_ITEMS.length,
        lastErrorMessage: undefined,
      });
      await db.dataSyncState.put({
        id: 'dropLocations',
        lastUpdated: now,
        rowCount: MOCK_DROP_LOCATIONS.length,
        lastErrorMessage: undefined,
      });

      if (verbose) {
        log.success(
          `Mock data ready: ${MOCK_ITEMS.length} items, ${MOCK_DROP_LOCATIONS.length} drop locations`,
        );
      }
    });
  } catch (err) {
    log.error('Failed to populate mock data', err);
    throw err;
  }
}

/**
 * Clear all mock data from Dexie.
 * Only items, dropLocations, and dataSyncState — leaves user marks & settings untouched.
 */
export async function clearAllMockData(): Promise<void> {
  log.info('Clearing mock data…');

  try {
    await db.transaction('rw', [db.items, db.dropLocations, db.dataSyncState], async () => {
      await db.items.clear();
      await db.dropLocations.clear();
      await db.dataSyncState.delete('items');
      await db.dataSyncState.delete('dropLocations');
    });
    log.success('Mock data cleared.');
  } catch (err) {
    log.error('Failed to clear mock data', err);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures & Test Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Export fixtures for unit tests. */
export const mockFixtures = {
  dropLocations: MOCK_DROP_LOCATIONS,
  items: MOCK_ITEMS,
  worldCycles: generateWorldCycles(),
};

/**
 * Inject a specific drop location for testing UI layouts.
 * Useful for checking how rare drops or edge cases render.
 */
export async function injectTestDropLocation(location: typeof MOCK_DROP_LOCATIONS[0]): Promise<void> {
  await db.dropLocations.put(location);
  log.info(`Injected test drop: ${location.displayName}`);
}

/**
 * Get the count of cached items and drops (for debugging).
 */
export async function getMockDataStats(): Promise<{ itemsCount: number; dropsCount: number }> {
  const itemsCount = await db.items.count();
  const dropsCount = await db.dropLocations.count();
  return { itemsCount, dropsCount };
}
