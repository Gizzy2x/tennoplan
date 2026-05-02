// ---------------------------------------------------------------------------
// Worldstate parser — turns either source into a canonical ParsedWorldstate.
//
// Two upstream sources, one output shape:
//   • Official (api.warframe.com)         — raw DE JSON, run through
//                                            warframe-worldstate-parser
//   • Community (api.warframestat.us)     — already in parser shape
//
// Both feed into normalize() which produces a strict ParsedWorldstate object
// with Unix-ms timestamps, computed timeLeft fields, and cyclesRemaining map.
// ---------------------------------------------------------------------------

import { WorldState } from 'warframe-worldstate-parser';
import type {
  ParsedWorldstate,
  CycleInfo,
  DuviriCycleInfo,
  Fissure,
  Alert,
  Invasion,
  Sortie,
  ArchonHunt,
  ArbitrationInfo,
  BaroInfo,
  FlashSale,
  NightwaveInfo,
  PersistentEnemy,
  NewsItem,
  SyndicateMissionInfo,
  SyndicateJob,
  SimarisInfo,
  ArchimedeaInfo,
  ArchimedeaMissionInfo,
  ArchimedeaModifierInfo,
} from '../types';

// ─── Public entry points ──────────────────────────────────────────────────────

/**
 * Parse the raw DE worldstate JSON via warframe-worldstate-parser, then
 * normalize. Used when fetching from api.warframe.com/cdn/worldState.php.
 */
export async function parseFromOfficial(rawText: string): Promise<ParsedWorldstate> {
  const ws = await WorldState.build(rawText, { locale: 'en' });
  // Round-trip through JSON to flatten Date instances → ISO strings,
  // so normalize() can treat both source paths identically.
  const flat = JSON.parse(JSON.stringify(ws));
  return normalize(flat);
}

/**
 * Parse already-parsed warframestat.us text (community-parsed shape) and
 * normalize. Used when fetching from api.warframestat.us/pc/.
 */
