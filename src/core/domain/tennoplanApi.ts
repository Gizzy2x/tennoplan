/**
 * Tennoplan API contract — frontend mirror of the Cloudflare Worker types.
 *
 * Source of truth: `cloudflare-worker/src/types.ts`. Both sides ship the
 * same shape; the duplication exists because the Worker and the SPA build
 * with separate tsconfigs and we don't (yet) ship a shared package.
 *
 * This file is the single import surface for Worker-served API data. Old
 * domain types like `Fissure`, `Alert`, `Invasion` etc. ALSO exist in
 * src/core/domain/relics.ts and similar — those describe the legacy
 * warframestat.us shape and are scheduled for retirement in Phase D.4.
 *
 * If a consumer needs both shapes simultaneously, alias on import:
 *   import type { Fissure as ApiFissure } from '@/core/domain/tennoplanApi';
 *   import type { Fissure } from '@/core/domain/relics';
 *
 * Pure domain file — zero runtime dependencies.
 */

// ─── Sync state / data attribution ───────────────────────────────────────────

export type DataSource =
  | 'calamity-plus'
  | 'official'
  | 'wfcd'
  | 'enriched'
  | 'warframestat'
  | 'cached'
  | 'fallback';

export type DataQuality = 'high' | 'medium' | 'low';

/** One row per dataset in the syncMetadata table. */
export interface SyncMetadata {
  /** Unix ms of the last successful sync. */
  lastSync:    number;
  /** SHA-256 of the current blob — used as If-None-Match value. */
  etag:        string;
  /** Source-supplied version string, e.g. "official-20260430". */
  version:     string;
  source:      DataSource;
  quality:     DataQuality;
  /** Consecutive failures since the last success. */
  errorCount:  number;
  lastError?:  string;
  /** Codex only — number of items in the current blob. */
  itemCount?:  number;
}

// ─── API envelope ─────────────────────────────────────────────────────────────

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

// ─── ParsedWorldstate (canonical shape served by /v1/worldstate) ──────────────
//
// All timestamps are Unix ms (the Worker normalises ISO strings, Date
// instances, and numeric inputs to a single millisecond integer). cyclesRemaining
// is computed at parse time so the UI can render countdown labels without
// re-deriving it.

export interface ParsedWorldstate {
  /** Unix ms when this worldstate was generated (server-side parse time). */
  timestamp:    number;
  /** DE worldstate version field — bumps when DE pushes a fresh state. */
  version:      number;

  cetusCycle:        CycleInfo;
  orbVallisCycle:    CycleInfo;
  cambionDriftCycle: CycleInfo;
  zarimanCycle:      CycleInfo;
  duviriCycle:       DuviriCycleInfo;
  earthCycle?:       CycleInfo;

  fissures:    Fissure[];
  alerts:      Alert[];
  invasions:   Invasion[];
  sortie:      Sortie | null;
  archonHunt:  ArchonHunt | null;
  arbitration?: ArbitrationInfo;

  baro?:       BaroInfo | null;
  flashSales?: FlashSale[];

  nightwave?:         NightwaveInfo;
  persistentEnemies?: PersistentEnemy[];
  news?:              NewsItem[];

  /** Open-world bounty rotations for the four wanted syndicates. */
  syndicateMissions?: SyndicateMissionInfo[];
  /** Sanctuary's active synthesis target (Cephalon Simaris). */
  simaris?:           SimarisInfo;
  /** Weekly Netracell rotations (Deep Archimedea / Elite Deep Archimedea). */
  archimedeas?:       ArchimedeaInfo[];

  /** ms remaining for each cycle, keyed by short id. */
  cyclesRemaining: Record<string, number>;
  /** True if the snapshot is older than the staleness threshold. */
  isStale?:        boolean;
  /** True if the response was projected via cycle-math fallback. */
  fallbackSource?: boolean;
}

