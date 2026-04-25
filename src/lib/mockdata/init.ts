/**
 * Mock Data Initialization — auto-load fixtures on app startup if enabled.
 *
 * Add this to your App.tsx or main.tsx:
 *   ```
 *   if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
 *     await initMockData();
 *   }
 *   ```
 */

import { populateMockData } from './mockDataAdapter';
import { logger } from '@/core/utils/logger';

const log = logger.scope('MockInit');

/**
 * Initialize mock data on app startup.
 * Safe to call even if mock data is already populated.
 */
export async function initMockData(): Promise<void> {
  try {
    const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    const isBrowser = typeof window !== 'undefined';

    if (!isBrowser || !useMock) return;

    log.info('VITE_USE_MOCK_DATA=true — loading fixtures…');
    await populateMockData({ verbose: true });
    log.success('Mock data ready for development.');
  } catch (err) {
    log.error('Failed to initialize mock data', err);
  }
}
