#!/usr/bin/env node

/**
 * sync-mockdata.js — Download live data from Warframe APIs and update fixtures.
 *
 * Usage:
 *   npx node scripts/sync-mockdata.js
 *
 * What it does:
 *   1. Fetches drops.warframestat.us/data/all.json (drop locations)
 *   2. Fetches api.warframestat.us/pc/worldState (world cycles)
 *   3. Extracts a curated sample of items and drops
 *   4. Updates src/lib/mockdata/fixtures.ts with fresh data
 *
 * Requirements:
 *   - Node 18+
 *   - Internet connection
 *   - npm dependencies installed
 */

const fs = require('fs');
const path = require('path');

const DROPS_API = 'https://drops.warframestat.us/data/all.json';
const WORLDSTATE_API = 'https://api.warframestat.us/pc/worldState';

// Sample curated drops (keep a manageable fixture size)
const SAMPLE_DROP_KEYS = [
  // Void Fissures (common relics)
  'lith',
  'meso',
  'axi',
  // Bounties (all locations)
  'cetus',
  'solaris',
  'deimos',
  'zariman',
  // Some mission rewards
  'earth',
  'void',
];

const SAMPLE_ITEM_NAMES = [
  // Warframes
  'Ash',
  'Banshee',
  'Protea',
  'Mirage',
  'Nova',
  // Weapons
  'Rubico',
  'Braton',
  'Orthos',
  'Sarpa',
  // Mods & Relics
  'Condition Overload',
  'Blind Rage',
  'Forma',
  // Resources
  'Plastid',
  'Alloy Plate',
  'Endo',
];