export interface CycleInfo {
  /** Unix ms when the current state began. */
  activation: number;
  /** Unix ms when the current state ends. */
  expiry:     number;
  /** ms until expiry (computed at parse time). */
  timeLeft:   number;
  isDay?:     boolean;
  isWarm?:    boolean;
  isCorpus?:  boolean;
  /** Free-form state label: 'fass' | 'vome' | 'day' | 'night' | 'warm' | 'cold' | 'grineer' | 'corpus' */
  state?:     string;
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
  /** Unix ms when this fissure expires. */
  expiry:        number;
  isHard?:       boolean;
  isStorm?:      boolean;
}

export interface Alert {
  id:           string;
  node:         string;
  missionType:  string;
  /** Pre-formatted level range, e.g. "10–25". */
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
  /** 0–100 percentage. */
  progress:         number;
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
  /** 0–100 percentage. */
  discount: number;
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
  /** Unix ms. */
  date:         number;
}

// ─── Bounty rotations / Sanctuary / Deep Archimedea ───────────────────────────
//
// Mirrored from cloudflare-worker/src/types.ts. The Worker filters the
// upstream warframestat.us payload to the four open-world syndicates and
// emits canonical labels, so the frontend never has to do alias lookups.

export interface SyndicateMissionInfo {
  id:        string;
  /** Canonical syndicate label, e.g. "Ostron" / "Solaris United" / "Entrati" / "The Holdfasts". */
  syndicate: string;
  /** Unix ms when these jobs rotate. */
  expiry:    number;
  jobs:      SyndicateJob[];
}

export interface SyndicateJob {
  type:           string;
  enemyLevels:    [number, number];
  standingStages: number[];
  rewardPool?:    string[];
}

export interface SimarisInfo {
  activeSynthesisTarget: SimarisTarget | null;
}

export interface SimarisTarget {
  name:       string;
  type:       string;
  isArchwing: boolean;
  isBoss:     boolean;
}

export interface ArchimedeaInfo {
  id?:                string;
  /** Unix ms when the rotation began. */
  activation?:        number;
  /** Unix ms when the rotation ends. */
  expiry:             number;
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

// ─── TennoplanItem (canonical shape served by /v1/codex) ──────────────────────
//
// One row per Warframe item. Stored in the Dexie `items` table keyed by
// uniqueName. The Worker emits ~8k items per sync; the frontend uses the
// `category` / `masteryRank` / `vaulted` indexes for filtered queries.

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
  dropLocations: TpDropLocation[];
  bestFarms?:    BestFarmRecommendation[];
  relicRewards?: RelicReward[];

  // ── Item-specific data ──────────────────────────────────────
  stats?:             ItemStats;
  abilities?:         Ability[];
  polarities?:        string[];
  /** Aura slot polarity (Warframes only) — distinct from `polarities`. */
  auraPolarity?:      string;
  baseDrain?:         number;
  buildRequirements?: BuildRequirement[];

  /**
   * Flavor / lore / mechanics string from raw.description, locale-resolved.
   * Applies to every category (warframe lore, weapon flavour, mod text...),
   * not just mods.
   */
  description?:  string;

  /**
   * Warframe/Sentinel/Pet passive ability text.
   * Raw WFCD string — may contain game markup tags like <DT_SLASH_COLOR>.
   * Sanitize before rendering.
   */
  passiveDescription?: string;

  // ── Mod-specific (category === 'Mod') ──────────────────────
  /** Per-rank stat lines. levelStats[0] = R0, levelStats[N] = RN. */
  levelStats?:   string[][];
  /**
   * Short compatibility label shown at the bottom of mod cards:
   * "SHOTGUN", "WARFRAME", "ASH", "POLEARMS", "FOCUS WAY", etc.
   * Uppercased, no "Mod" suffix.
   */
  compatName?:   string;
  /** Mod polarity, lowercase: 'madurai' | 'vazarin' | 'naramon' | ... */
  polarity?:     string;
  /** True for warframe augment mods. */
  isAugment?:    boolean;
  /** True for Exilus-slot mods (utility / cosmetic). */
  isExilus?:     boolean;
  /** True when this mod is one of the equippable pieces of a Mod Set. */
  isSet?:        boolean;
  /** Source filename / mod set uniqueName when isSet is true. */
  modSet?:       string;
  /**
   * Image filename for the mod thumb on cdn.warframestat.us.
   * Distinct from iconUrl when we want to render at a non-standard size.
   */
  imageName?:    string;

