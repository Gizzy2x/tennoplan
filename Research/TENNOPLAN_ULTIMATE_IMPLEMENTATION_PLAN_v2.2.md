# TENNOPLAN — ULTIMATE IMPLEMENTATION PLAN
**Version 2.2** | **KV-First Architecture** | **April 29, 2026**
**Status: ✅ Ready for Claude Opus** | **Reviewed by: Grok (xAI)**

---

## EXECUTIVE SUMMARY

Tennoplan currently has a working Phase 1 (lite) system that polls worldstate and caches it locally. The goal of this overhaul is to **rebuild the backend into a self-sustaining, independent data service** — one that no longer depends on warframestat.us and serves every frontend section from a unified, reliable data layer.

The architecture prioritizes **reliability and graceful degradation above all else.** Tennoplan should almost never show broken or empty sections. When external sources fail, we fall back to cached data and estimated cycle timers with clear status indicators — never a blank screen.

**What changes:**
- Both Worldstate and Codex stored in Cloudflare KV as JSON blobs (simple, fast, proven)
- Unified `TennoplanItem` model replaces the fragmented build-time items-map.json
- Worker runs scheduled background jobs — self-updating with zero user traffic needed
- Frontend services rewritten to consume the new Worker API cleanly
- Dexie upgraded to v5 with a unified schema

**What stays:**
- React 19 + Vite + TypeScript + Tailwind frontend
- Cloudflare Worker infrastructure
- Zustand stores, existing UI sections

---

## PART 0: CORE PRINCIPLES

Every decision in this implementation flows from these principles. When something isn't covered by the spec, use these to decide.

- **Simplicity First** — Prefer simple, reliable solutions over clever or premature optimization.
- **KV-First** — Both Worldstate and Codex are JSON blobs in KV. No D1 until metrics demand it.
- **Reliability Over Perfection** — Graceful degradation and cycle math fallbacks are core features, not edge cases.
- **Single Source of Truth** — One `TennoplanItem` model powers every frontend section.
- **Frontend Confidence** — The data layer must be stable enough that frontend development never blocks on data issues.
- **Maintainability** — Code must be easy to debug and update when Digital Extremes ships major patches.

---

## PART 1: CURRENT STATE

### What You Have

**Frontend:**
- React 19 + Vite + TypeScript
- Dexie v4 (9 tables, fragmented schema)
- SyncService.ts → polls warframestat.us every 60s
- items-map.json → ~8k items baked at build time (1MB+, stale between patches)
- Zustand stores, mock data in fixtures.ts

**Backend:**
- Cloudflare Worker (wrangler.jsonc)
- Single KV namespace (WORLDSTATE)
- Simple polling + cache proxy model

**Strengths:**
✅ Worldstate polling with ETag support
✅ Visibility-aware polling (pauses on hidden tab)
✅ LocalStorage cold-start seed
✅ Working Dexie schema with indexes
✅ Clear SyncService / DropDataService separation

**Weaknesses:**
❌ items-map.json baked at build time — goes stale on patches
❌ Drop data requires manual refresh
❌ No unified item model (items and drops are separate tables)
❌ Direct dependency on warframestat.us — unreliable
❌ No normalization pipeline in the Worker
❌ Dexie v4, needs v5 upgrade

---

## PART 2: TARGET ARCHITECTURE

### System Overview (KV-First)

