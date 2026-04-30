// ─── Worker environment ────────────────────────────────────────────────────────

export interface Env {
  TENNOPLAN_KV: KVNamespace;
  LOG_LEVEL?:                  string;
  MAX_STALENESS_MINUTES?:      string;
  FALLBACK_STALENESS_WARNING?: string;
}

// ─── Data source / quality ─────────────────────────────────────────────────────

export type DataSource =
  | 'calamity-plus'
  | 'official'
  | 'wfcd'
  | 'enriched'
  | 'warframestat'
  | 'cached'
  | 'fallback';

export type DataQuality = 'high' | 'medium' | 'low';

// ─── Stored sync metadata (KV) ─────────────────────────────────────────────────

export interface SyncMetadata {
  lastSync:    number;         // Unix ms of last successful sync
  etag:        string;         // SHA-256 of current blob (ETag header value)
  version:     string;         // e.g. "official-20260430"
  source:      DataSource;
  quality:     DataQuality;
  errorCount:  number;         // consecutive failures since last success
  lastError?:  string;
  itemCount?:  number;         // Codex only
}

// ─── API response wrapper ──────────────────────────────────────────────────────

export interface ResponseMetadata {
  source:      DataSource;
  ageSeconds:  number;
  version?:    string;
  timestamp:   number;
  itemCount?:  number;
}

export type ApiResponse<T = unknown> =
  | { success: true;  data: T; metadata?: ResponseMetadata }
  | { success: false; error: string; code?: ErrorCode; message?: string };

export enum ErrorCode {
  STALE_DATA         = 'STALE_DATA',
  FETCH_FAILED       = 'FETCH_FAILED',
  CODEX_UNAVAILABLE  = 'CODEX_UNAVAILABLE',
  OFFLINE            = 'OFFLINE',
  PARSE_ERROR        = 'PARSE_ERROR',
  INVALID_REQUEST    = 'INVALID_REQUEST',
}

// ─── ParsedWorldstate (canonical shape served by /v1/worldstate) ───────────────

export interface ParsedWorldstate {
  // Metadata
  timestamp:    number;        // Unix ms when this worldstate was generated
  version:      number;        // DE worldstate version field

  // Cycles
  cetusCycle:        CycleInfo;
  orbVallisCycle:    CycleInfo;
  cambionDriftCycle: CycleInfo;
  zarimanCycle:      CycleInfo;
  duviriCycle:       DuviriCycleInfo;
  earthCycle?:       CycleInfo;

  // Events
  fissures:    Fissure[];
  alerts:      Alert[];
  invasions:   Invasion[];
  sortie:      Sortie | null;
  archonHunt:  ArchonHunt | null;
  arbitration?: ArbitrationInfo;

  // Vendors & economy
  baro?:       BaroInfo | null;
  flashSales?: FlashSale[];

  // Meta
  nightwave?:         NightwaveInfo;
  persistentEnemies?: PersistentEnemy[];
  news?:              NewsItem[];

  // Derived (computed at parse time)
  cyclesRemaining: Record<string, number>;   // ms until each cycle flips
  isStale?:        boolean;                  // true if data > 30 min old
  fallbackSource?: boolean;                  // true if served via cycle math
}

export interface CycleInfo {
  activation: number;          // Unix ms when cycle started
  expiry:     number;          // Unix ms when it ends
  timeLeft:   number;          // ms until flip
  isDay?:     boolean;         // for day/night cycles
  isWarm?:    boolean;         // for Orb Vallis
  isCorpus?:  boolean;         // for Zariman (else grineer)
  state?:     string;          // 'fass' | 'vome' | 'day' | 'night' | 'warm' | 'cold' | 'grineer' | 'corpus'
}

export interface DuviriCycleInfo extends CycleInfo {
  mood?:         'Joy' | 'Anger' | 'Fear' | 'Envy' | 'Sorrow';
  moodTimeLeft?: number;
}

export interface Fissure {
  id:            string;
  node:          string;
  missionType:   string;
  tier:          'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem' | 'Omnia';
  enemy:         string;
  expiry:        number;
  isHard?:       boolean;
  isStorm?:      boolean;
}

export interface Alert {
  id:           string;
  node:         string;
  missionType:  string;
  level:        string;
  expiry:       number;
  reward?:      string;
  description?: string;
}

export interface Invasion {
  id:               string;
  node:             string;
  attacking:        string;
  defending:        string;
  attackerReward?:  string;
  defenderReward?:  string;
  progress:         number;     // 0–100 (%)
  expiry?:          number;
  vsInfestation?:   boolean;
  completed?:       boolean;
}

export interface Sortie {
  id:           string;
  missionTypes: string[];
  modifiers:    string[];
  expiry:       number;
  rewards:      string[];
  faction?:     string;
}

export interface ArchonHunt {
  id:        string;
  missions:  ArchonMission[];
  expiry:    number;
  boss?:     string;
  faction?:  string;
}

export interface ArchonMission {
  node:        string;
  missionType: string;
  modifier?:   string;
}

export interface ArbitrationInfo {
  node:         string;
  missionType:  string;
  enemy:        string;
  modifier?:    string;
  expiry:       number;
}

export interface BaroInfo {
  id:             string;
  name:           string;
  presence:       'at_location' | 'in_transit';
  arrivalTime?:   number;
  departureTime?: number;
  location?:      string;
  inventory?:     BaroItem[];
}

export interface BaroItem {
  name:    string;
  ducats:  number;
  credits: number;
}

export interface FlashSale {
  item:     string;
  discount: number;             // 0–100 (%)
  expiry:   number;
}

export interface NightwaveInfo {
  season:     number;
  tier:       number;
  expiry:     number;
  challenges: NightwaveChallenge[];
}

export interface NightwaveChallenge {
  id:          string;
  title:       string;
  description: string;
  reputation:  number;
  daily:       boolean;
  expiry:      number;
  isHard?:     boolean;
  isElite?:    boolean;
}

export interface PersistentEnemy {
  name:     string;
  location: string;
  level?:   number;
}

export interface NewsItem {
  id:           string;
  title:        string;
  description?: string;
  url?:         string;
  date:         number;
}
