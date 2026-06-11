/**
 * BountyBoard — uniform reward pool for ONE place's giver.
 *
 * The giver is chosen in the Places rail (the Observatory's left nav), so this
 * board renders a single giver's tiers:
 *   Tier (a live job, by level)  →  stages strip  →  one uniform reward POOL
 *
 * Presentation: every reward item is an <ItemTile> (the app's uniform item
 * holder). A bounty board sits on ONE live reward rotation at a time (the
 * "Table" — A/B/C); only that rotation's items, plus any always-drop pool, can
 * drop until the board refreshes (~2.5h). So we show JUST the live rotation
 * (badged "Rotation B · live") and dedupe it to one tile per item — no rotation
 * tabs, no A/B/C clutter. When the live rotation is unknown (static givers) we
 * fall back to every rotation with A/B/C letter tags. Clicking a tile opens the
 * app-wide quick-look info window (handled by ItemTile when uniqueName is set).
 *
 * The stages strip is an honest COUNT only (numbered pips) — per-stage
 * objectives are randomised in-game and not in the data. Percentages are
 * intentionally NOT on the tiles; they live in the info window, the single
 * detail surface across the app.
 *
 * Data: the real WFCD bounty tables via useAllGiverBounties → db.dropLocations
 * (populated once by DropDataService.init on launch). Until that lands — or when
 * a giver simply has no active jobs — the board shows a quiet empty state.
 *
 * NOTE: this component does NOT change the enrichment/data logic — only the
 * presentation (uniform tile pool + stages strip).
 */

import { memo, useState, useEffect, useMemo } from 'react';
import { ItemTile, type ItemTag, type ItemTileTone } from '@/components/ui/ItemTile';
import type { QuickLookDropRow } from '@/store/quickLook';
import type { EnrichedBounty, EnrichedBountyReward, EnrichedBountyRotation, BountyRewardRarity } from '@/core/domain/bounty';
import type { RotationTier } from '@/core/domain/drops';
import type { GiverBounties } from '../hooks/useAllGiverBounties';
import styles from './BountyBoard.module.css';

// Single accent — jade — to stay consistent with the Codex (no per-world rainbow).
const JADE = 'var(--color-accent-jade)';

// ─── "Why run this?" editorial ────────────────────────────────────────────────

const ITEM_PITCH: [RegExp, string][] = [
  [/\bAya\b/i,            'Best source of Aya — trades toward Prime Vault items.'],
  [/arcane energize/i,    'Highest-value Eidolon arcane. Night only.'],
  [/arcane/i,             'Arcanes drop here — strong endgame alternatives.'],
  [/scintillant/i,        'Scintillant is rare; vaults are the best source.'],
  [/voidplume/i,          'Primary Holdfast standing currency — prioritise Lv.3.'],
  [/incarnon genesis/i,   'Incarnon weapon upgrade — limited weekly rotation.'],
  [/toroid/i,             'Core Corpus standing currency on Vallis.'],
  [/gyromag systems/i,    'Profit-Taker component — farm during Heist bounties.'],
];

function whyRunThis(bounty: EnrichedBounty): string {
  const allNames = bounty.rotations.flatMap((r) => r.rewards.map((rw) => rw.itemName));
  for (const [pattern, pitch] of ITEM_PITCH) {
    if (allNames.some((n) => pattern.test(n))) return pitch;
  }
  const maxLv = bounty.enemyLevels[1] ?? 0;
  if (bounty.isSteelPath || maxLv > 50) return 'High enemy level — best drop weights for rare rewards.';
  if (maxLv <= 25) return 'Quick clear — good for stacking standing between high-value runs.';
  return 'Balanced standing-to-time ratio. Solid mid-session option.';
}

// ─── Rarity ordering ──────────────────────────────────────────────────────────

const RARITY_RANK: Record<BountyRewardRarity, number> = { Rare: 3, Uncommon: 2, Common: 1, Unknown: 0 };

/** Order stages: Stage 1 → 2/3 → 4 → Final. */
function stageRank(stage: string): number {
  if (/final/i.test(stage)) return 99;
  const m = /\d+/.exec(stage);
  return m ? Number(m[0]) : 50;
}

// ─── Pool dedupe ──────────────────────────────────────────────────────────────

/** Stable identity for an item — uniqueName when present, else its display name. */
function rewardKey(r: EnrichedBountyReward): string {
  return r.uniqueName ?? r.itemName;
}

/**
 * One deduped tile in the pool. We collect every occurrence across ALL rotations
 * + stages so we can (a) pick the best rarity for the tile tint and (b) compute
 * which rotation letters the item appears in for its tags.
 */