```
┌─────────────────────────────────────────────────┐
│       EXTERNAL SOURCES  (background only)       │
│                                                 │
│  api.warframe.com/cdn/worldState.php  [primary] │
│  calamity-inc/warframe-public-export-plus       │
│  drops.warframestat.us/data/all.json  [WFCD]    │
│  warframestat.us                  [last resort] │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│        CLOUDFLARE WORKER  (Tennoplan Core)      │
│                                                 │
│  Scheduled Jobs:                                │
│    • Worldstate Updater  → every 1 min          │
│    • Codex Updater       → every 6 hours        │
│                                                 │
│  Public API:                                    │
│    • GET /v1/worldstate  (ETag supported)       │
│    • GET /v1/codex       (ETag supported)       │
│    • GET /v1/health                             │
│                                                 │
│  Storage: Cloudflare KV                         │
│    • worldstate:current / previous / metadata   │
│    • codex:current / previous / metadata        │
└─────────────────────────────────────────────────┘
                        ↓  (frontend talks only to Worker)
┌─────────────────────────────────────────────────┐
│        TENNOPLAN FRONTEND  (React + Vite)       │
│                                                 │
│  Services:                                      │
│    • SyncService 2.0       (worldstate)         │
│    • StaticDataService     (Codex)              │
│    • RecommendationEngine  (smart farming)      │
│                                                 │
│  Stores (Zustand):                              │
│    • HeartbeatStore  (live / cached / offline)  │
│    • DataStore       (unified item cache)       │
│    • ProgressionStore (mastery tracking)        │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│         DEXIE v5  (Client Local Storage)        │
│                                                 │
│  • items          → TennoplanItem[]             │
│  • worldstate     → ParsedWorldstate snapshot   │
│  • syncMetadata   → version, ETag, timestamps   │
│  • progression    → mastery, owned items        │
│  • userMarks      → notes, favorites            │
│  • settings       → user preferences            │
│  • cache          → ephemeral data              │
└─────────────────────────────────────────────────┘
```

### Key Decisions

**KV as primary storage (both Worldstate and Codex)**
Simple, fast, and well within limits. The full Codex (~8k items) is ~2-3MB as JSON — KV's 25MB limit is not a concern. We get atomic updates, trivial ETags, and easy rollback with `current` + `previous` keys. D1 is deferred until we actually need relational queries.

**Single Codex blob**
One `codex:current` key holds the full `TennoplanItem[]` array. One ETag, one atomic write, one read. Chunking adds complexity with no real benefit at this data size.

**calamity-inc as primary Codex source**
The most complete enriched Warframe dataset available. Fills gaps in official Public Export, actively maintained, and avoids the need to handle LZMA decompression manually. Official Public Export is the fallback if calamity-inc is unavailable.

**Graceful degradation as a core feature**
The Worker always serves the last good data. The fallback module uses cycle timer math to advance predictable cycles when the official API is unreachable. Users see estimated timers with a status badge — not a broken section.

---

## PART 3: DATA MODELS

### 3.1 TennoplanItem (Central Contract)

This is the single normalized model for every item in Tennoplan. It powers Celestial Pendulum, Void Reliquaries, Ascension Registry, and all future sections.

