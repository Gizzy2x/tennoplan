/**
 * Mock API Responses — complete simulated API payloads for development.
 *
 * These match the shapes returned by:
 * - api.warframestat.us/pc/worldState
 * - drops.warframestat.us/data/all.json
 * - api.warframe.market/v2/*
 */

import { generateMockWorldstate } from './fixtures';

/**
 * Get a mock Worldstate response (same shape as api.warframestat.us/pc/).
 * Includes all cycles, fissures, invasions, alerts, etc.
 */
export function getMockWorldstateResponse() {
  return generateMockWorldstate();
}

/**
 * Get a mock Void Fissure list response.
 */
export function getMockFissuresResponse() {
  const now = Date.now();
  return {
    fissures: [
      {
        id: 'lith-001',
        tier: 'Lith',
        missionType: 'Void Fissure',
        activation: new Date(now - 10 * 60 * 1000).toISOString(),
        expiry: new Date(now + 50 * 60 * 1000).toISOString(),
        isHard: false,
        isStorm: false,
      },
      {
        id: 'meso-001',
        tier: 'Meso',
        missionType: 'Void Fissure',
        activation: new Date(now - 15 * 60 * 1000).toISOString(),
        expiry: new Date(now + 45 * 60 * 1000).toISOString(),
        isHard: false,
        isStorm: false,
      },
      {
        id: 'axi-001',
        tier: 'Axi',
        missionType: 'Void Fissure',
        activation: new Date(now - 5 * 60 * 1000).toISOString(),
        expiry: new Date(now + 55 * 60 * 1000).toISOString(),
        isHard: false,
        isStorm: false,
      },
    ],
  };
}

/**
 * Get a mock Nightwave challenges response.
 */
export function getMockNightwaveResponse() {
  const now = Date.now();
  return {
    id: 'mock-nw-season-1',
    activation: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expiry: new Date(now + 93 * 60 * 60 * 1000).toISOString(),
    season: 1,
    tag: 'TestSeason',
    phase: 1,
    challenges: [
      {
        id: 'daily-1',
        activation: new Date(now).toISOString(),
        expiry: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        isDaily: true,
        title: 'Void Cascade',
        asString: 'Complete 3 Void Fissure missions',
        reputation: 1000,
      },
      {
        id: 'daily-2',
        activation: new Date(now).toISOString(),
        expiry: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        isDaily: true,
        title: 'Zariman Completionist',
        asString: 'Complete 5 Zariman 10-0 bounties',
        reputation: 1000,
      },
      {
        id: 'weekly-1',
        activation: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expiry: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isDaily: false,
        title: 'Void Mastery',
        asString: 'Complete 15 Void Fissure missions',
        reputation: 5000,
      },
    ],
  };
}

/**
 * Get a mock Sortie response.
 */
export function getMockSortieResponse() {
  const now = Date.now();
  return {
    id: 'sortie-001',
    activation: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    expiry: new Date(now + 23 * 60 * 60 * 1000).toISOString(),
    boss: 'Lephantis',
    reward: 'Void Relic (100k+ Void Fissure)',
    stages: [
      {
        tileset: 'Void Cascade',
        modifier: 'Ice',
        enemyLevel: '30-40',
      },
      {
        tileset: 'Void Cascade',
        modifier: 'Fire',
        enemyLevel: '50-60',
      },
      {
        tileset: 'Void Cascade',
        modifier: 'Magnetic',
        enemyLevel: '80-100',
      },
    ],
  };
}

/**
 * Get a mock Invasions response.
 */
export function getMockInvasionsResponse() {
  const now = Date.now();
  return {
    invasions: [
      {
        id: 'inv-001',
        activation: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        expiry: new Date(now + 22 * 60 * 60 * 1000).toISOString(),
        node: 'Mercury (Tolstoj)',
        attacking: {
          faction: 'Grineer',
          reward: { assetType: 'resource', itemType: 'Rubedo' },
        },
        defending: {
          faction: 'Corpus',
          reward: { assetType: 'resource', itemType: 'Polymer Bundle' },
        },
        count: 145000,
        requiredCount: 200000,
        progress: 72.5,
      },
      {
        id: 'inv-002',
        activation: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        expiry: new Date(now + 20 * 60 * 60 * 1000).toISOString(),
        node: 'Venus (Fossa)',
        attacking: {
          faction: 'Corpus',
          reward: { assetType: 'resource', itemType: 'Alloy Plate' },
        },
        defending: {
          faction: 'Grineer',
          reward: { assetType: 'resource', itemType: 'Plastid' },
        },
        count: 89000,
        requiredCount: 200000,
        progress: 44.5,
      },
    ],
  };
}

/**
 * Check if mock mode is enabled.
 */
export function isMockModeEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}