  // ── Economy ─────────────────────────────────────────────────
  ducatValue?:    number;
  estimatedPlat?: number;

  // ── External knowledge links ───────────────────────────────
  /** Deep link to wiki.warframe.com for this item (CC BY-SA — attribute). */
  wikiUrl?:       string;
  /** Update this item was introduced in. */
  introduced?:    IntroducedInfo;
  /** ISO date string (YYYY-MM-DD) of first release. */
  releaseDate?:   string;
  /** Whether this item can appear in mod transmutation (Mod only). */
  transmutable?:  boolean;
  /** Patch history excerpts pulled from upstream WFCD `patchlogs`. */
  patchHistory?:  PatchLogEntry[];

  // ── User state (only set after user interaction) ────────────
  userState?: UserItemState;

  // ── Metadata ────────────────────────────────────────────────
  dataVersion:  string;
  lastUpdated:  number;
  source:       DataSource;
  quality:      DataQuality;
}

/**
 * Drop-location row attached to a TennoplanItem.
 *
 * Named `TpDropLocation` (not `DropLocation`) to avoid colliding with the
 * legacy `DropLocation` exported from `src/core/domain/drops.ts`. D.4 will
 * eventually retire the legacy shape; for now both coexist.
 */
export interface TpDropLocation {
  /** Parent item uniqueName — links back to the owning TennoplanItem. */
  uniqueName:        string;
  /** Human-readable label, safe to render directly. */
  location:          string;
  /** Broad source category, e.g. 'Mission' | 'Void Fissure' | 'Cetus Bounty'. */
  sourceName:        string;
  missions?:         string[];
  /** 0.0–1.0 fraction. */
  chance:            number;
  rotation?:         Rotation;
  rarity?:           ItemRarity;
  isSteelPath?:      boolean;
  voidFissureTier?:  RelicTier;
  bountyTier?:       BountyTier;
  isDailyDeal?:      boolean;
  /** Cooldown in hours (used by daily-deals etc.). */
  cooldown?:         number;
}

export interface BestFarmRecommendation {
  location:         TpDropLocation;
  /** 0–100 composite score (chance × effort × cycle bonus). */
  efficiencyScore:  number;
  /** Expected runs to obtain one of this item. */
  estimatedRuns:    number;
  notes?:           string;
}

export interface RelicReward {
  /** Display name of the contained item. */
  item:    string;
  rarity:  ItemRarity;
  /** Per-state drop chances, all 0.0–1.0. */
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
  [key: string]:   number | undefined;
}

export interface Ability {
  name:         string;
  description:  string;
  /** Icon filename on cdn.warframestat.us/img/. */
  imageName?:   string;
  stats?:       Record<string, number>;
}

export interface BuildRequirement {
  /** Display name of the required ingredient. */
  item:   string;
  count:  number;
}

export interface UserItemState {
  owned?:       boolean;
  mastered?:    boolean;
  count?:       number;
  /** Unix ms when mastered. */
  masteredOn?:  number;
  notes?:       string;
}

/**
 * One patch-log entry pulled from upstream WFCD `patchlogs`.
 * Already curated, dated, and source-linked — we surface as-is.
 */
export interface PatchLogEntry {
  /** Update name, e.g. "Veilbreaker: Update 32". */
  name:       string;
  /** ISO timestamp (e.g. "2022-09-07T15:00:11Z"). */
  date:       string;
  /** Link to the forum post. */
  url?:       string;
  additions?: string;
  changes?:   string;
  fixes?:     string;
}

/**
 * Which update first added this item to the game.
 * Source: wiki `{{Update}}` template, surfaced via WFCD.
 */
export interface IntroducedInfo {
  /** e.g. "Update 15.6". */
  name:    string;
  /** ISO date (YYYY-MM-DD). */
  date?:   string;
  url?:    string;
  parent?: string;
}