```typescript
/**
 * Single source of truth for all Warframe items.
 * Primary Key: uniqueName (stable across patches)
 * Storage:     KV codex:current → TennoplanItem[]
 * Client:      Dexie items table, indexed by category / masteryRank / vaulted
 */
export interface TennoplanItem {
  // ── IDENTITY ──────────────────────────────────────────────────
  uniqueName: string;           // e.g. "/Lotus/Types/Warframes/Chroma/ChromaPrime"
  name: string;                 // Display name
  category: ItemCategory;
  type?: string;                // e.g. "Assault Rifle", "Shotgun"
  subtype?: string;

  // ── VISUALS ───────────────────────────────────────────────────
  iconUrl: string;              // Pre-resolved stable CDN URL (browse.wf preferred)
  thumbUrl?: string;
  color?: string;               // Primary item color for UI theming

  // ── CLASSIFICATION ────────────────────────────────────────────
  masteryRank?: number;         // 0–30
  rarity?: 'Legendary' | 'Rare' | 'Uncommon' | 'Common';
  vaulted?: boolean;
  tradeable?: boolean;
  marketable?: boolean;         // Available on warframe.market

  // ── DROPS & FARMING ───────────────────────────────────────────
  dropLocations: DropLocation[];
  bestFarms?: BestFarmRecommendation[];   // Top 3–5, scored by efficiency
  relicRewards?: RelicReward[];           // If this IS a relic: what it drops

  // ── ITEM-SPECIFIC DATA ────────────────────────────────────────
  stats?: ItemStats;                      // Weapons / Warframe base stats
  abilities?: Ability[];                  // Warframe abilities
  polarities?: string[];
  baseDrain?: number;                     // Mod drain
  buildRequirements?: BuildRequirement[];

  // ── ECONOMY ───────────────────────────────────────────────────
  ducatValue?: number;          // Prime part ducat value
  estimatedPlat?: number;       // Rough market value (warframe.market)

  // ── USER STATE (sparse — only set when user has interacted) ───
  userState?: UserItemState;

  // ── METADATA ──────────────────────────────────────────────────
  dataVersion: string;          // Version hash for cache invalidation
  lastUpdated: number;          // Unix timestamp
  source: DataSource;           // 'calamity-plus' | 'official' | 'wfcd' | 'enriched'
  quality: DataQuality;         // 'high' | 'medium' | 'low'
}

// ── SUPPORTING TYPES ──────────────────────────────────────────────

export type ItemCategory =
  | 'Warframe' | 'Weapon' | 'Companion' | 'Arcane'
  | 'Mod' | 'Relic' | 'Resource' | 'Blueprint'
  | 'Sigil' | 'Glyph' | 'Cosmetic' | 'Ingredient'
  | 'Key' | 'Fish' | 'Sentinel' | 'Equipment';

export type DataSource = 'calamity-plus' | 'official' | 'wfcd' | 'enriched';
export type DataQuality = 'high' | 'medium' | 'low';

export interface DropLocation {
  uniqueName: string;
  location: string;             // e.g. "Void Fissure (Lith) — Hepit, Void"
  sourceName: string;           // e.g. "Void Fissure"
  missions?: string[];
  chance: number;               // 0.0–1.0
  rotation?: 'A' | 'B' | 'C';
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  isSteelPath?: boolean;
  voidFissureTier?: 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem';
  bountyTier?: 'Lv1-5' | 'Lv6-10' | 'Lv11-15' | 'Lv16-20';
  isDailyDeal?: boolean;
  cooldown?: number;            // Hours
}

export interface BestFarmRecommendation {
  location: DropLocation;
  efficiencyScore: number;      // 0–100 composite (chance × effort × cycle bonus)
  estimatedRuns: number;        // Expected runs to obtain 1
  notes?: string;               // e.g. "Active for 2h 15m" or "Available in 4h"
}

export interface RelicReward {
  item: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  chancesPerRun: {
    intact: number;
    exceptional: number;
    radiant: number;
  };
}

export interface ItemStats {
  damage?: number;
  fireRate?: number;
  critChance?: number;
  critMultiplier?: number;
  statusChance?: number;
  magazine?: number;
  reload?: number;
  [key: string]: any;           // Extensible for future stat types
}

export interface Ability {
  name: string;
  description: string;
  stats?: Record<string, number>;
}

export interface BuildRequirement {
  item: string;
  count: number;
}

export interface UserItemState {
  owned?: boolean;
  mastered?: boolean;
  count?: number;
  masteredOn?: number;          // Unix timestamp
  notes?: string;
}
```

---

### 3.2 ParsedWorldstate (Live Dynamic Data)

