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

// ─── Codex sync state machine ──────────────────────────────────────────────────
//
//  normal   — 24h cadence (baseline; no recent patch)
//  patch    — 6h cadence for ~48h after a patch (new items detected)
//  hotfix   — 6h cadence for ~12h after a hotfix (data changed, no new items)
//  retry    — 6-min cadence, up to 3 attempts after any failure
//
export type CodexSyncMode = 'normal' | 'patch' | 'hotfix' | 'retry';

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

  // Codex smart-sync state (absent on worldstate metadata)
  syncMode?:            CodexSyncMode;
  retryCount?:          number;   // retries in current streak (resets on success)
  lastRetryAt?:         number;   // ms timestamp of last retry attempt
  aggressiveSyncsLeft?: number;   // remaining syncs in patch/hotfix mode
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
  /**
   * Weekly Circuit rotation. `normal` = the three Warframes earnable in the
   * normal Circuit; `hard` = the Steel Path Circuit's Incarnon weapon list.
   * Names are upstream display strings (e.g. "Ivara", "AckAndBrunt").
   */
  circuit?: {
    normal: string[];
    hard:   string[];
  };
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
   * Wiki-resolved prose when available (no |TOKEN| placeholders); falls back
   * to WFCD's templated string. Sanitize for residual game-markup tags
   * (<DT_SLASH_COLOR>) before rendering.
   */
  passiveDescription?: string;

  // ── Wiki-sourced warframe metadata (Warframe only) ─────────
  // All sourced from wiki.warframe.com Module:Warframes/data. Optional per-
  // field — the wiki has gaps (e.g. only ~75/119 frames define `subsumedAbility`).
  /** "Male" | "Female" | "Non-binary" — verbatim from wiki. */
  sex?:                 string;
  /** Helminth Subsumed ability name (e.g. "Shuriken"). */
  subsumedAbility?:     string;
  /** Tactical Ability name (squad UI cooldown power, e.g. "Smoke Screen"). */
  tacticalAbility?:     string;
  /** Progenitor element — drives Lich/Sister weapon roll (e.g. "Radiation"). */
  progenitorElement?:   string;
  /** Comma-separated themes string (e.g. "Assassin, Ninja"). */
  themes?:              string;
  /** Playstyle tags (e.g. ["Stealth", "Damage"]). */
  playstyle?:           string[];
  /** Starting energy on spawn — independent of max Energy in `stats`. */
  initialEnergy?:       number;
  /** Credit value when sold. */
  sellPrice?:           number;
  /** Explicit rank-30 stat overrides for frames whose wiki entry lists them
   *  (otherwise the standard ×3 / ×1.5 multiplier applies in display code). */
  statsRank30?:         ItemStats;

  // ── Weapon-specific (category === 'Weapon') ───────────────
  /** Trigger type — "Auto" | "Semi-Auto" | "Burst" | "Held" | "Charge" | "Active". */
  weaponTrigger?: string;
  /** Audio profile — "Silent" | "Alarming". Drives un-suppressed enemy aggro. */
  weaponNoise?:   string;
  /**
   * Per-damage-type breakdown for a single shot/hit. Keys: 'impact', 'slash',
   * 'puncture', 'heat', 'cold', 'electricity', 'toxin' and combined elements
   * ('blast', 'corrosive', 'gas', 'magnetic', 'radiation', 'viral'). Values
   * are absolute damage; sum should approximate `stats.damage` but per-faction
   * modifiers can shift it. Zero/missing entries are omitted by the parser.
   */
  damageTypes?:   Record<string, number>;

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
 * One patch-log entry as pulled from `patchlogs` in WFCD's records.
 * WFCD aggregates these from DE's forum patch notes — they're already
 * curated, dated, and source-linked, so we surface them as-is.
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
 * "Introduced in" metadata — which update first added this item to the game.
 * WFCD synthesises this from the wiki's `{{Update}}` template.
 */
export interface IntroducedInfo {
  /** e.g. "Update 15.6". */
  name:    string;
  /** ISO date (YYYY-MM-DD). */
  date?:   string;
  url?:    string;
  parent?: string;
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
  // ── Weapon-specific extensions ──────────────────────────────
  /** Riven disposition multiplier (0.50–1.55) — drives the 1-5 dot
   *  display on the in-game modding screen. Source: WFCD omegaAttenuation. */
  rivenDisposition?:  number;
  /** Higher = tighter spread (ranged). */
  accuracy?:          number;
  // Melee numerics.
  range?:             number;
  blockingAngle?:     number;
  comboDuration?:     number;
  followThrough?:     number;
  slamAttack?:        number;
  slamRadialDamage?:  number;
  [key: string]:   number | undefined;   // extensible for future stats
}

export interface Ability {
  name:         string;
  description:  string;
  /** Icon filename on cdn.warframestat.us/img/. */
  imageName?:   string;
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
