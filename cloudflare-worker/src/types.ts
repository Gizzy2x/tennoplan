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

  // Open-world bounty rotations + Sanctuary + Netracell
  syndicateMissions?: SyndicateMissionInfo[];
  simaris?:           SimarisInfo;
  archimedeas?:       ArchimedeaInfo[];

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

// ─── Bounty rotations (Cetus / Fortuna / Necralisk / Zariman) ──────────────────

export interface SyndicateMissionInfo {
  id:        string;
  /** Canonical syndicate label, e.g. "Ostron" / "Solaris United" / "Entrati" / "The Holdfasts". */
  syndicate: string;
  /** Unix ms when these jobs rotate. */
  expiry:    number;
  jobs:      SyndicateJob[];
}

export interface SyndicateJob {
  /** Display label of the bounty type, e.g. "Bounty Lv5-15". */
  type:           string;
  /** [min, max] enemy level for this tier. */
  enemyLevels:    [number, number];
  /** Standing rewarded per stage of the bounty. */
  standingStages: number[];
  /** Possible reward strings per stage; absent when the upstream parser fails. */
  rewardPool?:    string[];
}

// ─── Sanctuary (Cephalon Simaris) ──────────────────────────────────────────────

export interface SimarisInfo {
  /** Active synthesis target — null when between rotations. */
  activeSynthesisTarget: SimarisTarget | null;
}

export interface SimarisTarget {
  name:       string;
  type:       string;
  isArchwing: boolean;
  isBoss:     boolean;
}

// ─── Deep Archimedea (weekly Netracell content) ────────────────────────────────

export interface ArchimedeaInfo {
  id?:                string;
  /** Unix ms when the rotation began. */
  activation?:        number;
  /** Unix ms when the rotation ends. */
  expiry:             number;
  /** Free-form rotation tag (e.g. "deep" / "elite"). */
  type?:              string;
  missions:           ArchimedeaMissionInfo[];
  personalModifiers?: ArchimedeaModifierInfo[];
}

export interface ArchimedeaMissionInfo {
  faction:         string;
  factionKey?:     string;
  missionType:     string;
  missionTypeKey?: string;
  deviation?:      ArchimedeaModifierInfo;
  risks:           ArchimedeaModifierInfo[];
}

export interface ArchimedeaModifierInfo {
  key:         string;
  name:        string;
  description: string;
  isHard?:     boolean;
}

// ─── TennoplanItem (canonical shape served by /v1/codex) ───────────────────────
// Single source of truth for all Warframe items in Tennoplan.
// Primary key: uniqueName. Storage: codex:current → TennoplanItem[].

export type ItemCategory =
  | 'Warframe'
  | 'Weapon'
  | 'Companion'
  | 'Sentinel'
  | 'Arcane'
  | 'Mod'
  | 'Relic'
  | 'Resource'
  | 'Blueprint'
  | 'Sigil'
  | 'Glyph'
  | 'Cosmetic'
  | 'Ingredient'
  | 'Key'
  | 'Fish'
  | 'Equipment';

export type ItemRarity = 'Legendary' | 'Rare' | 'Uncommon' | 'Common';

export type RelicTier = 'Lith' | 'Meso' | 'Neo' | 'Axi' | 'Requiem' | 'Omnia';

export type Rotation = 'A' | 'B' | 'C';

export type BountyTier =
  | 'Lv1-5'
  | 'Lv6-10'
  | 'Lv11-15'
  | 'Lv16-20'
  | 'Lv21-25'
  | 'Lv26-30'
  | 'Lv31-40'
  | 'Lv41-50';

export interface TennoplanItem {
  // ── Identity ────────────────────────────────────────────────
  uniqueName:    string;
  name:          string;
  category:      ItemCategory;
  type?:         string;
  subtype?:      string;

  // ── Visuals ─────────────────────────────────────────────────
  iconUrl:       string;
  thumbUrl?:     string;
  color?:        string;

  // ── Classification ──────────────────────────────────────────
  masteryRank?:  number;
  rarity?:       ItemRarity;
  vaulted?:      boolean;
  tradeable?:    boolean;
  marketable?:   boolean;

  // ── Drops & farming ─────────────────────────────────────────
  dropLocations: DropLocation[];
  bestFarms?:    BestFarmRecommendation[];
  relicRewards?: RelicReward[];

  // ── Item-specific data ──────────────────────────────────────
  stats?:             ItemStats;
  abilities?:         Ability[];
  polarities?:        string[];
  baseDrain?:         number;
  buildRequirements?: BuildRequirement[];

  // ── Economy ─────────────────────────────────────────────────
  ducatValue?:    number;
  estimatedPlat?: number;

  // ── User state (only set after user interaction) ────────────
  userState?: UserItemState;

  // ── Metadata ────────────────────────────────────────────────
  dataVersion:  string;
  lastUpdated:  number;
  source:       DataSource;
  quality:      DataQuality;
}

export interface DropLocation {
  uniqueName:        string;     // parent item this drop belongs to
  location:          string;     // e.g. "Void Fissure (Lith) — Hepit, Void"
  sourceName:        string;     // e.g. "Void Fissure" | "Mission" | "Bounty"
  missions?:         string[];
  chance:            number;     // 0.0–1.0
  rotation?:         Rotation;
  rarity?:           ItemRarity;
  isSteelPath?:      boolean;
  voidFissureTier?:  RelicTier;
  bountyTier?:       BountyTier;
  isDailyDeal?:      boolean;
  cooldown?:         number;     // hours
}

export interface BestFarmRecommendation {
  location:         DropLocation;
  efficiencyScore:  number;      // 0–100 composite (chance × effort × cycle bonus)
  estimatedRuns:    number;      // expected runs to obtain 1
  notes?:           string;
}

export interface RelicReward {
  item:    string;
  rarity:  ItemRarity;
  chancesPerRun: {
    intact:      number;
    exceptional: number;
    radiant:     number;
  };
}

export interface ItemStats {
  damage?:         number;
  fireRate?:       number;
  critChance?:     number;
  critMultiplier?: number;
  statusChance?:   number;
  magazine?:       number;
  reload?:         number;
  health?:         number;
  shield?:         number;
  armor?:          number;
  energy?:         number;
  sprintSpeed?:    number;
  [key: string]:   number | undefined;   // extensible for future stats
}

export interface Ability {
  name:         string;
  description:  string;
  stats?:       Record<string, number>;
}

export interface BuildRequirement {
  item:   string;
  count:  number;
}

export interface UserItemState {
  owned?:       boolean;
  mastered?:    boolean;
  count?:       number;
  masteredOn?:  number;
  notes?:       string;
}

// ─── Codex sync envelope (KV value shape for codex:current) ────────────────────
// Wraps the TennoplanItem[] with a small header so the API handler can
// compute ageSeconds and version without re-deriving them from metadata.

export interface CodexBundle {
  items:        TennoplanItem[];
  version:      string;
  generatedAt:  number;
  itemCount:    number;
}