```typescript
export interface ParsedWorldstate {
  // ── METADATA ──────────────────────────────────────────────────
  timestamp: number;            // Unix timestamp of this worldstate
  version: number;              // DE worldstate version field

  // ── CYCLES ────────────────────────────────────────────────────
  cetusCycle: CycleInfo;
  orbVallisCycle: CycleInfo;
  cambionDriftCycle: CycleInfo;
  zarimanCycle: CycleInfo;
  duviriCycle: DuviriCycleInfo;
  earthCycle?: CycleInfo;

  // ── EVENTS ────────────────────────────────────────────────────
  fissures: Fissure[];
  alerts: Alert[];
  invasions: Invasion[];
  sortie: Sortie | null;
  archonHunt: ArchonHunt | null;
  arbitration?: ArbitrationInfo;

  // ── VENDORS & ECONOMY ─────────────────────────────────────────
  baro?: BaroInfo | null;
  flashSales?: FlashSale[];

  // ── META ──────────────────────────────────────────────────────
  nightwave?: NightwaveInfo;
  persistentEnemies?: PersistentEnemy[];
  news?: NewsItem[];

  // ── DERIVED (computed by parser) ──────────────────────────────
  cyclesRemaining: Record<string, number>;  // ms until each cycle flips
  isStale?: boolean;            // True if data is > 30 min old
  fallbackSource?: boolean;     // True if served from fallback / cycle math
}

export interface CycleInfo {
  activation: number;           // Unix timestamp when cycle started
  expiry: number;               // Unix timestamp when it ends
  timeLeft: number;             // ms until flip
  isDay?: boolean;              // For day/night cycles
  isWarm?: boolean;             // For Orb Vallis warm/cold
  state?: string;               // "Fass" | "Vome" (Cambion Drift)
}

export interface DuviriCycleInfo extends CycleInfo {
  mood: 'Joy' | 'Anger' | 'Fear' | 'Envy' | 'Sorrow';
  moodTimeLeft: number;
}

export interface Fissure {
  id: string;
  node: string;
  missionType: string;
  tier: 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem';
  enemy: string;
  expiry: number;
  isHard?: boolean;
}

export interface Alert {
  id: string;
  node: string;
  missionType: string;
  level: string;
  expiry: number;
  reward?: string;
  description?: string;
}

export interface Invasion {
  id: string;
  node: string;
  attacking: string;
  defending: string;
  attackerReward?: string;
  defenderReward?: string;
  progress: number;             // 0–100 (%)
  expiry: number;
  vsInfestation?: boolean;
}

export interface Sortie {
  id: string;
  missionTypes: string[];
  modifiers: string[];
  expiry: number;
  rewards: string[];
}

export interface ArchonHunt {
  id: string;
  missions: SortieNode[];
  expiry: number;
}

export interface BaroInfo {
  id: string;
  name: string;
  presence: 'at_location' | 'in_transit';
  arrivalTime?: number;
  departureTime?: number;
  location?: string;
  inventory?: BaroItem[];
}

export interface BaroItem {
  name: string;
  ducats: number;
  credits: number;
}

export interface NightwaveInfo {
  season: number;
  tier: number;
  expiry: number;
  challenges: NightwaveChallenge[];
}

export interface NightwaveChallenge {
  id: string;
  title: string;
  description: string;
  reputation: number;
  daily: boolean;
  expiry: number;
  isHard?: boolean;
}

export interface ArbitrationInfo {
  node: string;
  missionType: string;
  enemy: string;
  modifier: string;
  expiry: number;
}

export interface PersistentEnemy {
  name: string;
  location: string;
  level?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  date: number;
}

export interface FlashSale {
  item: string;
  discount: number;             // 0–100 (%)
  expiry: number;
}
```

---

### 3.3 API Response Wrapper

All Worker endpoints return this shape. No exceptions.

```typescript
export type ApiResponse<T = any> =
  | { success: true;  data: T; metadata?: ResponseMetadata }
  | { success: false; error: string; code?: ErrorCode; message?: string };

export interface ResponseMetadata {
  source: DataSource;           // Where did this data originate?
  ageSeconds: number;           // How old is it?
  version?: string;             // Data version hash
  timestamp: number;            // When was this response generated?
  itemCount?: number;           // Codex only: number of items returned
}

export enum ErrorCode {
  STALE_DATA        = 'STALE_DATA',
  FETCH_FAILED      = 'FETCH_FAILED',
  CODEX_UNAVAILABLE = 'CODEX_UNAVAILABLE',
  OFFLINE           = 'OFFLINE',
  PARSE_ERROR       = 'PARSE_ERROR',
  INVALID_REQUEST   = 'INVALID_REQUEST',
}
```

---

## PART 4: STORAGE STRATEGY (KV-FIRST)

### KV Key Layout

Both Worldstate and Codex are stored as JSON blobs. One KV namespace (`TENNOPLAN_KV`) handles everything.

