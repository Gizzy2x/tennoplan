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

  // ── Pulse two-stage poll (worldstate only) ──
  /** Semantic etag of the pulse head this snapshot was fetched under.
   *  When the polled head still carries this etag, nothing meaningful
   *  changed and the full-body fetch is skipped. */
  pulseEtag?:        string;
  /** Worker's last successful UPSTREAM sync (head.lastSync) — true data
   *  freshness, independent of how recently this client polled. */
  upstreamLastSync?: number;
}

// ─── Pulse head (GET /v1/pulse) ───────────────────────────────────────────────
// Sub-KB worldstate head. Mirrors cloudflare-worker/src/types.ts — keep in sync.

export type PulseEventKind =
  | 'fissure-spawned'
  | 'alert-spawned'
  | 'invasion-spawned'
  | 'bounty-rotated'
  | 'sortie-changed'
  | 'archon-changed'
  | 'baro-arrived'
  | 'baro-departed'
  | 'nightwave-changed'
  | 'cycle-anchor-changed';

export interface PulseEvent {
  kind:   PulseEventKind;
  id:     string;
  /** Unix ms when the worker's diff engine detected this event. */
  at:     number;
  label?: string;
}

export interface PulseHead {
  /** Moves only when something a client can't compute locally changed. */
  semanticEtag: string;
  /** Unix ms when semanticEtag last changed. */
  lastChange:   number;
  /** Unix ms of the worker's last successful upstream sync. */
  lastSync:     number;
  /** Monotonic change counter. */
  seq:          number;
  counts: {
    fissures:  number;
    alerts:    number;
    invasions: number;
  };
  /** Recent spawn-only events, newest first — future Solar Rail feed. */
  events: PulseEvent[];
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

// ─── Codex chunk manifest (Phase B — R2 delta downloads) ───────────────────────
// Client mirror of the worker's CodexManifest (cloudflare-worker/src/types.ts).
// Served by GET /v1/codex/manifest. The client diffs each chunk's semantic hash
// against its stored map and downloads only the categories that changed; the
// monolithic /v1/codex stays as the fallback.

export interface CodexChunkRef {
  /** ItemCategory value, e.g. "Mod". */
  category:   string;
  /** Semantic hash of the chunk's items (volatile fields stripped). Stable
   *  build-to-build when the category's data didn't meaningfully change. */
  hash:       string;
  itemCount:  number;
  /** Uncompressed byte length of the chunk's JSON body. */
  byteSize:   number;
  /** R2 object key relative to the bucket root, e.g. "chunks/Mod-a1b2c3.json". */
  key:        string;
}

export interface CodexManifest {
  /** Manifest format version. Client falls back to the monolith if this exceeds
   *  the version it understands. */
  schemaVersion: number;
  version:       string;
  generatedAt:   number;
  /** Overall semantic content hash — doubles as the manifest ETag. */
  contentHash:   string;
  itemCount:     number;
  chunks:        CodexChunkRef[];
  /** Forward-compat: when the worker emits this and it exceeds the client's
   *  version, the client falls back to the monolith. Absent today = no gate. */
  minimumClientVersion?: string;
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
  /**
   * Weekly Circuit rotation (mirrored from the Worker). `normal` = the three
   * Warframes earnable in the normal Circuit; `hard` = the Steel Path Circuit's
   * Incarnon weapon list. Upstream display strings (e.g. "Ivara", "AckAndBrunt").
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
  /** Mastery Rank required (0/absent = none). */
  minMR?:         number;
  /** Deimos Isolation Vault bounty. */
  isVault?:       boolean;
  /** Time-limited (e.g. Narmer). */
  timeBound?:     boolean;
  /** The CURRENT live reward rotation (the "Table" the board sits on now). */
  rotation?:      'A' | 'B' | 'C';
  /** Live drops for the current rotation (warframestat only — real chances). */
  rewardPoolDrops?: BountyDrop[];
}

/** One live bounty drop (current rotation). `chance` is a percent (0–100). */
export interface BountyDrop {
  item:   string;
  rarity: string;
  chance: number;
  count?: number;
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
   * "Cephalon's Notes" — our own-words practical knowledge (how it really
   * works, interactions, gotchas, synergies). Authored, keyed by uniqueName,
   * `status:'beta'` until community-vetted. Mirrors the Worker type.
   */
  fieldNotes?:   FieldNotes;

  /**
   * Computed Advantages / Disadvantages vs peer items (the wiki
   * "Characteristics" section), generated from stats in CI. Stat-bearing
   * categories only (Weapon, Warframe, Companion, Sentinel). Mirrors Worker.
   */
  characteristics?: ItemCharacteristics;

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
   * are absolute damage; sum should approximate `stats.damage`. Zero/missing
   * entries are omitted by the parser.
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
  /** Endo to fully rank this mod (rank 0 → max), computed in CI. Mod only. */
  upgradeCost?:  UpgradeCost;

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
  /** Base multishot (projectiles per shot). Present only when >1 (innate
   *  multishot, e.g. shotguns); absent means 1. Weapon only. */
  multishot?:      number;
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

/** Endo to fully rank a mod (rank 0 → max). Computed in CI. Mirrors Worker. */
export interface UpgradeCost {
  endoToMax: number;
}

/** A computed Advantage/Disadvantage (the wiki "Characteristics" idea). Mirrors Worker. */
export type CharacteristicBand = 'very-high' | 'above-average' | 'below-average' | 'very-low';

export interface Characteristic {
  /** ItemStats key this came from (UI can theme by stat). */
  stat: string;
  band: CharacteristicBand;
  /** Pre-formatted line, e.g. "Very high magazine (209)". */
  text: string;
}

export interface ItemCharacteristics {
  advantages:    Characteristic[];
  disadvantages: Characteristic[];
}

/** "Cephalon's Notes" — authored own-words practical knowledge. Mirrors Worker. */
export interface FieldNotes {
  /** One-line plain-language summary. */
  tldr?:   string;
  /** Bullet facts: interactions, gotchas ("doesn't affect X"), synergies. */
  points?: string[];
  /** 'beta' until community-vetted; surfaces a BETA tag. */
  status:  'beta' | 'verified';
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
