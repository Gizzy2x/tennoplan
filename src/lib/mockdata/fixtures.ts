/**
 * Mock data fixtures for development and testing.
 * These are derived from real drops.warframestat.us and api.warframe.market data.
 *
 * To download fresh data: run `npm run sync:mockdata` (requires online connection).
 * Mock data is never stale — timestamps are set to Date.now() at fixture load time.
 */

import type { DropLocation, DropLocationType, BountyLocation } from '@/core/domain/drops';
import type { StoredItem, ItemCategory } from '@/core/domain/items';
import type { WorldCycle } from '@/core/domain/cycles';

// ──────────────────────────────────────────────────────────────────────────────
// DROP LOCATIONS & REWARDS
// ──────────────────────────────────────────────────────────────────────────────

export const MOCK_DROP_LOCATIONS: DropLocation[] = [
  // ─── Mission Rewards (Earth Proxima) ─────────────────────────────────────
  {
    locationKey: 'mission_earth_proxima_void_cascade_void_defense',
    type: 'Mission Reward',
    displayName: 'Earth Proxima: Void Cascade (Void Defense)',
    planet: 'Earth',
    node: 'Void Cascade',
    missionType: 'Void Defense',
    rewards: [
      { itemName: 'Void Cascade Key', chance: 100, rarity: 'Guaranteed' },
      { itemName: 'Shedu Blueprint', chance: 11.28, rarity: 'Rare' },
      { itemName: 'Warhead Aerodynamics', chance: 11.28, rarity: 'Uncommon' },
      { itemName: 'Zetki Photor', chance: 11.28, rarity: 'Uncommon' },
      { itemName: 'Lavan Apoc', chance: 11.28, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },

  // ─── Void Fissures (Relic Void Fissures) ─────────────────────────────────
  {
    locationKey: 'relic_lith_neuro_b1_void_fissure',
    type: 'Relic',
    displayName: 'Void Fissure: Lith Neuro B1',
    relicName: 'Neuro B1',
    relicTier: 'Lith',
    relicState: 'Intact',
    rewards: [
      { itemName: 'Forma Blueprint', chance: 6.25, rarity: 'Common' },
      { itemName: 'Neuro Neuroptics Blueprint', chance: 6.25, rarity: 'Common' },
      { itemName: 'Plastid', chance: 6.25, rarity: 'Common' },
      { itemName: 'Nitain Extract', chance: 2, rarity: 'Rare' },
    ],
    fetchedAt: Date.now(),
  },

  {
    locationKey: 'relic_meso_axi_void_fissure',
    type: 'Relic',
    displayName: 'Void Fissure: Meso Axi S10',
    relicName: 'Axi S10',
    relicTier: 'Axi',
    relicState: 'Void Fissure',
    rewards: [
      { itemName: 'Mirage Prime Systems Blueprint', chance: 11.28, rarity: 'Rare' },
      { itemName: 'Forma Blueprint', chance: 6.25, rarity: 'Common' },
      { itemName: 'Cubic Diodes', chance: 6.25, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },

  // ─── Bounties (Cetus, Solaris, Deimos, Zariman) ──────────────────────────
  {
    locationKey: 'bounty_cetus_level_30_40_a',
    type: 'Bounty',
    displayName: 'Cetus Bounty: Level 30-40 (Rotation A)',
    bountyLocation: 'Cetus',
    bountyLevel: 'Level 30 - 40',
    rotationTier: 'A',
    rewards: [
      { itemName: 'Blind Rage Mod', chance: 22.56, rarity: 'Rare' },
      { itemName: 'Dragon Mod', chance: 22.56, rarity: 'Uncommon' },
      { itemName: 'Cetus Wisps', chance: 22.56, rarity: 'Uncommon' },
      { itemName: 'Endo', chance: 8.12, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },

  {
    locationKey: 'bounty_cetus_level_30_40_b',
    type: 'Bounty',
    displayName: 'Cetus Bounty: Level 30-40 (Rotation B)',
    bountyLocation: 'Cetus',
    bountyLevel: 'Level 30 - 40',
    rotationTier: 'B',
    rewards: [
      { itemName: 'Breath of the Eidolon', chance: 22.56, rarity: 'Rare' },
      { itemName: 'Gaze Mod', chance: 22.56, rarity: 'Uncommon' },
      { itemName: 'Endo', chance: 22.56, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },

  {
    locationKey: 'bounty_solaris_level_40_60_a',
    type: 'Bounty',
    displayName: 'Solaris Bounty: Level 40-60 (Rotation A)',
    bountyLocation: 'Solaris',
    bountyLevel: 'Level 40 - 60',
    rotationTier: 'A',
    rewards: [
      { itemName: 'Volatile Quick Shot Mod', chance: 22.56, rarity: 'Rare' },
      { itemName: 'Tear Azurite', chance: 22.56, rarity: 'Uncommon' },
      { itemName: 'Void Fissure', chance: 22.56, rarity: 'Uncommon' },
    ],
    fetchedAt: Date.now(),
  },

  {
    locationKey: 'bounty_deimos_level_30_40_a',
    type: 'Bounty',
    displayName: 'Deimos Bounty: Level 30-40 (Rotation A)',
    bountyLocation: 'Deimos',
    bountyLevel: 'Level 30 - 40',
    rotationTier: 'A',
    rewards: [
      { itemName: 'Entrati Vault', chance: 22.56, rarity: 'Rare' },
      { itemName: 'Endo', chance: 22.56, rarity: 'Uncommon' },
    ],
    fetchedAt: Date.now(),
  },

  {
    locationKey: 'bounty_zariman_level_30_40_a',
    type: 'Bounty',
    displayName: 'Zariman Bounty: Level 30-40 (Rotation A)',
    bountyLocation: 'Zariman',
    bountyLevel: 'Level 30 - 40',
    rotationTier: 'A',
    rewards: [
      { itemName: 'Zariman Reward Package', chance: 22.56, rarity: 'Rare' },
      { itemName: 'Endo', chance: 22.56, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },

  // ─── Enemy Drops ───────────────────────────────────────────────────────
  {
    locationKey: 'enemy_drop_corrupted_bombard',
    type: 'Enemy Drop',
    displayName: 'Corrupted Bombard Drop',
    rewards: [
      { itemName: 'Condition Overload Mod', chance: 1.01, rarity: 'Rare' },
      { itemName: 'Plastid', chance: 25, rarity: 'Common' },
      { itemName: 'Polymer Bundle', chance: 25, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },

  {
    locationKey: 'enemy_drop_ancient_healer',
    type: 'Enemy Drop',
    displayName: 'Ancient Healer Drop',
    rewards: [
      { itemName: 'Blind Rage Mod', chance: 2.02, rarity: 'Rare' },
      { itemName: 'Grineer Lich Ephemera', chance: 0.02, rarity: 'Legendary' },
    ],
    fetchedAt: Date.now(),
  },

  // ─── Sortie Rewards ───────────────────────────────────────────────────
  {
    locationKey: 'sortie_reward_stage_3',
    type: 'Sortie Reward',
    displayName: 'Sortie Reward (Stage 3)',
    rewards: [
      { itemName: 'Anasa Ayatan Sculpture', chance: 25, rarity: 'Rare' },
      { itemName: 'Lith Relic Pack', chance: 25, rarity: 'Uncommon' },
      { itemName: 'Nitain Extract', chance: 10, rarity: 'Rare' },
      { itemName: 'Void Trace', chance: 40, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },

  // ─── Transient Rewards ──────────────────────────────────────────────────
  {
    locationKey: 'transient_void_cascade',
    type: 'Transient Reward',
    displayName: 'Void Cascade: Transient Reward',
    rewards: [
      { itemName: 'Void Fissure', chance: 100, rarity: 'Guaranteed' },
      { itemName: 'Zariman Key', chance: 25, rarity: 'Common' },
    ],
    fetchedAt: Date.now(),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// ITEMS (Sample subset of common items)
// ──────────────────────────────────────────────────────────────────────────────

export const MOCK_ITEMS: StoredItem[] = [
  // Warframes
  {
    uniqueName: '/Lotus/Powersuits/Ninja/Ninja',
    name: 'Ash',
    category: 'Warframes',
    imageName: 'ash-f2c6f3ab3f.png',
    iconUrl: 'https://cdn.warframestat.us/img/ash-f2c6f3ab3f.png',
    lastUpdated: Date.now(),
  },
  {
    uniqueName: '/Lotus/Powersuits/Banshee/Banshee',
    name: 'Banshee',
    category: 'Warframes',
    imageName: 'banshee-e2f7c8b4a.png',
    iconUrl: 'https://cdn.warframestat.us/img/banshee-e2f7c8b4a.png',
    lastUpdated: Date.now(),
  },
  {
    uniqueName: '/Lotus/Powersuits/Protea/Protea',
    name: 'Protea',
    category: 'Warframes',
    imageName: 'protea-d5f3c2b1a.png',
    iconUrl: 'https://cdn.warframestat.us/img/protea-d5f3c2b1a.png',
    lastUpdated: Date.now(),
  },

  // Weapons
  {
    uniqueName: '/Lotus/Weapons/Rifle/Rubico',
    name: 'Rubico Prime',
    category: 'Primary',
    imageName: 'rubico-prime-a1b2c3d4e.png',
    iconUrl: 'https://cdn.warframestat.us/img/rubico-prime-a1b2c3d4e.png',
    lastUpdated: Date.now(),
  },
  {
    uniqueName: '/Lotus/Weapons/Sword/Orthos',
    name: 'Orthos Prime',
    category: 'Melee',
    imageName: 'orthos-prime-f5e6d7c8b.png',
    iconUrl: 'https://cdn.warframestat.us/img/orthos-prime-f5e6d7c8b.png',
    lastUpdated: Date.now(),
  },

  // Relics
  {
    uniqueName: '/Lotus/Void/Relics/Lith/Relics/RelicLithT3',
    name: 'Lith S3 Relic',
    category: 'Relics',
    imageName: 'lith-s3-relic-c2d3e4f5a.png',
    iconUrl: 'https://cdn.warframestat.us/img/lith-s3-relic-c2d3e4f5a.png',
    lastUpdated: Date.now(),
  },

  // Mods
  {
    uniqueName: '/Lotus/Mods/Aura/CorruptionMods/ConditionOverload',
    name: 'Condition Overload',
    category: 'Mods',
    imageName: 'condition-overload-b1c2d3e4f.png',
    iconUrl: 'https://cdn.warframestat.us/img/condition-overload-b1c2d3e4f.png',
    lastUpdated: Date.now(),
  },
  {
    uniqueName: '/Lotus/Mods/Aura/CorruptionMods/BlindRage',
    name: 'Blind Rage',
    category: 'Mods',
    imageName: 'blind-rage-a5b6c7d8e.png',
    iconUrl: 'https://cdn.warframestat.us/img/blind-rage-a5b6c7d8e.png',
    lastUpdated: Date.now(),
  },

  // Resources
  {
    uniqueName: '/Lotus/Types/Items/MiscItems/PlastidBits',
    name: 'Plastid',
    category: 'Resources',
    imageName: 'plastid-f9e8d7c6b.png',
    iconUrl: 'https://cdn.warframestat.us/img/plastid-f9e8d7c6b.png',
    lastUpdated: Date.now(),
  },
  {
    uniqueName: '/Lotus/Types/Items/MiscItems/AlloyPlate',
    name: 'Alloy Plate',
    category: 'Resources',
    imageName: 'alloy-plate-e1f2a3b4c.png',
    iconUrl: 'https://cdn.warframestat.us/img/alloy-plate-e1f2a3b4c.png',
    lastUpdated: Date.now(),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// WORLD CYCLES
// ──────────────────────────────────────────────────────────────────────────────

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
}

// ──────────────────────────────────────────────────────────────────────────────
// MOCK WORLDSTATE (for SyncService integration)
// ──────────────────────────────────────────────────────────────────────────────

export function generateMockWorldstate() {
  const now = Date.now();

  // Build the worldstate_master payload shape (matching warframestat.us response)
  // CRITICAL: Cycles must have 'activation' and 'expiry' as ISO strings, not the WorldCycle shape
  return {
    timestamp: new Date(now).toISOString(),
    version: '27.0.0',
    challenges: [], // Nightwave challenges (empty for mock)

    // ── World Cycles (RawCycle shape: expiry + activation as ISO strings) ──
    cetusCycle: {
      activation: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 1 * 60 * 60 * 1000).toISOString(),
      state: 'day',
    },
    vallisCycle: {
      activation: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
      state: 'warm',
    },
    cambionCycle: {
      activation: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 1 * 60 * 60 * 1000).toISOString(),
      active: 'fass',
    },
    zarimanCycle: {
      activation: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      state: 'corpus',
    },
    earthCycle: {
      activation: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      state: 'night',
    },
    duviriCycle: {
      activation: new Date(now - 1.5 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 2.5 * 60 * 60 * 1000).toISOString(),
      mood: 'joy',
    },

    // ── Sortie (SortieRaw shape) ──
    sortie: {
      expiry: new Date(now + 23 * 60 * 60 * 1000).toISOString(),
      faction: 'Void',
      boss: 'Lephantis',
      variants: [
        {
          missionType: 'Void Cascade',
          modifierType: 'Ice',
          modifierDescription: '-50% Shields',
          node: 'Void Cascade (Lith)',
        },
        {
          missionType: 'Void Cascade',
          modifierType: 'Fire',
          modifierDescription: '+50% Fire Damage',
          node: 'Void Cascade (Meso)',
        },
        {
          missionType: 'Void Cascade',
          modifierType: 'Magnetic',
          modifierDescription: '+100% Shield Damage',
          node: 'Void Cascade (Axi)',
        },
      ],
    },

    // ── Void Fissures (RawFissure shape) ──
    fissures: [
      {
        id: 'lith-fissure-1',
        activation: new Date(now - 10 * 60 * 1000).toISOString(),
        expiry: new Date(now + 50 * 60 * 1000).toISOString(),
        tier: 'Lith',
        tierNum: 1,
        missionType: 'Void Fissure',
        node: 'Void Fissure (Lith)',
        enemy: 'Void',
        isHard: false,
        isStorm: false,
        expired: false,
      },
      {
        id: 'meso-fissure-1',
        activation: new Date(now - 20 * 60 * 1000).toISOString(),
        expiry: new Date(now + 40 * 60 * 1000).toISOString(),
        tier: 'Meso',
        tierNum: 2,
        missionType: 'Void Fissure',
        node: 'Void Fissure (Meso)',
        enemy: 'Void',
        isHard: false,
        isStorm: false,
        expired: false,
      },
      {
        id: 'axi-fissure-1',
        activation: new Date(now - 5 * 60 * 1000).toISOString(),
        expiry: new Date(now + 55 * 60 * 1000).toISOString(),
        tier: 'Axi',
        tierNum: 3,
        missionType: 'Void Fissure',
        node: 'Void Fissure (Axi)',
        enemy: 'Void',
        isHard: false,
        isStorm: false,
        expired: false,
      },
    ],

    // ── Nightwave (NightwaveRaw shape) ──
    nightwave: {
      season: 1,
      tag: 'MockSeason',
      expiry: new Date(now + 93 * 60 * 60 * 1000).toISOString(),
      activeChallenges: [
        {
          id: 'nw-daily-1',
          activation: new Date(now).toISOString(),
          expiry: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          isDaily: true,
          isElite: false,
          isPermanent: false,
          title: 'Void Cascade',
          desc: 'Complete 3 Void Fissure missions',
          reputation: 1000,
        },
        {
          id: 'nw-daily-2',
          activation: new Date(now).toISOString(),
          expiry: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          isDaily: true,
          isElite: false,
          isPermanent: false,
          title: 'Zariman Completionist',
          desc: 'Complete 5 Zariman 10-0 bounties',
          reputation: 1000,
        },
        {
          id: 'nw-weekly-1',
          activation: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
          expiry: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
          isDaily: false,
          isElite: false,
          isPermanent: false,
          title: 'Void Mastery',
          desc: 'Complete 15 Void Fissure missions',
          reputation: 5000,
        },
      ],
    },

    // ── Invasions ──
    invasions: [
      {
        id: 'invasion-1',
        activation: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        expiry: new Date(now + 22 * 60 * 60 * 1000).toISOString(),
        node: 'Mercury (Tolstoj)',
        attacking: { faction: 'Grineer', reward: { assetType: 'resource', itemType: 'Rubedo' } },
        defending: { faction: 'Corpus', reward: { assetType: 'resource', itemType: 'Polymer Bundle' } },
        count: 145000,
        requiredCount: 200000,
        progress: 72.5,
      },
    ],

    // ── Alerts ──
    alerts: [
      {
        id: 'alert-1',
        activation: new Date(now - 30 * 60 * 1000).toISOString(),
        expiry: new Date(now + 90 * 60 * 1000).toISOString(),
        mission: {
          node: 'Mars (Olympus)',
          type: 'Exterminate',
          faction: 'Grineer',
          level: '25-35',
          reward: { assetType: 'resource', itemType: 'Nano Spores', countedItem: 'Nano Spores' },
        },
      },
    ],

    // ── Void Trader ──
    voidTrader: {
      id: 'void-trader-1',
      activation: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      character: 'Baro Ki\'Teer',
      location: 'Void Cascades',
      inventory: [
        { item: 'Primed Continuity', ducats: 220, credits: 500000 },
        { item: 'Primed Fury', ducats: 220, credits: 500000 },
      ],
    },

    // ── Steel Path ──
    steelPath: {
      activation: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      expiry: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(),
      currentReward: { name: 'Zariman Relic Pack', rotation: 'A' },
    },

    // ── News ──
    news: [
      {
        id: 'news-1',
        link: 'https://www.warframe.com/news',
        imageLink: 'https://example.com/news.jpg',
        title: 'Mock News: New Warframe Released',
        date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        update: false,
        primeAccess: false,
        stream: false,
        translations: { en: 'Mock News in English' },
      },
    ],
  };
}