| Key | Contents | Approx Size | Updated |
|-----|----------|-------------|---------|
| `worldstate:current` | ParsedWorldstate (JSON) | ~150KB | Every 1 min |
| `worldstate:previous` | Previous snapshot (rollback) | ~150KB | On each new sync |
| `worldstate:metadata` | `{ lastSync, etag, version, source, quality, errorCount }` | < 1KB | On each sync |
| `codex:current` | Full `TennoplanItem[]` (JSON) | ~2–3MB | Every 6 hours |
| `codex:previous` | Previous Codex (rollback) | ~2–3MB | On each new sync |
| `codex:metadata` | `{ lastSync, etag, version, itemCount, source, quality, errorCount }` | < 1KB | On each sync |

**Why this works:** KV values support up to 25MB. The Codex at ~3MB is well within limits. Atomic writes to `current` + `previous` provide instant rollback. ETags are SHA-256 hashes of the blob content — simple and deterministic.

### Metadata Interface

```typescript
// Stored at worldstate:metadata and codex:metadata respectively
interface SyncMetadata {
  lastSync: number;             // Unix timestamp of last successful sync
  etag: string;                 // SHA-256 of current blob (used for ETag header)
  version: string;              // Version identifier from source
  source: DataSource;
  quality: DataQuality;
  errorCount: number;           // Consecutive failures since last success
  lastError?: string;           // Last error message (for debugging)
  itemCount?: number;           // Codex only
}
```

### When to Migrate to D1

D1 is not part of this implementation. Revisit only if these conditions are met:
- Codex data size grows beyond 5MB
- Frontend needs complex relational queries not feasible in memory
- Incremental item updates are required (not full-blob replacement)

KV is the right tool for this stage. There is no pressure to migrate.

---

## PART 5: WORKER ARCHITECTURE

### File Structure

```
worker/
├── src/
│   ├── index.ts                    # Entry point: fetch() + scheduled()
│   ├── config.ts                   # URLs, timeouts, KV keys, cron constants
│   ├── types.ts                    # Env interface + re-exports from shared types
│   ├── logger.ts                   # Structured logging (info / warn / error)
│   │
│   ├── api/
│   │   ├── routes.ts               # URL → handler routing
│   │   └── handlers/
│   │       ├── worldstate.ts       # GET /v1/worldstate
│   │       ├── codex.ts            # GET /v1/codex
│   │       └── health.ts           # GET /v1/health
│   │
│   ├── worldstate/
│   │   ├── updater.ts              # Scheduled update orchestration
│   │   ├── parser.ts               # warframe-worldstate-parser wrapper
│   │   └── fallback.ts             # Cycle math + stale cache serving
│   │
│   ├── codex/
│   │   ├── updater.ts              # Pipeline orchestration
│   │   ├── fetcher.ts              # calamity-inc + WFCD fetch
│   │   ├── parser.ts               # JSON parsing + lookup maps
│   │   ├── merger.ts               # Merge drops, recipes, ducat values
│   │   ├── enricher.ts             # bestFarms, icon URLs, vaulted detection
│   │   ├── normalizer.ts           # Raw data → TennoplanItem
│   │   └── validator.ts            # Quality scoring + validation
│   │
│   ├── storage/
│   │   ├── kv.ts                   # KV read/write helpers
│   │   └── metadata.ts             # ETag + version management
│   │
│   ├── utils/
│   │   ├── http.ts                 # Fetch with retry, timeout, ETag
│   │   ├── result.ts               # Result<T, E> pattern
│   │   └── date.ts                 # Cycle timer math helpers
│   │
│   └── middleware/
│       └── cors.ts                 # CORS headers
│
├── wrangler.jsonc
├── package.json
└── tsconfig.json
```

