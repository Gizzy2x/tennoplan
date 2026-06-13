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
      // Phase B — chunk manifest (per-category content-addressed R2 chunks).
      manifest:         'codex:manifest',
      manifestPrevious: 'codex:manifest:previous',
    },
  },

  worldstate: {
    // Community-parsed shape (already-parsed JSON, no lib needed). Flaky:
    // warframestat intermittently returns an empty 200 body.
    primaryUrl:     'https://api.warframestat.us/pc/',
    // Official DE endpoints — raw worldstate JSON fed to warframe-worldstate-parser.
    // Two mirrors: if one host is unreachable from Cloudflare's egress, try the
    // other before falling back to the flaky community source. Both return the
    // same ~130KB blob.
    officialUrl:       'https://api.warframe.com/cdn/worldState.php',
    officialMirrorUrl: 'https://content.warframe.com/dynamic/worldState.php',
    // 24h. The cron refreshes every minute on success, so served data is
    // normally <1min old; this TTL governs how long the LAST-GOOD snapshot
    // survives an upstream outage. At the old 300s (5min), any blip >5min
    // evaporated the cache → "no cached worldstate" → 503 → blank app. A long
    // TTL lets the worker serve stale + cycle-math-projected data through
    // outages (timers drift, but the app stays alive) instead of dying.
    kvTtlSeconds:   86_400,
    fetchTimeoutMs: 10_000,
  },

  codex: {
    // ---------------------------------------------------------------------
    // WFCD-only pipeline.
    //
    // Primary: api.warframestat.us — pre-built CDN of @wfcd/items output,
    //   with `?only=` field-filtering so we keep payloads small.
    // Fallback: raw.githubusercontent.com/WFCD/warframe-items — same data,
    //   no field filtering, but a totally different host so api outages don't
    //   take us down. Slightly larger payloads (~2–5× per category) but
    //   tolerable when it's just the fallback path.
    //
    // Categories: 9 user-facing item universes.
    // ---------------------------------------------------------------------

    // Drops payload — keyed by location, inverted to per-item drops in parser.
    wfcdDropsUrl:         'https://drops.warframestat.us/data/all.json',
    wfcdDropsFallbackUrl: 'https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/all.json',

    // Per-category item endpoints.
    //
    // Mods — per-rank levelStats + augment/exilus/modset flags + patchlogs.
    wfcdModsUrl:               'https://api.warframestat.us/mods?only=uniqueName,name,levelStats,polarity,rarity,baseDrain,compatName,description,isAugment,isExilus,modSet,imageName,tradable,type,wikiaUrl,releaseDate,transmutable,introduced,patchlogs',
    wfcdModsFallbackUrl:       'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Mods.json',

    // Warframes — polarities, aura, components, resolved ability names.
    wfcdWarframesUrl:          'https://api.warframestat.us/warframes?only=uniqueName,name,description,passiveDescription,polarities,aura,abilities,components,wikiaUrl,introduced,patchlogs,releaseDate,masterable,isPrime,health,shield,armor,power,sprintSpeed,imageName,type',
    wfcdWarframesFallbackUrl:  'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json',

    // Weapons — combined endpoint covers Primary/Secondary/Melee/Arch-*.
    // Includes Riven disposition (omegaAttenuation), per-damage-type breakdown
    // (damage), trigger/noise classification, accuracy, and melee numerics
    // (range, blockingAngle, comboDuration, followThrough, slamAttack,
    // slamRadialDamage). The summary rail consumes these end-to-end.
    wfcdWeaponsUrl:            'https://api.warframestat.us/weapons?only=uniqueName,name,description,type,category,productCategory,masteryReq,totalDamage,fireRate,criticalChance,criticalMultiplier,procChance,magazineSize,reloadTime,components,imageName,wikiaUrl,introduced,patchlogs,releaseDate,tradable,isPrime,polarities,damage,omegaAttenuation,accuracy,noise,trigger,range,blockingAngle,comboDuration,followThrough,slamAttack,slamRadialDamage',
    wfcdWeaponsFallbackUrl:    'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/All.json',

    // Sentinels / Pets / Relics / Resources / Gear:
    // api.warframestat.us has no top-level routes for these — it 404s. Skip the
    // wasted attempt entirely and use GitHub-raw as both primary and fallback.
    // (GitHub payloads are uncompressed, ~2-5× larger than the equivalent
    // ?only= response would be, but the trade-off beats a guaranteed 404
    // round-trip per sync.)
    wfcdSentinelsUrl:          'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Sentinels.json',
    wfcdSentinelsFallbackUrl:  'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Sentinels.json',
    wfcdPetsUrl:               'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Pets.json',
    wfcdPetsFallbackUrl:       'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Pets.json',
    wfcdRelicsUrl:             'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Relics.json',
    wfcdRelicsFallbackUrl:     'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Relics.json',
    wfcdResourcesUrl:          'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Resources.json',
    wfcdResourcesFallbackUrl:  'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Resources.json',
    wfcdGearUrl:               'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Gear.json',
    wfcdGearFallbackUrl:       'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Gear.json',

    // Arcanes — api endpoint shape didn't match WfcdArcane (parser dropped
    // all 51 rows). GitHub-raw lines up cleanly with our shape.
    wfcdArcanesUrl:            'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arcanes.json',
    wfcdArcanesFallbackUrl:    'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arcanes.json',

    // Misc — Orokin Cell, Argon Crystal, Neural Sensors, Forma, etc.
    // Not exposed by api.warframestat.us as a dedicated endpoint, so both
    // primary and fallback point at the GitHub raw file. Same data,
    // different host = better than no failover at all.
    wfcdMiscUrl:               'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Misc.json',
    wfcdMiscFallbackUrl:       'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Misc.json',

    // Wiki Lua module — pre-resolved warframe passive prose. Overrides WFCD's
    // |TOKEN|-laden `passiveDescription`. Best-effort: failure → empty Map →
    // enricher falls back to WFCD value. See wikiPassives.ts for details.
    wikiWarframesDataUrl:      'https://wiki.warframe.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=Module:Warframes/data&format=json',

    kvTtlSeconds:         172_800,  // 48h — covers 24h normal cycle + buffer
    fetchTimeoutMs:       30_000,
    // Maximum simultaneous per-category fetches. Cloudflare Workers cap at
    // 6 concurrent subrequests during scheduled events; we run 4 at a time
    // and Promise.all the result.
    concurrency:          4,
  },

  maxStalenessMinutes:             60,
  fallbackStalenessWarningMinutes: 30,
} as const;
