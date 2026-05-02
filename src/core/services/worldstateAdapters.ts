/**
 * worldstateAdapters — V2 ParsedWorldstate → legacy domain Raw shape mappers.
 *
 * The V2 worldstate contract emits Unix-ms timestamps and normalised field
 * names; the legacy ascension/rail compute functions still consume the
 * `*Raw` shapes (ISO timestamps, parallel-array variants, etc.). These
 * adapters bridge the two so we can migrate hooks to V2 without rewriting
 * the per-feature business logic.
 *
 * Pure functions, zero side effects, zero framework imports — fits inside
 * core/ without breaking hexagonal purity.
 */

import type {
  Sortie as ApiSortie,
  ArchonHunt as ApiArchonHunt,
  ArchimedeaInfo,
  ArchimedeaMissionInfo,
  ArchimedeaModifierInfo,
  NightwaveChallenge as ApiNightwaveChallenge,
} from '../domain/tennoplanApi';
import type {
  SortieRaw,
  SortieMission,
  ArchonHuntRaw,
  ArchonHuntMission,
  ArchimedeaRaw,
  ArchimedeaMission,
  ArchimedeaModifier,
  NightwaveChallengeRaw,
} from '../domain/ascension';

/** Convert Unix-ms back to ISO string for legacy `*Raw` types whose compute
 *  functions still parse with `new Date(...)`. Cheap and stable. */
function toISO(ms: number | undefined): string {
  if (!ms || ms <= 0) return '';
  return new Date(ms).toISOString();
}

/** V2 Sortie → legacy SortieRaw. Zips the parallel missionTypes/modifiers
 *  arrays into the variants[] shape the SortieCard renders. */
export function apiToSortieRaw(raw: ApiSortie): SortieRaw {
  const variants: SortieMission[] = raw.missionTypes.map((missionType, i) => ({
    missionType,
    modifierType:        raw.modifiers[i] ?? '',
    modifierDescription: '',
    node:                '', // V2 doesn't carry per-variant nodes today
  }));
  return {
    expiry:   toISO(raw.expiry),
    faction:  raw.faction ?? '',
    boss:     '', // V2 doesn't carry sortie boss; the page falls back to faction
    variants,
  };
}

/** V2 ArchonHunt → legacy ArchonHuntRaw. */
export function apiToArchonHuntRaw(raw: ApiArchonHunt): ArchonHuntRaw {
  const missions: ArchonHuntMission[] = raw.missions.map(m => ({
    type: m.missionType,
    node: m.node,
  }));
  return {
    id:      raw.id,
    boss:    raw.boss ?? '',
    faction: raw.faction ?? '',
    expiry:  toISO(raw.expiry),
    missions,
  };
}

/** V2 ArchimedeaModifierInfo → legacy ArchimedeaModifier. */
function apiToArchimedeaModifier(raw: ArchimedeaModifierInfo): ArchimedeaModifier {
  return {
    key:         raw.key,
    name:        raw.name,
    description: raw.description,
    ...(raw.isHard ? { isHard: true } : {}),
  };
}

/** V2 ArchimedeaMissionInfo → legacy ArchimedeaMission. */
function apiToArchimedeaMission(raw: ArchimedeaMissionInfo): ArchimedeaMission {
  return {
    faction:     raw.faction,
    ...(raw.factionKey     ? { factionKey:     raw.factionKey     } : {}),
    missionType: raw.missionType,
    ...(raw.missionTypeKey ? { missionTypeKey: raw.missionTypeKey } : {}),
    ...(raw.deviation ? { deviation: apiToArchimedeaModifier(raw.deviation) } : {}),
    risks:       raw.risks.map(apiToArchimedeaModifier),
  };
}

/** V2 ArchimedeaInfo → legacy ArchimedeaRaw. */
export function apiToArchimedeaRaw(raw: ArchimedeaInfo): ArchimedeaRaw {
  return {
    ...(raw.id         ? { id:         raw.id }                : {}),
    ...(raw.activation ? { activation: toISO(raw.activation) } : {}),
    expiry:     toISO(raw.expiry),
    ...(raw.type       ? { type:       raw.type }              : {}),
    missions:   raw.missions.map(apiToArchimedeaMission),
    ...(raw.personalModifiers && raw.personalModifiers.length > 0
      ? { personalModifiers: raw.personalModifiers.map(apiToArchimedeaModifier) }
      : {}),
  };
}

/** V2 NightwaveChallenge → legacy NightwaveChallengeRaw.
 *  V2 uses `daily` (boolean) + optional `isElite`; legacy uses `isDaily` /
 *  `isElite` / `isPermanent`. Permanent challenges are a legacy concept
 *  the upstream parser used to emit; V2 doesn't surface them, so we
 *  default to false. */
export function apiToNightwaveChallengeRaw(raw: ApiNightwaveChallenge): NightwaveChallengeRaw {
  return {
    id:          raw.id,
    title:       raw.title,
    desc:        raw.description,
    reputation:  raw.reputation,
    isDaily:     raw.daily,
    isElite:     raw.isElite ?? false,
    isPermanent: false,
    expiry:      toISO(raw.expiry),
    activation:  '', // V2 doesn't carry per-challenge activation
  };
}
