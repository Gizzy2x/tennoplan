/**
 * WikiFooterBlock — attribution + outbound wiki link.
 *
 * Renders even when the entry has no `wikiUrl` — the attribution line
 * still appears, and the link block falls back to a generic Codex
 * wiki search URL. Once Phase B's wiki augmenter is live, every
 * entry should carry a deep link.
 *
 * Opening uses target=_blank with rel safety attributes. Tauri
 * intercepts external navigation per its capabilities config.
 */

import { ExternalLink } from 'lucide-react';
import type { CodexEntry } from '../../types';
import styles from './WikiFooterBlock.module.css';

interface WikiFooterBlockProps {
  entry: CodexEntry;
}

export function WikiFooterBlock({ entry }: WikiFooterBlockProps) {
  const url = entry.wikiUrl ?? buildSearchUrl(entry.name);
  return (
    <footer className={styles.root}>
      <span className={styles.attribution}>
        Wiki excerpts and outbound links are sourced from the{' '}
        <strong>Warframe Wiki</strong> under{' '}
        <strong>CC BY-SA 4.0</strong>. Hard data is sourced from DE's Public
        Export.
      </span>
      <a
        className={styles.link}
        href={url}
        target="_blank"
        rel="noopener noreferrer external"
      >
        View on Wiki
        <ExternalLink size={12} strokeWidth={2.25} />
      </a>
    </footer>
  );
}

function buildSearchUrl(name: string): string {
  // Wiki page slugs use underscores for spaces; the search endpoint
  // gracefully handles either, so we err on slug for stable behavior.
  const slug = encodeURIComponent(name.replace(/\s+/g, '_'));
  return `https://wiki.warframe.com/w/${slug}`;
}