export function parseFromCommunity(text: string): ParsedWorldstate {
  const obj = JSON.parse(text);
  return normalize(obj);
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalize(raw: any): ParsedWorldstate {
  const now = Date.now();

  const cetus    = toCycle(raw?.cetusCycle,   { isDay:    !!raw?.cetusCycle?.isDay });
  const vallis   = toCycle(raw?.vallisCycle,  { isWarm:   !!raw?.vallisCycle?.isWarm });
  const cambion  = toCycle(raw?.cambionCycle, {});
  const zariman  = toCycle(raw?.zarimanCycle, { isCorpus: !!raw?.zarimanCycle?.isCorpus });
  const duviri   = toDuviri(raw?.duviriCycle);
  const earth    = raw?.earthCycle ? toCycle(raw.earthCycle, { isDay: !!raw.earthCycle.isDay }) : undefined;

  const result: ParsedWorldstate = {
    timestamp: asMs(raw?.timestamp) || now,
    version:   typeof raw?.version === 'number' ? raw.version : 0,

    cetusCycle:        cetus,
    orbVallisCycle:    vallis,
    cambionDriftCycle: cambion,
    zarimanCycle:      zariman,
    duviriCycle:       duviri,
    ...(earth ? { earthCycle: earth } : {}),

    fissures:   toArray(raw?.fissures, toFissure),
    alerts:     toArray(raw?.alerts,   toAlert),
    invasions:  toArray(raw?.invasions, toInvasion).filter(i => !i.completed),
    sortie:     toSortie(raw?.sortie),
    archonHunt: toArchonHunt(raw?.archonHunt),
    ...(raw?.arbitration ? { arbitration: toArbitration(raw.arbitration) } : {}),

    ...(raw?.voidTrader ? { baro: toBaro(raw.voidTrader) } : {}),
    flashSales: toArray(raw?.flashSales, toFlashSale),

    ...(raw?.nightwave         ? { nightwave:         toNightwave(raw.nightwave) }              : {}),
    persistentEnemies:           toArray(raw?.persistentEnemies, toPersistentEnemy),
    news:                        toArray(raw?.news, toNewsItem),

    syndicateMissions:           toArray(raw?.syndicateMissions, toSyndicateMission),
    ...(raw?.simaris           ? { simaris:           toSimaris(raw.simaris) }                  : {}),
    archimedeas:                 toArray(raw?.archimedeas, toArchimedea),

    cyclesRemaining: {
      cetus:   cetus.timeLeft,
      vallis:  vallis.timeLeft,
      cambion: cambion.timeLeft,
      zariman: zariman.timeLeft,
      duviri:  duviri.timeLeft,
      ...(earth ? { earth: earth.timeLeft } : {}),
    },
  };

  return result;
}

// ─── Field-level helpers ──────────────────────────────────────────────────────

function asMs(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  if (typeof d === 'string') {
    const n = Date.parse(d);
    return Number.isFinite(n) ? n : 0;
  }
  if (d instanceof Date) return d.getTime();
  return 0;
}

function toArray<T, U>(raw: unknown, fn: (raw: any) => U | null): U[] {
  if (!Array.isArray(raw)) return [];
  const out: U[] = [];
  for (const item of raw) {
    const mapped = fn(item);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

function toCycle(raw: any, extra: Partial<CycleInfo>): CycleInfo {
  const expiry     = asMs(raw?.expiry);
  const activation = asMs(raw?.activation);
  const timeLeft   = Math.max(0, expiry - Date.now());
  return {
    activation,
    expiry,
    timeLeft,
    ...(typeof raw?.state === 'string' ? { state: raw.state } : {}),
    ...extra,
  };
}

function toDuviri(raw: any): DuviriCycleInfo {
  const cycle = toCycle(raw, {});
  const mood = typeof raw?.state === 'string' && isDuviriMood(raw.state) ? raw.state : undefined;
  return {
    ...cycle,
    ...(mood ? { mood } : {}),
    ...(typeof raw?.moodTimeLeft === 'number' ? { moodTimeLeft: raw.moodTimeLeft } : {}),
  };
}

function isDuviriMood(s: string): s is DuviriCycleInfo['mood'] & string {
  return s === 'Joy' || s === 'Anger' || s === 'Fear' || s === 'Envy' || s === 'Sorrow';
}

function toFissure(raw: any): Fissure | null {
  if (!raw) return null;
  return {
    id:          String(raw.id ?? ''),
    node:        String(raw.node ?? ''),
    missionType: String(raw.missionType ?? raw.missionKey ?? ''),
    tier:        (raw.tier ?? 'Lith') as Fissure['tier'],
    enemy:       String(raw.enemy ?? raw.enemyKey ?? ''),
    expiry:      asMs(raw.expiry),
    ...(raw.isHard  ? { isHard:  true } : {}),
    ...(raw.isStorm ? { isStorm: true } : {}),
  };
}

function toAlert(raw: any): Alert | null {
  if (!raw) return null;
  const m = raw.mission ?? {};
  const min = m.minEnemyLevel ?? raw.minEnemyLevel;
  const max = m.maxEnemyLevel ?? raw.maxEnemyLevel;
  return {
    id:          String(raw.id ?? ''),
    node:        String(m.node ?? raw.node ?? ''),
    missionType: String(m.type ?? m.missionType ?? raw.missionType ?? ''),
    level:       `${min ?? '?'}–${max ?? '?'}`,
    expiry:      asMs(raw.expiry),
    ...(m.reward?.asString    ? { reward:      String(m.reward.asString) } : {}),
    ...(raw.description       ? { description: String(raw.description)  } : {}),
  };
}

function toInvasion(raw: any): Invasion | null {
  if (!raw) return null;
  return {
    id:        String(raw.id ?? ''),
    node:      String(raw.node ?? ''),
    attacking: String(raw.attackingFaction ?? raw.attacker?.faction ?? ''),
    defending: String(raw.defendingFaction ?? raw.defender?.faction ?? ''),
    ...(raw.attacker?.reward?.asString ? { attackerReward: String(raw.attacker.reward.asString) } : {}),
    ...(raw.defender?.reward?.asString ? { defenderReward: String(raw.defender.reward.asString) } : {}),
    progress:  typeof raw.completion === 'number' ? raw.completion : 0,
    ...(raw.expiry        ? { expiry:        asMs(raw.expiry)    } : {}),
    ...(raw.vsInfestation ? { vsInfestation: true                } : {}),
    ...(raw.completed     ? { completed:     true                } : {}),
  };
}

function toSortie(raw: any): Sortie | null {
  if (!raw) return null;
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  return {
    id:           String(raw.id ?? ''),
    missionTypes: variants.map((v: any) => String(v?.missionType ?? v?.mission ?? '')),
    modifiers:    variants.map((v: any) => String(v?.modifier ?? '')),
    expiry:       asMs(raw.expiry),
    rewards:      raw.rewardPool ? [String(raw.rewardPool)] : [],
    ...(raw.faction || raw.boss ? { faction: String(raw.faction ?? raw.boss) } : {}),
  };
}

function toArchonHunt(raw: any): ArchonHunt | null {
  if (!raw) return null;
  const missions = Array.isArray(raw.missions) ? raw.missions : [];
  return {
    id:       String(raw.id ?? ''),
    missions: missions.map((m: any) => ({
      node:        String(m?.node ?? ''),
      missionType: String(m?.missionType ?? ''),
      ...(m?.modifier ? { modifier: String(m.modifier) } : {}),
    })),
    expiry: asMs(raw.expiry),
    ...(raw.boss    ? { boss:    String(raw.boss)    } : {}),
    ...(raw.faction ? { faction: String(raw.faction) } : {}),
  };
}

function toArbitration(raw: any): ArbitrationInfo {
  return {
    node:        String(raw.node ?? ''),
    missionType: String(raw.type ?? raw.missionType ?? ''),
    enemy:       String(raw.enemy ?? raw.faction ?? ''),
    ...(raw.modifier ? { modifier: String(raw.modifier) } : {}),
    expiry:      asMs(raw.expiry),
  };
}

function toBaro(raw: any): BaroInfo | null {
  if (!raw) return null;
  const active = !!raw.active;
  const inventory = Array.isArray(raw.inventory)
    ? raw.inventory.map((i: any) => ({
        name:    String(i?.item ?? ''),
        ducats:  Number(i?.ducats ?? 0),
        credits: Number(i?.credits ?? 0),
      }))
    : [];
  return {
    id:            String(raw.id ?? ''),
    name:          String(raw.character ?? raw.name ?? "Baro Ki'Teer"),
    presence:      active ? 'at_location' : 'in_transit',
    arrivalTime:   asMs(raw.activation),
    departureTime: asMs(raw.expiry),
    ...(raw.location ? { location: String(raw.location) } : {}),
    inventory,
  };
}

function toFlashSale(raw: any): FlashSale | null {
  if (!raw) return null;
  return {
    item:     String(raw.item ?? ''),
    discount: Number(raw.discount ?? 0),
    expiry:   asMs(raw.expiry),
  };
}

function toNightwave(raw: any): NightwaveInfo {
  const challenges = Array.isArray(raw?.activeChallenges) ? raw.activeChallenges : [];
  return {
    season: Number(raw?.season ?? 0),
    tier:   Number(raw?.tier   ?? 0),
    expiry: asMs(raw?.expiry),
    challenges: challenges.map((c: any) => ({
      id:          String(c?.id ?? ''),
      title:       String(c?.title ?? ''),
      description: String(c?.desc ?? c?.description ?? ''),
      reputation:  Number(c?.reputation ?? 0),
      daily:       !!c?.isDaily,
      expiry:      asMs(c?.expiry),
      ...(c?.isElite ? { isHard: true, isElite: true } : {}),
    })),
  };
}

function toPersistentEnemy(raw: any): PersistentEnemy | null {
  if (!raw) return null;
  return {
    name:     String(raw.agentType ?? raw.name ?? ''),
    location: String(raw.lastDiscoveredAt ?? raw.location ?? ''),
    ...(typeof raw.rank === 'number' ? { level: raw.rank } : {}),
  };
}

function toNewsItem(raw: any): NewsItem | null {
  if (!raw) return null;
  return {
    id:    String(raw.id ?? ''),
    title: String(raw.translations?.en ?? raw.message ?? raw.title ?? ''),
    ...(raw.message     ? { description: String(raw.message) } : {}),
    ...(raw.link        ? { url:         String(raw.link)    } : {}),
    date:  asMs(raw.date) || Date.now(),
  };
}

// ─── Syndicate bounties / Simaris / Deep Archimedea ───────────────────────────

const SYNDICATE_ALIASES: Record<string, string> = {
  'ostron':          'Ostron',
  'solaris united':  'Solaris United',
  'entrati':         'Entrati',
  'the holdfasts':   'The Holdfasts',
  'holdfasts':       'The Holdfasts',
};
const WANTED_SYNDICATES = new Set(Object.values(SYNDICATE_ALIASES));

/** Reject diagnostic strings the upstream parser leaks into rewardPool when
 *  it can't match a bounty. Real reward labels are short and title-cased. */
function sanitizeRewardPool(pool: unknown): string[] | undefined {
  if (!Array.isArray(pool)) return undefined;
  const clean = pool.filter(s =>
    typeof s === 'string' &&
    s.length > 0 &&
    s.length < 80 &&
    !s.includes('. ') &&
    !s.endsWith('.'),
  ) as string[];
  return clean.length > 0 ? clean : undefined;
}

function toSyndicateMission(raw: any): SyndicateMissionInfo | null {
  if (!raw) return null;
  const rawName   = String(raw.syndicate ?? '');
  const canonical = SYNDICATE_ALIASES[rawName.toLowerCase()] ?? rawName;
  // Filter to the four open-world syndicates — the legacy hook only ever
  // surfaced these and the rest are noise (Steel Meridian, Arbiters, etc.).
  if (!WANTED_SYNDICATES.has(canonical)) return null;

  const jobs: SyndicateJob[] = (Array.isArray(raw.jobs) ? raw.jobs : []).map((j: any) => {
    const lvls = Array.isArray(j?.enemyLevels) && j.enemyLevels.length === 2
      ? [Number(j.enemyLevels[0]) || 0, Number(j.enemyLevels[1]) || 0] as [number, number]
      : [0, 0] as [number, number];
    const rewardPool = sanitizeRewardPool(j?.rewardPool);
    return {
      type:           String(j?.type ?? 'Unknown'),
      enemyLevels:    lvls,
      standingStages: Array.isArray(j?.standingStages)
        ? j.standingStages.map((n: any) => Number(n) || 0)
        : [],
      ...(rewardPool ? { rewardPool } : {}),
    };
  });

  return {
    id:        String(raw.id ?? canonical),
    syndicate: canonical,
    expiry:    asMs(raw.expiry),
    jobs,
  };
}

function toSimaris(raw: any): SimarisInfo {
  const t = raw?.activeSynthesisTarget;
  return {
    activeSynthesisTarget: t
      ? {
          name:       String(t.name       ?? 'Unknown Target'),
          type:       String(t.type       ?? 'synthesis'),
          isArchwing: !!t.isArchwing,
          isBoss:     !!t.isBoss,
        }
      : null,
  };
}

function toArchimedeaModifier(raw: any): ArchimedeaModifierInfo | null {
  if (!raw) return null;
  return {
    key:         String(raw.key  ?? raw.name ?? ''),
    name:        String(raw.name ?? raw.key  ?? ''),
    description: String(raw.description ?? ''),
    ...(raw.isHard ? { isHard: true } : {}),
  };
}

function toArchimedeaMission(raw: any): ArchimedeaMissionInfo | null {
  if (!raw) return null;
  const deviation = toArchimedeaModifier(raw.deviation);
  const risks     = Array.isArray(raw.risks)
    ? raw.risks.map(toArchimedeaModifier).filter((m: ArchimedeaModifierInfo | null): m is ArchimedeaModifierInfo => m !== null)
    : [];
  return {
    faction:     String(raw.faction     ?? ''),
    ...(raw.factionKey     ? { factionKey:     String(raw.factionKey)     } : {}),
    missionType: String(raw.missionType ?? ''),
    ...(raw.missionTypeKey ? { missionTypeKey: String(raw.missionTypeKey) } : {}),
    ...(deviation ? { deviation } : {}),
    risks,
  };
}

function toArchimedea(raw: any): ArchimedeaInfo | null {
  if (!raw) return null;
  const missions = Array.isArray(raw.missions)
    ? raw.missions.map(toArchimedeaMission).filter((m: ArchimedeaMissionInfo | null): m is ArchimedeaMissionInfo => m !== null)
    : [];
  const personal = Array.isArray(raw.personalModifiers)
    ? raw.personalModifiers.map(toArchimedeaModifier).filter((m: ArchimedeaModifierInfo | null): m is ArchimedeaModifierInfo => m !== null)
    : [];
  return {
    ...(raw.id          ? { id:         String(raw.id) }     : {}),
    ...(raw.activation  ? { activation: asMs(raw.activation) } : {}),
    expiry:     asMs(raw.expiry),
    ...(raw.type        ? { type:       String(raw.type) }   : {}),
    missions,
    ...(personal.length ? { personalModifiers: personal }    : {}),
  };
}
