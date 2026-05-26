/**
 * DropsBlock — exhaustive drop locations grouped by source.
 *
 * Companion block to BestFarmsBlock. Where BestFarms shows the curated
 * top-5 efficiency picks, DropsBlock shows the complete table so the
 * player can audit alternatives, compare rotations, or hunt the rare
 * Steel Path variant.
 *
 * Layout: grouped by sourceName (Mission / Void Fissure / Bounty / …),
 * within each group sorted by chance descending. Showing > 12 rows
 * collapses behind an expander to keep the page calm; the user can
 * always opt into the firehose.
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CodexEntry } from '../../types';
import type { TpDropLocation } from '@/core/domain/tennoplanApi';
import styles from './DropsBlock.module.css';

const COLLAPSE_THRESHOLD = 12;

interface DropsBlockProps {
  entry: CodexEntry;
}

export function DropsBlock({ entry }: DropsBlockProps) {
  const drops = entry.dropLocations;
  const [expanded, setExpanded] = useState(false);

  const groups = useMemo(() => groupBySource(drops ?? []), [drops]);
  const totalRows = groups.reduce((acc, g) => acc + g.rows.length, 0);

  if (totalRows === 0) return null;

  // When over threshold, slice each group proportionally to keep
  // representation across all sources rather than dumping one group's tail.
  const visibleGroups = expanded || totalRows <= COLLAPSE_THRESHOLD
    ? groups
    : truncateGroups(groups, COLLAPSE_THRESHOLD);

  return (
    <section className={styles.root} aria-labelledby="codex-drops-label">
      <h2 id="codex-drops-label" className={styles.label}>Drop Locations</h2>

      {visibleGroups.map((group) => (
        <div key={group.source} className={styles.group}>
          <div className={styles.groupHeading}>
            <span className={styles.groupName}>{group.source}</span>
            <span className={styles.groupCount}>
              {group.rows.length} {group.rows.length === 1 ? 'source' : 'sources'}
            </span>
          </div>
          <ul className={styles.rows}>
            {group.rows.map((row, i) => (
              <DropRow key={`${row.location}-${i}`} drop={row} />
            ))}
          </ul>
        </div>
      ))}

      {totalRows > COLLAPSE_THRESHOLD && (
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? <>Show fewer <ChevronUp size={13} strokeWidth={2.25} /></>
              : <>Show all {totalRows} sources <ChevronDown size={13} strokeWidth={2.25} /></>}
          </button>
        </div>
      )}
    </section>
  );
}

function DropRow({ drop }: { drop: TpDropLocation }) {
  const chancePct = (drop.chance * 100).toFixed(2);
  return (
    <li className={styles.row}>
      <span className={styles.location}>{drop.location}</span>
      <span className={styles.rotation}>
        {drop.rotation ? `Rot ${drop.rotation}` : ''}
      </span>
      {drop.isSteelPath
        ? <span className={`${styles.tag} ${styles['tag--sp']}`}>SP</span>
        : <span className={styles.rotation} />}
      <span className={styles.chance}>{chancePct}%</span>
    </li>
  );
}

// ─── Grouping ───────────────────────────────────────────────────────────────

interface DropGroup {
  source: string;
  rows:   TpDropLocation[];
}

function groupBySource(drops: readonly TpDropLocation[]): DropGroup[] {
  const map = new Map<string, TpDropLocation[]>();
  for (const d of drops) {
    const arr = map.get(d.sourceName) ?? [];
    arr.push(d);
    map.set(d.sourceName, arr);
  }
  return [...map.entries()]
    .map(([source, rows]) => ({
      source,
      rows: [...rows].sort((a, b) => b.chance - a.chance),
    }))
    .sort((a, b) => {
      // Order groups by best chance in each — players want the best lead first.
      const bestA = a.rows[0]?.chance ?? 0;
      const bestB = b.rows[0]?.chance ?? 0;
      return bestB - bestA;
    });
}

function truncateGroups(groups: DropGroup[], cap: number): DropGroup[] {
  // Roughly equal slice per group, prioritising at least one row per group
  // so the user still sees the breadth of sources before expanding.
  const perGroup = Math.max(1, Math.floor(cap / groups.length));
  const trimmed: DropGroup[] = [];
  let remaining = cap;
  for (const g of groups) {
    const take = Math.min(g.rows.length, perGroup, remaining);
    if (take === 0) break;
    trimmed.push({ source: g.source, rows: g.rows.slice(0, take) });
    remaining -= take;
    if (remaining <= 0) break;
  }
  return trimmed;
}
