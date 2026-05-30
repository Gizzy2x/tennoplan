import type {
  NightwaveChallengeRaw,
  SortieRaw,
  ArchonHuntRaw,
  ArchonHuntStatus,
  ArchimedeaRaw,
  ArchimedeaStatus,
  ChallengeKind,
  ChallengeStatus,
  SortieStatus,
  StandingSummary,
} from '../domain/ascension';

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function classifyChallenge(c: NightwaveChallengeRaw): ChallengeKind {
  if (c.isElite)  return 'elite';
  if (c.isDaily)  return 'daily';
  return 'weekly';
}

// ---------------------------------------------------------------------------
// Status computation
// ---------------------------------------------------------------------------

export function computeChallengeStatus(
  raw:          NightwaveChallengeRaw,
  completedIds: Set<string>,
  now:          number,
): ChallengeStatus {
  const msRemaining = raw.isPermanent ? 0 : Math.max(0, new Date(raw.expiry).getTime() - now);
  return {
    raw,
    kind:      classifyChallenge(raw),
    completed: completedIds.has(raw.id),
    msRemaining,
  };
}

export function computeSortieStatus(raw: SortieRaw, now: number): SortieStatus {
  return {
    raw,
    msRemaining: Math.max(0, new Date(raw.expiry).getTime() - now),
  };
}

export function computeArchonHuntStatus(raw: ArchonHuntRaw, now: number): ArchonHuntStatus {
  return {
    raw,
    msRemaining: Math.max(0, new Date(raw.expiry).getTime() - now),
  };
}

export function computeArchimedeaStatus(raw: ArchimedeaRaw, now: number): ArchimedeaStatus {
  return {
    raw,
    msRemaining: Math.max(0, new Date(raw.expiry).getTime() - now),
  };
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export function groupChallenges(
  statuses: ChallengeStatus[],
): Record<ChallengeKind, ChallengeStatus[]> {
  const result: Record<ChallengeKind, ChallengeStatus[]> = {
    daily:  [],
    weekly: [],
    elite:  [],
  };
  for (const s of statuses) {
    result[s.kind].push(s);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Standing summary
// ---------------------------------------------------------------------------

export function computeStanding(statuses: ChallengeStatus[]): StandingSummary {
  let earned    = 0;
  let available = 0;
  for (const s of statuses) {
    // Use Number() + || 0 rather than ?? 0 because ?? only guards null/undefined,
    // not NaN. Warframe Nightwave API can return non-numeric standing between
    // seasons or on first load — this ensures the sum never becomes NaN.
    const pts = Number(s.raw.reputation) || 0;
    available += pts;
    if (s.completed) earned += pts;
  }
  const pct = available > 0 ? earned / available : 0;
  return { earned, available, pct };
}

// ---------------------------------------------------------------------------
// EE.log auto-completion (future)
// ---------------------------------------------------------------------------
// TODO: When Tauri FS plugin is available, parse EE.log for entries like
// "NightwaveChallengeCompleted" and "SortieCompleted" to auto-mark challenges
// without manual toggle. For now, completion state lives in userMarks (Dexie)
// and is toggled manually via useAscension.toggleComplete().

// ---------------------------------------------------------------------------
// Presentation constants (pure — no React)
// ---------------------------------------------------------------------------

/** Hex color per challenge kind. */
export const KIND_COLOR: Record<ChallengeKind, string> = {
  daily:  '#DBB058',  // gold
  weekly: '#C6C6C7',  // silver
  elite:  '#c084fc',  // purple
};

/** Subtle right-to-left overlay color per kind (rgba string). */
export const KIND_OVERLAY: Record<ChallengeKind, string> = {
  daily:  'rgba(219, 176, 88, 0.13)',
  weekly: 'rgba(198, 198, 199, 0.09)',
  elite:  'rgba(192, 132, 252, 0.14)',
};

/** Faction color for Sorties — mirrors ENEMY_COLOR in fissureService. */
export const SORTIE_FACTION_COLOR: Record<string, string> = {
  Grineer:  '#f87171',
  Corpus:   '#60a5fa',
  Infested: '#86efac',
  Corrupted:'#DBB058',
  Orokin:   '#DBB058',
};

/** Warframe's hard weekly standing cap for Nightwave. Used as the denominator
 *  for the standing progress bar so the tracker stays stable across daily rotations. */
export const NW_WEEKLY_STANDING_CAP = 40_000;

/** Human-readable label per kind. */
export const KIND_LABEL: Record<ChallengeKind, string> = {
  daily:  'Daily Challenges',
  weekly: 'Weekly Challenges',
  elite:  'Elite Weekly',
};