### wrangler.jsonc

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "web",
  "main": "src/index.ts",
  "compatibility_date": "2026-04-29",
  "compatibility_flags": ["nodejs_compat"],

  "observability": { "enabled": true },

  "assets": {
    "not_found_handling": "single-page-application"
  },

  "kv_namespaces": [
    {
      "binding": "TENNOPLAN_KV",
      "id": "YOUR_KV_NAMESPACE_ID"    // Replace after creating KV namespace
    }
  ],

  "triggers": {
    "crons": [
      "*/1 * * * *",     // Every minute  → worldstate updater
      "0 */6 * * *"      // Every 6 hours → codex updater
    ]
  },

  "vars": {
    "LOG_LEVEL": "info",
    "MAX_STALENESS_MINUTES": "60",
    "FALLBACK_STALENESS_WARNING": "30"
  }
}
```

### index.ts (Pseudocode)

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/v1/worldstate')) return handleWorldstate(request, env);
    if (pathname.startsWith('/v1/codex'))      return handleCodex(request, env);
    if (pathname === '/v1/health')             return handleHealth(request, env);

    return new Response(
      JSON.stringify({ success: false, error: 'Not Found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Every cron tick: update worldstate
    await updateWorldstate(env);

    // Every 6-hour tick: update Codex (non-blocking)
    const h = new Date().getHours();
    if (new Date().getMinutes() === 0 && h % 6 === 0) {
      ctx.waitUntil(updateCodex(env));
    }
  }
};
```

---

## PART 6: FRONTEND CONTRACT

### API Endpoints

**`GET /v1/worldstate`**
```
Request headers:   If-None-Match: <stored-etag>

200 Response:
  {
    "success": true,
    "data": ParsedWorldstate,
    "metadata": {
      "source": "official" | "cached" | "fallback",
      "ageSeconds": 45,
      "version": "2026042901",
      "timestamp": 1714467000000
    }
  }

304 Not Modified:  (use cached Dexie data)

Response headers:
  ETag:              "<sha256>"
  X-Data-Source:     official | cached | fallback
  X-Data-Age:        45
  Cache-Control:     public, max-age=60
```

**`GET /v1/codex`**
```
Request headers:   If-None-Match: <stored-etag>

200 Response:
  {
    "success": true,
    "data": TennoplanItem[],
    "metadata": {
      "source": "calamity-plus",
      "ageSeconds": 21600,
      "version": "calamity-20260429",
      "timestamp": 1714467000000,
      "itemCount": 8247
    }
  }

304 Not Modified:  (use cached Dexie data)

Response headers:
  ETag:              "<sha256>"
  X-Data-Source:     calamity-plus
  X-Data-Age:        21600
  Cache-Control:     public, max-age=21600
```

**`GET /v1/health`**
```
200 Response:
  {
    "success": true,
    "data": {
      "status": "healthy" | "degraded" | "error",
      "worldstate": { "lastSync": 1714467045000, "age": 45, "quality": "high", "source": "official" },
      "codex":      { "lastSync": 1714466400000, "age": 21600, "quality": "high", "itemCount": 8247 }
    }
  }
```

### SyncService 2.0 (Rewritten)

```typescript
export const SyncService = {
  init(): void;                              // Start polling engine (call once in AppShell)
  async sync(force?: boolean): Promise<ParsedWorldstate | null>;
  destroy(): void;
  requestPassiveSync(): void;               // Throttled — safe to call frequently
};
```

**Dexie writes on sync:**
- `db.worldstate.put({ key: 'current', data, timestamp })`
- `db.syncMetadata.put({ id: 'worldstate', lastSync, etag, version, quality })`

**HeartbeatStore status values:** `live` | `cached` | `stale` | `offline`

### StaticDataService (New)

```typescript
export const StaticDataService = {
  async init(): Promise<void>;                                    // Sync on startup if stale
  async refreshCodex(onProgress?: (pct: number) => void): Promise<void>;
  async findItems(query: ItemQuery): Promise<TennoplanItem[]>;
  async getItem(uniqueName: string): Promise<TennoplanItem | null>;
  async getCodexStatus(): Promise<{ isStale: boolean; ageMinutes: number; itemCount: number }>;
};

interface ItemQuery {
  category?: ItemCategory;
  search?: string;
  masteryRank?: number;
  vaulted?: boolean;
  limit?: number;
  offset?: number;
}
```

**Dexie writes on sync (transactional — all-or-nothing):**
- `db.items.clear()` then `db.items.bulkAdd(items)`
- `db.syncMetadata.put({ id: 'codex', lastSync, etag, version, itemCount })`

If the transaction fails, the previous Codex in Dexie is preserved.

---

## PART 7: DEXIE v5 SCHEMA

### db.ts