interface PoolTile {
  key:         string;
  itemName:    string;
  uniqueName?: string;
  /** Highest-rarity occurrence (drives the tile's rarity tint). */
  bestRarity:  BountyRewardRarity;
  /** Highest chance across all occurrences (secondary sort only — never shown). */
  bestChance:  number;
  /** Distinct non-null rotation letters this item appears in, ordered A→B→C. */
  rotations:   RotationTier[];
  /** True when the item appears in at least one flat (null-tier) rotation. */
  hasFlat:     boolean;
  /** Every occurrence (stage + rotation + chance) — feeds the info window. */
  occurrences: { stage: string; tier: RotationTier | null; chance: number }[];
}

const ROT_ORDER: Record<RotationTier, number> = { A: 0, B: 1, C: 2 } as Record<RotationTier, number>;

/**
 * The rotations to actually SHOW. A bounty board sits on ONE live rotation at a
 * time (the "Table"); only that rotation's items — plus any flat/always-drop
 * pool — can drop until the board refreshes (~2.5h). So when we know the live
 * rotation we render just it; otherwise (static givers, older data) we fall back
 * to every rotation so the board is never blank.
 */
function visibleRotations(bounty: EnrichedBounty): EnrichedBountyRotation[] {
  const live = bounty.liveRotation;
  if (!live) return bounty.rotations;
  const filtered = bounty.rotations.filter((r) => r.tier === live || r.tier === null);
  return filtered.length ? filtered : bounty.rotations;
}

/**
 * Dedupe the given rotations' rewards (across every stage) into one tile per
 * unique item (by uniqueName ?? itemName). For each tile we gather the distinct
 * rotation letters it occurs in plus a flat-pool flag.
 */
function buildPool(rotations: EnrichedBountyRotation[]): PoolTile[] {
  const map = new Map<string, PoolTile>();
  for (const rot of rotations) {
    for (const r of rot.rewards) {
      const key = rewardKey(r);
      let t = map.get(key);
      if (!t) {
        t = {
          key,
          itemName:   r.itemName,
          uniqueName: r.uniqueName,
          bestRarity: r.tier,
          bestChance: r.chance,
          rotations:  [],
          hasFlat:    false,
          occurrences: [],
        };
        map.set(key, t);
      }
      if (RARITY_RANK[r.tier] > RARITY_RANK[t.bestRarity]) t.bestRarity = r.tier;
      if (r.chance > t.bestChance) t.bestChance = r.chance;
      t.occurrences.push({ stage: r.stage ?? 'Rewards', tier: rot.tier, chance: r.chance });
      if (rot.tier === null) {
        t.hasFlat = true;
      } else if (!t.rotations.includes(rot.tier)) {
        t.rotations.push(rot.tier);
      }
    }
  }
  for (const t of map.values()) {
    t.rotations.sort((a, b) => ROT_ORDER[a] - ROT_ORDER[b]);
  }
  // Sort tiles: rarity desc, then best chance desc, then name.
  return [...map.values()].sort(
    (a, b) =>
      RARITY_RANK[b.bestRarity] - RARITY_RANK[a.bestRarity] ||
      b.bestChance - a.bestChance ||
      a.itemName.localeCompare(b.itemName),
  );
}

/** Rotation letter → ItemTile tone (A/B/C are first-class tones). */
function rotTone(tier: RotationTier): ItemTileTone {
  return tier as ItemTileTone;
}

/**
 * Map a PoolTile's rotation membership into ItemTile tags.
 *
 * `liveActive` = the board is showing ONE current rotation. Then the letter is
 * redundant (a board-level "Rotation B — live" badge already says it) — we only
 * tag the always-drop (flat) items as "ALL ROTATIONS" so the player can tell
 * the non-rotating rewards apart. Without a live rotation we fall back to the
 * full A/B/C letter tags so the player can read every rotation at once.
 */
function tileTags(tile: PoolTile, liveActive: boolean): ItemTag[] {
  if (liveActive) {
    return tile.hasFlat && tile.rotations.length === 0
      ? [{ label: 'ALL ROTATIONS', tone: 'muted' }]
      : [];
  }
  const tags: ItemTag[] = tile.rotations.map((tier) => ({ label: tier, tone: rotTone(tier) }));
  if (tile.hasFlat) tags.push({ label: 'POOL', tone: 'muted' });
  return tags;
}

/** Lowercased rarity for ItemTile's `rarity` prop. */
function tileRarity(tier: BountyRewardRarity): 'rare' | 'uncommon' | 'common' | 'unknown' {
  return tier.toLowerCase() as 'rare' | 'uncommon' | 'common' | 'unknown';
}

/** This item's per-stage/rotation rows for the info window (sorted by stage). */
function dropRows(tile: PoolTile): QuickLookDropRow[] {
  return tile.occurrences
    .slice()
    .sort((a, b) => stageRank(a.stage) - stageRank(b.stage) || b.chance - a.chance)
    .map((o) => ({ label: o.tier ? `${o.stage} · Rot ${o.tier}` : o.stage, chance: o.chance }));
}

// ─── Board ────────────────────────────────────────────────────────────────────

interface BountyBoardProps {
  /** The selected place's giver. Null → no bounties for this place. */
  giver:       GiverBounties | null;
  emptyReason: string;
}

