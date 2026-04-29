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
    kvTtlSeconds:         21_600,
    fetchTimeoutMs:       30_000,
  },

  maxStalenessMinutes:             60,
  fallbackStalenessWarningMinutes: 30,
} as const;