```typescript
import Dexie, { type Table } from 'dexie';

export class TennoplanDB extends Dexie {
  // ── CORE DATA ────────────────────────────────────────────────
  items!:       Table<TennoplanItem, string>;
  worldstate!:  Table<{ key: string; data: ParsedWorldstate; timestamp: number }, string>;

  // ── SYNC METADATA ────────────────────────────────────────────
  syncMetadata!: Table<{
    id: string;              // 'worldstate' | 'codex'
    lastSync: number;
    etag: string;
    version: string;
    quality: DataQuality;
    errorCount: number;
    itemCount?: number;
  }, string>;

  // ── USER DATA ────────────────────────────────────────────────
  progression!: Table<UserProgression, string>;
  userMarks!:   Table<UserMark, number>;
  settings!:    Table<Setting, string>;

  // ── EPHEMERAL ────────────────────────────────────────────────
  cache!: Table<CacheEntry, string>;

  constructor() {
    super('tennoplan');

    this.version(5).stores({
      items:        'uniqueName, category, masteryRank, vaulted',
      worldstate:   'key',
      syncMetadata: 'id',
      progression:  'uniqueName',
      userMarks:    '++id, type, referenceId, [type+referenceId]',
      settings:     'key',
      cache:        'key, expiresAt',
    });
  }
}

export const db = new TennoplanDB();
```

**Supporting interfaces:**

```typescript
export interface UserProgression {
  uniqueName: string;
  owned: boolean;
  mastered: boolean;
  count?: number;
  masteredOn?: number;
  notes?: string;
}

export interface UserMark {
  id?: number;
  type: string;
  referenceId: string;
  status: string;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface CacheEntry {
  key: string;
  data: unknown;
  expiresAt: number;
  updatedAt: number;
}
```

---

## PART 8: GRACEFUL DEGRADATION

This is not optional. These scenarios must be handled before any feature is considered complete.

### Worldstate Fetch Fails

1. Serve the last successful snapshot from KV (`worldstate:previous`)
2. Apply cycle timer math to advance all predictable cycles (Cetus, Orb Vallis, Cambion Drift, Zariman, Duviri, Earth)
3. Set `fallbackSource: true` and `isStale: true` on the response
4. Frontend shows: **"Estimated timers — last live update: X min ago"**
5. Non-predictable data (fissures, alerts, invasions) is preserved from the last snapshot and shown with a staleness indicator

### Codex Updater Fails

1. Continue serving the last successful Codex from KV (`codex:previous`)
2. Increment `errorCount` in metadata
3. After 3 consecutive failures, log a developer-visible warning in the health endpoint
4. Frontend shows a subtle **"Codex data may be outdated"** banner
5. Never overwrite `codex:current` with empty or invalid data

### Client Is Offline

1. SyncService reads from Dexie (`worldstate` table)
2. StaticDataService reads from Dexie (`items` table)
3. HeartbeatStore status: `offline`
4. All data shown with timestamp of last sync
5. No sections go blank — show last known state

### Rule: Never Overwrite Good Data With Bad

The Worker must check that a new sync result is valid and non-empty before writing to KV. If a fetch or parse step fails, the current KV value is left untouched.

---

## PART 9: IMPLEMENTATION ROADMAP

### Phase A — Worker Foundation (Week 1)
**Goal:** Worker deployed, health endpoint live

1. Create `worker/` folder and file structure
2. Set up `wrangler.jsonc` with KV binding
3. Implement `src/index.ts`, `config.ts`, `types.ts`, `logger.ts`
4. Implement `src/storage/kv.ts` (read/write helpers)
5. Implement `GET /v1/health`
6. Test locally with `wrangler dev`

✅ **Deliverable:** Worker deploys, `/v1/health` returns status

---

### Phase B — Worldstate (Week 1–2)
**Goal:** Reliable live data, independent of warframestat.us

1. Implement `src/worldstate/updater.ts`
2. Implement `src/worldstate/parser.ts` (warframe-worldstate-parser wrapper)
3. Implement `src/worldstate/fallback.ts` (cycle math)
4. Implement `src/api/handlers/worldstate.ts` (ETag support)
5. Activate 1-minute cron job
6. Test: ETag 304 behavior, fallback cycle math, official API failure scenario

