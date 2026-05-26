/**
 * PatchHistoryBlock — curated patch history excerpts.
 *
 * Source: WFCD's `patchlogs` array, flowed through the worker enricher.
 * Already dated, named, and forum-linked — we surface it as-is rather
 * than re-curating.
 *
 * UX: newest first; default shows DEFAULT_VISIBLE entries with a
 * "Show all N" expander that swaps to the full list. Each entry
 * categorises its content as Additions / Changes / Fixes via small
 * dot indicators — no border-left stripes (banned), no AI-color
 * palette (the dots use semantic-leaning hues, sparingly).
 *
 * Renders null when entry.patchHistory is empty, including pre-Phase-B
 * mod entries before the worker is redeployed.
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { CodexEntry } from '../../types';
import type { PatchLogEntry } from '@/core/domain/tennoplanApi';
import styles from './PatchHistoryBlock.module.css';

const DEFAULT_VISIBLE = 3;

interface PatchHistoryBlockProps {
  entry: CodexEntry;
}

export function PatchHistoryBlock({ entry }: PatchHistoryBlockProps) {
  const all = entry.patchHistory;
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    if (!all || all.length === 0) return [];
    // Newest first by date. WFCD already returns most data sorted, but
    // we defensively re-sort in case any upstream re-order slips in.
    return [...all].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [all]);

  if (sorted.length === 0) return null;

  const visible  = expanded ? sorted : sorted.slice(0, DEFAULT_VISIBLE);
  const overflow = Math.max(0, sorted.length - DEFAULT_VISIBLE);

  return (
    <section className={styles.root} aria-labelledby="codex-patches-label">
      <h2 id="codex-patches-label" className={styles.label}>Patch History</h2>

      <ol className={styles.list}>
        {visible.map((p, i) => (
          <PatchEntry key={`${p.date}-${i}`} log={p} />
        ))}
      </ol>

      {overflow > 0 && (
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? <>Show recent only <ChevronUp size={13} strokeWidth={2.25} /></>
              : <>Show all {sorted.length} <ChevronDown size={13} strokeWidth={2.25} /></>}
          </button>
        </div>
      )}
    </section>
  );
}

function PatchEntry({ log }: { log: PatchLogEntry }) {
  const date = useMemo(() => formatPatchDate(log.date), [log.date]);
  return (
    <li className={styles.entry}>
      <header className={styles.entryHeader}>
        <span className={styles.entryDate}>{date}</span>
        <span className={styles.entryName}>{log.name}</span>
        {log.url && (
          <a
            href={log.url}
            target="_blank"
            rel="noopener noreferrer external"
            className={styles.entryLink}
          >
            Forum post <ExternalLink size={10} strokeWidth={2.25} />
          </a>
        )}
      </header>

      <div className={styles.changes}>
        {log.additions && log.additions.trim().length > 0 && (
          <ChangeGroup intent="additions" body={log.additions} />
        )}
        {log.changes && log.changes.trim().length > 0 && (
          <ChangeGroup intent="changes" body={log.changes} />
        )}
        {log.fixes && log.fixes.trim().length > 0 && (
          <ChangeGroup intent="fixes" body={log.fixes} />
        )}
      </div>
    </li>
  );
}

interface ChangeGroupProps {
  intent: 'additions' | 'changes' | 'fixes';
  body:   string;
}

function ChangeGroup({ intent, body }: ChangeGroupProps) {
  const heading = {
    additions: 'Added',
    changes:   'Changed',
    fixes:     'Fixed',
  }[intent];

  return (
    <div className={styles.changeGroup}>
      <span className={clsx(styles.changeHeading, styles[`changeHeading--${intent}`])}>
        <span className={styles.changeDot} aria-hidden="true" />
        {heading}
      </span>
      <p className={styles.changeBody}>{body.trim()}</p>
    </div>
  );
}

function formatPatchDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year:  'numeric',
    month: 'short',
    day:   '2-digit',
  });
}
