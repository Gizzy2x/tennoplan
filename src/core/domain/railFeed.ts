// ---------------------------------------------------------------------------
// Solar Rail Feed — domain types
// Raw API shapes (warframestat.us) + normalized domain types + status types.
// Sortie / Archon Hunt remain in ascension.ts — import from there.
// ---------------------------------------------------------------------------

// ── Darvo Daily Deals ────────────────────────────────────────────────────────

/** Raw shape from /pc/dailyDeals?language=en */
export interface RawDarvoDeal {
  item:          string;
  originalPrice: number;
  salePrice:     number;
  discount:      number;
  total:         number;
  sold:          number;
  id:            string;
  expiry:        string; // ISO string
}

/** Normalized — stored in Dexie cache as JSON */
export interface DarvoDeal {
  id:            string;
  item:          string;
  originalPrice: number;
  salePrice:     number;
  discount:      number;
  total:         number;
  sold:          number;
  expiryMs:      number;
  fetchedAt:     number;
}

/** Derived at render time — never stored */
export interface DarvoDealStatus {
  deal:        DarvoDeal;
  msRemaining: number;
  isExpired:   boolean;
  stockPct:    number; // sold / total (0–1)
}

// ── Void Trader (Baro Ki'Teer) ───────────────────────────────────────────────

/** Raw shape from /pc/voidTrader?language=en */
export interface RawVoidTraderItem {
  item:    string;
  ducats:  number;
  credits: number;
}

export interface RawVoidTrader {
  id:         string;
  character:  string;
  location:   string;
  inventory:  RawVoidTraderItem[];
  activation: string; // ISO string — when he arrives
  expiry:     string; // ISO string — when he departs
  active:     boolean;
}

export interface VoidTraderItem {
  item:    string;
  ducats:  number;
  credits: number;
}

export interface VoidTrader {
  id:           string;
  character:    string;
  location:     string;
  inventory:    VoidTraderItem[];
  activationMs: number;
  expiryMs:     number;
  active:       boolean;
  fetchedAt:    number;
}

export interface VoidTraderStatus {
  trader:           VoidTrader;
  msUntilArrival:   number; // > 0 when away
  msUntilDeparture: number; // > 0 when active
  isActive:         boolean;
}

// ── Steel Path ───────────────────────────────────────────────────────────────

export interface RawSteelPathReward {
  name: string;
  cost: number;
}

export interface RawSteelPath {
  currentReward: RawSteelPathReward;
  activation:    string; // ISO string
  expiry:        string; // ISO string
  rotation?:     RawSteelPathReward[];
}

export interface SteelPath {
  rewardName:   string;
  rewardCost:   number;
  activationMs: number;
  expiryMs:     number;
  rotation:     Array<{ name: string; cost: number }>;
  fetchedAt:    number;
}

export interface SteelPathStatus {
  steelPath:   SteelPath;
  msRemaining: number;
  isExpired:   boolean;
}

// ── Persistent Enemies (Acolytes / Stalker-type) ─────────────────────────────

export interface RawPersistentEnemy {
  id:           string;
  agentType:    string;
  typeKey:      string;
  health:       number;  // 0–100 float
  isDiscovered: boolean;
  isDestroyed:  boolean;
  lastNode:     string;
  location?:    string;
  active:       boolean;
}

export interface PersistentEnemy {
  id:           string;
  agentType:    string;
  typeKey:      string;
  health:       number;
  isDiscovered: boolean;
  isDestroyed:  boolean;
  lastNode:     string;
  location:     string;
  active:       boolean;
  fetchedAt:    number;
}

export interface PersistentEnemyStatus {
  enemy: PersistentEnemy;
  // No time component — health bar is the primary signal
}

// ── News ─────────────────────────────────────────────────────────────────────

export interface RawNewsItem {
  id:            string;
  message:       string;
  link:          string;
  imageLink?:    string;
  date:          string; // ISO string
  update:        boolean;
  prime:         boolean;
  stream:        boolean;
  translations?: Record<string, string>;
}

/** Normalized — stored in Dexie cache as JSON */
export interface NewsItem {
  id:        string;
  headline:  string;
  link:      string;
  imageLink: string;
  dateMs:    number;
  isUpdate:  boolean;
  isPrime:   boolean;
  isStream:  boolean;
  fetchedAt: number;
}

// ── Invasions ─────────────────────────────────────────────────────────────────

export interface RawInvasionReward {
  itemString: string;
  credits:    number;
  items:      Array<{ type: string; count: number; uniqueName: string }>;
}

export interface RawInvasion {
  id:               string;
  node:             string;
  desc:             string;
  attackerReward:   RawInvasionReward;
  defenderReward:   RawInvasionReward;
  attackingFaction: string;
  defendingFaction: string;
  count:            number;
  goal:             number;
  completion:       number;  // 0–100 float
  completed:        boolean;
  vsInfestation:    boolean;
  activation:       string;  // ISO string
}

export interface Invasion {
  id:               string;
  node:             string;
  desc:             string;
  attackerReward:   string;  // itemString
  defenderReward:   string;
  attackerCredits:  number;
  defenderCredits:  number;
  attackingFaction: string;
  defendingFaction: string;
  completion:       number;  // 0–100 float
  vsInfestation:    boolean;
  activationMs:     number;
  fetchedAt:        number;
}

export interface InvasionStatus {
  invasion:   Invasion;
  completion: number;  // pass-through from invasion.completion
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface RawAlertReward {
  itemString: string;
  credits:    number;
  thumbnail?: string;
  items:      Array<{ type: string; count: number; uniqueName: string }>;
}

export interface RawAlertMission {
  node:             string;
  type:             string;
  faction:          string;
  reward:           RawAlertReward;
  minEnemyLevel:    number;
  maxEnemyLevel:    number;
  nightmare:        boolean;
  archwingRequired: boolean;
}

export interface RawAlert {
  id:         string;
  activation: string; // ISO string
  expiry:     string; // ISO string
  expired:    boolean;
  mission:    RawAlertMission;
}

export interface Alert {
  id:               string;
  node:             string;
  missionType:      string;
  faction:          string;
  reward:           string;  // itemString
  rewardCredits:    number;
  minLevel:         number;
  maxLevel:         number;
  nightmare:        boolean;
  archwingRequired: boolean;
  activationMs:     number;
  expiryMs:         number;
  fetchedAt:        number;
}

export interface AlertStatus {
  alert:       Alert;
  msRemaining: number;
  isExpired:   boolean;
}
