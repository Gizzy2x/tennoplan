/**
 * GeneralInformationBlock — wiki-sourced warframe data sheet.
 *
 * Renders the per-frame metadata that lives in the wiki's
 * Module:Warframes/data but not in WFCD's /warframes payload:
 *   • Identity     — Sex, Themes, Playstyle
 *   • Mechanics    — Progenitor element, Subsumed (Helminth), Tactical ability
 *   • Economy      — Sell Price
 *
 * Intrinsic stats (Health / Shield / Energy / Starting Energy / Sprint)
 * live on the WarframeSummaryCard in the sticky right rail — this block
 * deliberately omits them to avoid duplicating the at-a-glance view.
 *
 * Returns null when no wiki fields are populated (e.g. Archwings, which
 * the wiki's `Warframes` block doesn't cover).
 */

import { type ReactNode } from 'react';
import type { CodexEntry } from '../../types';
import styles from './GeneralInformationBlock.module.css';

interface GeneralInformationBlockProps {
  entry: CodexEntry;
}

export function GeneralInformationBlock({ entry }: GeneralInformationBlockProps) {
  const rows = buildRows(entry);
  if (rows.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-general-info-label">
      <h2 id="codex-general-info-label" className="typo-section-label">General Information</h2>
      <dl className={styles.list}>
        {rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <dt className={styles.term}>{row.label}</dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

interface Row {
  label: string;
  value: ReactNode;
}

function buildRows(entry: CodexEntry): Row[] {
  const rows: Row[] = [];

  // ── Identity ──
  if (entry.sex)              rows.push({ label: 'Sex',       value: entry.sex });
  if (entry.themes)           rows.push({ label: 'Themes',    value: entry.themes });
  if (entry.playstyle?.length) {
    rows.push({ label: 'Playstyle', value: entry.playstyle.join(' · ') });
  }

  // ── Mechanics ──
  if (entry.progenitorElement) rows.push({ label: 'Progenitor', value: entry.progenitorElement });
  if (entry.tacticalAbility)   rows.push({ label: 'Tactical',   value: entry.tacticalAbility });
  if (entry.subsumedAbility)   rows.push({ label: 'Subsumed',   value: entry.subsumedAbility });

  // ── Economy ──
  if (typeof entry.sellPrice === 'number') {
    rows.push({
      label: 'Sell Price',
      value: <>{formatNumber(entry.sellPrice)}<span className={styles.unit}> cr</span></>,
    });
  }

  return rows;
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toFixed(2);
}