✅ **Deliverable:** `/v1/worldstate` returns live data with working fallback

---

### Phase C — Codex Pipeline (Week 2–3)
**Goal:** Self-updating Codex from calamity-inc, stored in KV

1. Implement pipeline in order:
   - `src/codex/fetcher.ts` — fetch calamity-inc + WFCD
   - `src/codex/parser.ts` — parse JSON, build lookup maps
   - `src/codex/merger.ts` — merge drops, recipes, ducat values
   - `src/codex/enricher.ts` — compute bestFarms, resolve icons
   - `src/codex/normalizer.ts` — raw data → TennoplanItem
   - `src/codex/validator.ts` — validate and quality-score
   - `src/codex/updater.ts` — orchestrate full pipeline
2. Implement `src/api/handlers/codex.ts` (ETag support)
3. Activate 6-hour cron job
4. Test with real calamity-inc data
5. Verify TennoplanItem output shape

✅ **Deliverable:** `/v1/codex` returns 8k+ items with drops, ducat values, best farms

---

### Phase D — Frontend Integration (Week 3–4)
**Goal:** Frontend fully connected to new Worker

1. Upgrade Dexie to v5, run migration
2. Rewrite `SyncService.ts` (new endpoints, new response shape)
3. Create `StaticDataService.ts`
4. Update `HeartbeatStore` (new status signals)
5. Update Celestial Pendulum, Void Reliquaries, Solar Rail Feed to use unified items
6. Test offline scenarios, stale data banners, 304 caching

✅ **Deliverable:** All sections working with live data from new Worker

---

### Phase E — Polish & Monitoring (Week 4)
**Goal:** Production-ready, observable, maintainable

1. Structured logging across all Worker modules
2. Cloudflare Logs integration
3. Health endpoint shows error counts and sync ages
4. Update API documentation
5. Write maintenance playbook
6. Staging test → production deploy

✅ **Deliverable:** Tennoplan running fully independently, monitoring in place

---

## PART 10: EXTERNAL DATA SOURCES REFERENCE

| Source | Purpose | Frequency | Fallback |
|--------|---------|-----------|----------|
| `api.warframe.com/cdn/worldState.php` | Live worldstate | Every 1 min | KV cache + cycle math |
| `calamity-inc/warframe-public-export-plus` | Codex items | Every 6 hours | Official Public Export |
| `drops.warframestat.us/data/all.json` | Drop tables | Every 6 hours | WFCD GitHub raw |
| `warframestat.us/pc/` | Worldstate backup | Fallback only | KV cache |

---

## FINAL CHECKLIST — BEFORE CLAUDE OPUS STARTS

- ✅ TennoplanItem schema finalized
- ✅ ParsedWorldstate schema finalized
- ✅ ApiResponse wrapper finalized
- ✅ KV-first strategy locked (Worldstate + Codex as JSON blobs)
- ✅ Single `codex:current` blob (no chunking)
- ✅ Worker file structure defined
- ✅ wrangler.jsonc template provided
- ✅ All three API endpoints specified with full request/response shapes
- ✅ Dexie v5 schema approved
- ✅ SyncService 2.0 contract defined
- ✅ StaticDataService contract defined
- ✅ Graceful degradation scenarios specified
- ✅ Phase A → E roadmap with deliverables
- ✅ D1 deferred (metrics-driven, no timeline pressure)

---

## HOW TO USE THIS DOCUMENT

**For Claude Opus:** This is your implementation spec. Every architectural decision is recorded here. When the spec doesn't cover something, apply the Core Principles from Part 0. Do not introduce new dependencies or storage layers without updating this document first.

**For Micheal:** This is your implementation contract. Review it before starting each phase. If you decide to change direction, update the document first — then implement.

---

**Document Owner:** Micheal Warren
**Spec Version:** 2.2 — Final Pre-Implementation
**Reviewed by:** Grok (xAI) + Claude (Anthropic)
**Status:** ✅ Ready for Claude Opus Implementation
**Target:** Weekend implementation (Fri–Sun)
