/**
 * StatsWarframeBlock — 5-stat horizontal strip for Warframe entries.
 *
 * Stats sourced from entry.stats (populated by the worker enricher
 * from calamity raw `health`, `shield`, `armor`, `power`, `sprint`).
 * Each value is base-rank-30 (DE's canonical "rank 30" figure) — we
 * surface the raw number; modding math lives in build planning, not
 * the codex.
 *
 * If `entry.stats` is absent (item shape not extracted, or a non-
 * warframe entry routed here by mistake), the block renders nothing.
 */

import type { CodexEntry } from '../../types';
import styles from './StatsWarframeBlock.module.css';

interface StatsWarframeBlockProps {
  entry: CodexEntry;
}

interface StatRow {
  key:   string;
  name:  string;
  value: number;
  unit?: string;
}

export function StatsWarframeBlock({ entry }: StatsWarframeBlockProps) {
  const s = entry.stats;
  if (!s) return null;

  const rows: StatRow[] = [];
  if (s.health      != null) rows.push({ key: 'health',  name: 'Health', value: s.health });
  if (s.shield      != null) rows.push({ key: 'shield',  name: 'Shield', value: s.shield });
  if (s.armor       != null) rows.push({ key: 'armor',   name: 'Armor',  value: s.armor });
  if (s.energy      != null) rows.push({ key: 'energy',  name: 'Energy', value: s.energy });
  if (s.sprintSpeed != null) {
    rows.push({ key: 'sprint', name: 'Sprint', value: s.sprintSpeed, unit: '×' });
  }

  if (rows.length === 0) return null;

  return (
    <section className={styles.root} aria-label="Warframe base stats">
      <h2 className={styles.label}>Base Stats (Rank 30)</h2>
      <div className={styles.grid}>
        {rows.map((r) => (
          <div key={r.key} className={styles.stat}>
            <span className={styles.statName}>{r.name}</span>
            <span className={styles.statValue}>
              {formatStat(r.value)}
              {r.unit && <span className={styles.statUnit}>{r.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatStat(n: number): string {
  // Most warframe stats are whole numbers; sprint speed is the lone
  // decimal. Two-decimal precision covers it.
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2);
}
