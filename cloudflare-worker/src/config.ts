export const config = {
  kv: {
    worldstate: {
      current:  'worldstate:current',
      previous: 'worldstate:previous',
      metadata: 'worldstate:metadata',
    },
    codex: {
      current:  'codex:current',
      previous: 'codex:previous',
      metadata: 'codex:metadata',
    },
  },

  worldstate: {
    // Primary: warframestat.us community-parsed shape
    primaryUrl:     'https://api.warframestat.us/pc/',
    // Official DE endpoint — raw worldstate JSON fed to warframe-worldstate-parser
    officialUrl:    'https://api.warframe.com/cdn/worldState.php',
    kvTtlSeconds:   300,
    fetchTimeoutMs: 10_000,
  },

  codex: {
    // calamity-inc enriched public export — most complete Warframe dataset available
    calamityBaseUrl:      'https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master/',
    wfcdDropsUrl:         'https://drops.warframestat.us/data/all.json',
    wfcdDropsFallbackUrl: 'https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/all.json',
    kvTtlSeconds:         172_800,  // 48h — covers 24h normal cycle + buffer
    fetchTimeoutMs:       30_000,
    // Maximum simultaneous calamity fetches. Cloudflare Workers cap at
    // 6 concurrent subrequests by default during scheduled events; we
    // batch 4 at a time to stay safely under the limit while still
    // pipelining downloads.
    concurrency:          4,
    // Calamity-inc files we consume. Each is a JSON dictionary keyed by
    // uniqueName (e.g. /Lotus/Powersuits/Ninja/Ninja). Order matters
    // only for log readability — fetcher pulls them in parallel batches.
    calamityFiles: [
      'ExportWarframes.json',     // all warframes (base + Prime)
      'ExportWeapons.json',       // primary, secondary, melee, archwing
      'ExportSentinels.json',     // companions
      'ExportSentinelPowers.json',// companion abilities
      'ExportUpgrades.json',      // mods
      'ExportRecipes.json',       // build requirements
      'ExportRelicArcane.json',   // relics + arcanes
      'ExportResources.json',     // resources, gems, fish
      'ExportKeys.json',          // quest keys, lich keys
      'ExportFlavour.json',       // sigils, glyphs, cosmetics
      'ExportFusionBundles.json', // mod fusion components
      'ExportGear.json',          // ciphers, restores, consumables
    ] as const,
  },

  maxStalenessMinutes:             60,
  fallbackStalenessWarningMinutes: 30,
} as const;