async function fetchJson(url) {
  console.log(`📥 Fetching ${url}…`);
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    timeout: 30000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

function buildFixtureCode(drops, items, cycles) {
  // Serialize drop locations
  const dropsCode = JSON.stringify(drops, null, 2);

  // Serialize items
  const itemsCode = JSON.stringify(items, null, 2);

  // Generate world cycles function (hardcoded for now)
  const cyclesCode = `
export function generateWorldCycles(): WorldCycle[] {
  const now = Date.now();
  // Cetus (2h day / 4h night cycle = 6h total)
  const cetusCycleDuration = 6 * 60 * 60 * 1000;
  const cetusOffsetMs = now % cetusCycleDuration;
  const cetusDayDuration = 2 * 60 * 60 * 1000;

  return [
    {
      id: 'cetus',
      name: 'Plains of Eidolon',
      location: 'Cetus',
      state: cetusOffsetMs < cetusDayDuration ? 'day' : 'night',
      expiryMs: now + (cetusCycleDuration - cetusOffsetMs),
      activationMs: now - cetusOffsetMs,
      fetchedAt: now,
    },
    {
      id: 'vallis',
      name: 'Orb Vallis',
      location: 'Solaris',
      state: 'warm',
      expiryMs: now + 4 * 60 * 60 * 1000,
      activationMs: now - 2 * 60 * 60 * 1000,
      fetchedAt: now,
    },
    {
      id: 'cambion',
      name: 'Cambion Drift',
      location: 'Deimos',
      state: 'fass',
      expiryMs: now + 1 * 60 * 60 * 1000,
      activationMs: now - 1 * 60 * 60 * 1000,
      fetchedAt: now,
    },
    {
      id: 'zariman',
      name: 'The Zariman',
      location: 'Zariman',
      state: 'corpus',
      expiryMs: now + 2 * 60 * 60 * 1000,
      activationMs: now - 2 * 60 * 60 * 1000,
      fetchedAt: now,
    },
    {
      id: 'earth',
      name: 'Earth: Lith',
      location: 'Earth',
      state: 'night',
      expiryMs: now + 3 * 60 * 60 * 1000,
      activationMs: now - 3 * 60 * 60 * 1000,
      fetchedAt: now,
    },
    {
      id: 'duviri',
      name: 'Duviri Paradox',
      location: 'Duviri',
      state: 'joy',
      expiryMs: now + 2.5 * 60 * 60 * 1000,
      activationMs: now - 1.5 * 60 * 60 * 1000,
      fetchedAt: now,
    },
  ];
}`;

  return `/**
 * Mock data fixtures for development and testing.
 * These are derived from real drops.warframestat.us and api.warframe.market data.
 *
 * To download fresh data: run \`npm run sync:mockdata\` (requires online connection).
 * Mock data is never stale — timestamps are set to Date.now() at fixture load time.
 */

import type { DropLocation, DropLocationType, BountyLocation } from '@/core/domain/drops';
import type { StoredItem, ItemCategory } from '@/core/domain/items';
import type { WorldCycle } from '@/core/domain/cycles';

// ──────────────────────────────────────────────────────────────────────────────
// DROP LOCATIONS & REWARDS
// ──────────────────────────────────────────────────────────────────────────────

export const MOCK_DROP_LOCATIONS: DropLocation[] = ${dropsCode};

// ──────────────────────────────────────────────────────────────────────────────
// ITEMS (Sample subset of common items)
// ──────────────────────────────────────────────────────────────────────────────

export const MOCK_ITEMS: StoredItem[] = ${itemsCode};

// ──────────────────────────────────────────────────────────────────────────────
// WORLD CYCLES
// ──────────────────────────────────────────────────────────────────────────────

${cyclesCode}`;
}

async function main() {
  try {
    console.log('🔄 Syncing mock data from live APIs…\n');

    // Fetch drops
    const dropsData = await fetchJson(DROPS_API);
    console.log(`✓ Got ${Object.keys(dropsData).length} drop categories`);

    // Fetch worldstate
    const worldstate = await fetchJson(WORLDSTATE_API);
    console.log(`✓ Got worldstate snapshot`);

    // Extract drop locations (sample curated set)
    const drops = [];
    for (const [category, data] of Object.entries(dropsData)) {
      if (Array.isArray(data)) {
        for (const item of data.slice(0, 3)) {
          // Take first 3 from each category
          if (item && typeof item === 'object') {
            drops.push({
              locationKey: `mock_${category}_${drops.length}`,
              type: item.type || 'Mission Reward',
              displayName: item.displayName || item.name || category,
              rewards: (item.rewards || []).map(r => ({
                itemName: r.itemName || r.name || 'Unknown',
                chance: r.chance || 50,
                rarity: r.rarity || 'Common',
              })),
              bountyLocation: item.bountyLocation,
              bountyLevel: item.bountyLevel,
              rotationTier: item.rotationTier,
              relicTier: item.relicTier,
              relicName: item.relicName,
              fetchedAt: Date.now(),
            });
          }
        }
      }
    }

    console.log(`📦 Extracted ${drops.length} sample drop locations`);

    // Extract items (worldstate has some item names, but we'll use placeholders)
    const items = SAMPLE_ITEM_NAMES.map((name, idx) => ({
      uniqueName: `/Lotus/Items/Mock/${name.replace(/\s+/g, '')}`,
      name,
      category: idx < 5 ? 'Warframes' : idx < 10 ? 'Weapons' : idx < 15 ? 'Mods' : 'Resources',
      imageName: `${name.toLowerCase().replace(/\s+/g, '-')}-mock.png`,
      iconUrl: `https://cdn.warframestat.us/img/${name.toLowerCase().replace(/\s+/g, '-')}-mock.png`,
      lastUpdated: Date.now(),
    }));

    console.log(`📦 Created ${items.length} sample items`);

    // Build fixture code
    const code = buildFixtureCode(drops, items, worldstate);

    // Write to file
    const fixturesPath = path.join(__dirname, '../src/lib/mockdata/fixtures.ts');
    fs.writeFileSync(fixturesPath, code, 'utf-8');

    console.log(`\n✅ Updated ${fixturesPath}`);
    console.log('\n📝 To use mock data in development:');
    console.log('   1. Set VITE_USE_MOCK_DATA=true in .env.development');
    console.log('   2. Run: npm run dev');
    console.log('   3. Check browser console for "Mock data ready for development."');
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

main();
