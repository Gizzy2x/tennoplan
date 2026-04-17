import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import {
  WS_SOURCE_KEY,
  type WorldstateSource,
} from '@/adapters/storage/worldstateCache';

// ---------------------------------------------------------------------------
// DataSourceBadge
//
// Small cinematic pill in the Header that reveals which upstream is currently
// feeding the worldstate_master cache:
//
//   WS        — warframestat.us (primary, community-parsed — healthy path)
//   OFFICIAL  — api.warframe.com via warframe-worldstate-parser (fallback)
//
// SyncService writes WS_SOURCE_KEY on every successful sync (200 OR 304), so
// this badge reacts live to the Worker swapping upstreams without any payload
// change. useLiveQuery re-renders as soon as Dexie's cache row is touched.
//
// When no source tag exists yet (first-run, pre-sync), we render nothing — the
// Header already has SystemPulse + breadcrumb, so an empty badge slot is
// quieter than a placeholder "…" that tells the user nothing.
// ---------------------------------------------------------------------------

const GOLD = '#E3C372';

interface BadgeSpec {
  label:  string;
  title:  string;
}

const BADGE_SPEC: Record<WorldstateSource, BadgeSpec> = {
  warframestat: {
    label: 'WS',
    title: 'Source: warframestat.us (primary). Community-parsed worldstate — healthy path.',
  },
  official: {
    label: 'OFFICIAL',
    title: 'Source: api.warframe.com via worldstate-parser (fallback). warframestat.us was unreachable; data is served from the official Warframe API.',
  },
};

export function DataSourceBadge() {
  const source = useLiveQuery(
    async (): Promise<WorldstateSource | null> => {
      const entry = await db.cache.get(WS_SOURCE_KEY);
      return entry ? (entry.data as WorldstateSource) : null;
    },
    [],
    null,
  );

  if (!source) return null;

  const spec       = BADGE_SPEC[source];
  const isFallback = source === 'official';

  return (
    <span
      title={spec.title}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        height:        20,
        padding:       '0 8px',
        borderRadius:  2,
        border:        `1px solid ${isFallback ? `${GOLD}55` : 'rgba(227,195,114,0.20)'}`,
        background:    isFallback ? `${GOLD}14` : 'transparent',
        fontFamily:    'var(--font-label)',
        fontSize:      '9px',
        fontWeight:    700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color:         isFallback ? GOLD : 'rgba(227,195,114,0.55)',
        textShadow:    isFallback
          ? '0 1px 3px rgba(227,195,114,0.25), 0 0 8px rgba(227,195,114,0.15)'
          : 'none',
        whiteSpace:    'nowrap',
        flexShrink:    0,
        userSelect:    'none',
        cursor:        'help',
      }}
    >
      {spec.label}
    </span>
  );
}