export const BountyBoard = memo(function BountyBoard({ giver, emptyReason }: BountyBoardProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const bounties = giver?.bounties ?? [];
  const accent   = JADE;

  // Reset the tier selection when the giver changes.
  useEffect(() => { setSelectedIdx(0); }, [giver?.id]);
  useEffect(() => {
    if (selectedIdx >= bounties.length) setSelectedIdx(0);
  }, [bounties.length, selectedIdx]);

  const selectedBounty = bounties[selectedIdx] ?? null;

  // The board sits on ONE live rotation; show just it (+ any always-drop pool).
  const liveActive = !!selectedBounty?.liveRotation;
  const visRots = useMemo(
    () => (selectedBounty ? visibleRotations(selectedBounty) : []),
    [selectedBounty],
  );
  // One deduped tile per unique item across the visible rotation(s) + stages.
  const pool = useMemo(() => buildPool(visRots), [visRots]);
  const why  = useMemo(() => (selectedBounty ? whyRunThis(selectedBounty) : ''), [selectedBounty]);
  // Honest stage view: per-stage objectives are randomised in-game (not in the
  // data), so we show only the COUNT as numbered pips.
  const stageCount = selectedBounty?.stageCount ?? 0;

  // ── Empty state — this place has no loaded bounty data yet ───────────────────
  if (!giver || bounties.length === 0) {
    return (
      <div className={styles.bountyEmpty}>
        <span className={styles.bountyEmptyGlyph} aria-hidden="true">◇</span>
        <span className={styles.bountyEmptyText}>{emptyReason}</span>
      </div>
    );
  }

  // ── Board ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.bounty} style={{ ['--accent' as string]: accent } as React.CSSProperties}>
      <div className={styles.bountyHead}>
        <span className="typo-section-label">BOUNTIES · {giver.npc.toUpperCase()}</span>
        {selectedBounty && selectedBounty.standingTotal > 0 && (
          <span className={styles.bountyRep}>{selectedBounty.standingTotal.toLocaleString()} standing</span>
        )}
      </div>

      <div className={styles.tierStrip} role="tablist" aria-label="Bounty tiers">
        {bounties.map((b, i) => (
          <button
            key={b.jobType}
            role="tab"
            aria-selected={i === selectedIdx}
            className={styles.tier}
            data-active={i === selectedIdx || undefined}
            title={b.jobType}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setSelectedIdx(i)}
          >
            <span className={styles.tierLabel}>{b.tierLabel}</span>
            {b.kindBadge && <span className={styles.tierBadge} data-kind={b.kind}>{b.kindBadge}</span>}
          </button>
        ))}
      </div>

      {selectedBounty && (
        <>
          <div className={styles.bountyNameRow}>
            <span className={styles.bountyName}>{selectedBounty.name}</span>
            {selectedBounty.kindBadge && (
              <span className={styles.tierBadge} data-kind={selectedBounty.kind}>{selectedBounty.kindBadge}</span>
            )}
            {liveActive && (
              <span className={styles.rotationBadge} title="The reward table the board is on right now — only these rewards drop until it refreshes.">
                <span className={styles.rotationDot} aria-hidden="true" />
                Rotation {selectedBounty.liveRotation} · live
              </span>
            )}
            <span className={styles.bountyNameLvl}>Lv {selectedBounty.enemyLevels[0]}–{selectedBounty.enemyLevels[1]}</span>
          </div>
          <p className={styles.bountyWhy}>{why}</p>

          {/* Stages strip — honest COUNT only. Per-stage objectives are
              randomised in-game and not in the data, so we show numbered pips,
              not fabricated objective text.
              LATER: a GIF-on-hover preview of each stage can hook in per pip,
              keyed off data-stage. The pips are NOT selectable for now. */}
          {stageCount > 0 && (
            <div className={styles.stageStrip} aria-label={`${stageCount} stages`}>
              {Array.from({ length: stageCount }, (_, i) => (
                <span key={i} className={styles.stageChip} data-stage={i + 1}>
                  {i + 1}
                </span>
              ))}
              <span className={styles.stageStripLabel}>stages</span>
            </div>
          )}

          {pool.length > 0 ? (
            <div className={styles.tilesGrid}>
              {pool.map((t) => (
                <ItemTile
                  key={t.key}
                  name={t.itemName}
                  uniqueName={t.uniqueName}
                  tags={tileTags(t, liveActive)}
                  rarity={tileRarity(t.bestRarity)}
                  context={{
                    source: `${giver.npc} · ${selectedBounty.name} · Lv ${selectedBounty.enemyLevels[0]}–${selectedBounty.enemyLevels[1]}`,
                    drops: dropRows(t),
                  }}
                />
              ))}
            </div>
          ) : (
            <span className={styles.tilesEmpty}>No reward data for this tier.</span>
          )}
        </>
      )}
    </div>
  );
});
