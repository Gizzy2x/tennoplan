import { formatMsParts } from '@/core/services/cycleService';
import type { CycleId, CycleStatus } from '@/core/domain/cycles';
import { STATE, FALLBACK } from './CycleCard';

interface WorldSelectorTabsProps {
  statuses:   CycleStatus[];
  selectedId: CycleId;
  onSelect:   (id: CycleId) => void;
}

export function WorldSelectorTabs({ statuses, selectedId, onSelect }: WorldSelectorTabsProps) {
  return (
    <div
      style={{
        display:              'flex',
        background:           'rgba(8,6,4,0.82)',
        borderBottom:         '1px solid rgba(227,195,114,0.10)',
        backdropFilter:       'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        flexShrink:           0,
        zIndex:               10,
      }}
    >
      {statuses.map(status => {
        const pres     = STATE[status.cycle.state] ?? FALLBACK;
        const isActive = status.cycle.id === selectedId;
        const { h, m, s } = formatMsParts(status.msRemaining);

        // Show h+m when more than an hour, else m+s
        const timeStr = h !== '00'
          ? `${parseInt(h, 10)}H ${parseInt(m, 10)}M`
          : `${parseInt(m, 10)}M ${parseInt(s, 10)}S`;

        return (
          <button
            key={status.cycle.id}
            onClick={() => onSelect(status.cycle.id)}
            style={{
              flex:           1,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            6,
              padding:        '9px 6px',
              borderRight:    '1px solid rgba(227,195,114,0.07)',
              borderTop:      isActive ? `2px solid ${pres.color}` : '2px solid transparent',
              background:     isActive ? `${pres.color}0C` : 'transparent',
              cursor:         'pointer',
              minWidth:       0,
              transition:     'background 0.18s, border-color 0.18s',
            }}
          >
            {/* State icon */}
            <span
              style={{
                fontSize:   '0.72rem',
                color:      pres.color,
                opacity:    isActive ? 0.92 : 0.40,
                flexShrink: 0,
                transition: 'opacity 0.18s',
                lineHeight: 1,
              }}
            >
              {pres.icon}
            </span>

            {/* Location name (e.g. "Cetus", not full "Plains of Eidolon") */}
            <span
              style={{
                fontFamily:    'var(--font-body)',
                fontSize:      '0.52rem',
                fontWeight:    600,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                color:         isActive ? 'rgba(229,226,225,0.92)' : 'rgba(198,198,199,0.32)',
                overflow:      'hidden',
                textOverflow:  'ellipsis',
                whiteSpace:    'nowrap',
                transition:    'color 0.18s',
              }}
            >
              {status.cycle.location}
            </span>

            {/* Time remaining */}
            <span
              style={{
                fontFamily:    'var(--font-body)',
                fontSize:      '0.50rem',
                fontWeight:    500,
                letterSpacing: '0.10em',
                color:         pres.color,
                opacity:       isActive ? 0.88 : 0.32,
                flexShrink:    0,
                whiteSpace:    'nowrap',
                transition:    'opacity 0.18s',
              }}
            >
              {timeStr}
            </span>
          </button>
        );
      })}
    </div>
  );
}
