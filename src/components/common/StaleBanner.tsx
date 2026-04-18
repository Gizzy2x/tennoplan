/**
 * StaleBanner — global banner shown when static drop data is stale or missing.
 *
 * Renders as a slim bar above page content. Dismisses automatically when
 * staleInfo.isStale becomes false (i.e. after a successful sync).
 * The "Open Settings" link navigates to the Settings tab via Zustand.
 */

import { useNavigationStore } from '@/store/navigation';
import type { StaleInfo } from '@/adapters/api/DropDataService';

interface StaleBannerProps {
  staleInfo: StaleInfo;
}

export function StaleBanner({ staleInfo }: StaleBannerProps) {
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);

  if (!staleInfo.isStale) return null;

  const isNeverSynced = staleInfo.daysOld === Infinity;

  return (
    <div
      role="alert"
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        '6px 20px',
        background:     'rgba(30, 25, 10, 0.92)',
        borderBottom:   '1px solid rgba(227,195,114,0.18)',
        zIndex:         45,
        flexShrink:     0,
      }}
    >
      {/* Amber dot */}
      <span
        style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   'rgba(251, 191, 36, 0.70)',
          flexShrink:   0,
        }}
      />

      {/* Message */}
      <p
        style={{
          fontFamily:    'var(--font-label)',
          fontSize:      '0.40rem',
          fontWeight:    700,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color:         'rgba(251,191,36,0.75)',
          flex:          1,
          margin:        0,
        }}
      >
        {isNeverSynced
          ? 'Drop data unavailable — sync required for accurate bounty drops'
          : `Drop data ${staleInfo.daysOld}d old — refresh recommended`}
      </p>

      {/* CTA */}
      <button
        onClick={() => setActiveTab('settings')}
        style={{
          fontFamily:    'var(--font-label)',
          fontSize:      '0.38rem',
          fontWeight:    700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         'rgba(227,195,114,0.70)',
          border:        '1px solid rgba(227,195,114,0.22)',
          background:    'transparent',
          padding:       '2px 8px',
          cursor:        'pointer',
          flexShrink:    0,
          transition:    'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(227,195,114,0.95)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(227,195,114,0.50)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(227,195,114,0.70)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(227,195,114,0.22)';
        }}
      >
        Open Settings →
      </button>
    </div>
  );
}
