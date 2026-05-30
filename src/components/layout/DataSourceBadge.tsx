import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { DataSource } from '@/core/domain/tennoplanApi';

// ---------------------------------------------------------------------------
// DataSourceBadge
//
// Small cinematic pill in the Header that reveals which upstream is currently
// feeding the V2 ParsedWorldstate snapshot:
//
//   WS        — warframestat.us (community-parsed — healthy path)
//   OFFICIAL  — api.warframe.com via warframe-worldstate-parser (fallback)
//   CACHED    — Dexie last-good snapshot (network was unreachable)
//   FALLBACK  — Worker's cycle-math projection (both upstreams unavailable)
//
// WorldstateSync writes db.syncMetadata['worldstate'].source on every
// successful sync (200 OR 304), so this badge reacts live to the Worker
// swapping upstreams without any payload change. useLiveQuery re-renders
// as soon as the metadata row is touched.
//
// When no metadata exists yet (first-run, pre-sync), we render nothing —
// the Header already has SystemPulse + breadcrumb, so an empty badge slot
// is quieter than a placeholder "…" that tells the user nothing.
// ---------------------------------------------------------------------------

const GOLD = '#DBB058';

interface BadgeSpec {
  label:      string;
  title:      string;
  isFallback: boolean;
}

/** Spec table per V2 DataSource. Sources we don't expect for worldstate
 *  (calamity-plus, wfcd, enriched — those are codex-side) collapse into
 *  the "WS" healthy branding so the badge never renders garbage. */
const BADGE_SPEC: Record<DataSource, BadgeSpec> = {
  warframestat: {
    label:      'WS',
    title:      'Source: warframestat.us (primary). Community-parsed worldstate — healthy path.',
    isFallback: false,
  },
  official: {
    label:      'OFFICIAL',
    title:      'Source: api.warframe.com via worldstate-parser (fallback). warframestat.us was unreachable; data is served from the official Warframe API.',
    isFallback: true,
  },
  cached: {
    label:      'CACHED',
    title:      'Source: Dexie last-good snapshot. Network was unreachable; data is served from the local cache.',
    isFallback: true,
  },
  fallback: {
    label:      'FALLBACK',
    title:      'Source: Worker cycle-math projection. Both upstreams unavailable — cycle states are extrapolated from the last known phase.',
    isFallback: true,
  },
  'calamity-plus': {
    label:      'WS',
    title:      'Source: calamity-plus enriched worldstate.',
    isFallback: false,
  },
  wfcd: {
    label:      'WS',
    title:      'Source: WFCD community data.',
    isFallback: false,
  },
  enriched: {
    label:      'WS',
    title:      'Source: enriched worldstate.',
    isFallback: false,
  },
};

export function DataSourceBadge() {
  const source = useLiveQuery(
    async (): Promise<DataSource | null> => {
      const meta = await db.syncMetadata.get('worldstate');
      return meta?.source ?? null;
    },
    [],
    null,
  );

  if (!source) return null;

  const spec = BADGE_SPEC[source];
  if (!spec) return null;
  const { isFallback } = spec;

  return (
    <span
      title={spec.title}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        height:        20,
        padding:       '0 8px',
        borderRadius:  2,
        border:        `1px solid ${isFallback ? `${GOLD}55` : 'rgba(219, 176, 88,0.20)'}`,
        background:    isFallback ? `${GOLD}14` : 'transparent',
        fontFamily:    'var(--font-label)',
        fontSize:      '9px',
        fontWeight:    700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color:         isFallback ? GOLD : 'rgba(219, 176, 88,0.55)',
        textShadow:    isFallback
          ? '0 1px 3px rgba(219, 176, 88,0.25), 0 0 8px rgba(219, 176, 88,0.15)'
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
