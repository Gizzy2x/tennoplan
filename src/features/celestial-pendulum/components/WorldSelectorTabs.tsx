import type { CycleStatus } from '@/core/domain/cycles';
import { STATE, FALLBACK } from './CycleCard';

interface WorldSelectorTabsProps {
  statuses: CycleStatus[];
}

export function WorldSelectorTabs({ statuses }: WorldSelectorTabsProps) {
  return (
    <div className="flex" style={{ borderTop: '1px solid rgba(227,195,114,0.12)' }}>
      {statuses.map(s => {
        const pres = STATE[s.cycle.state] ?? FALLBACK;
        return (
          <div
            key={s.cycle.id}
            className="flex-1 relative flex flex-col items-center justify-center py-3 px-2"
            style={{
              borderRight: '1px solid rgba(227,195,114,0.10)',
              minWidth: 0,
            }}
          >
            {/* Diamond ornament at top */}
            <span
              aria-hidden
              className="absolute"
              style={{
                top:       -6,
                left:      '50%',
                transform: 'translateX(-50%)',
                fontSize:  '0.45rem',
                color:     pres.color,
                opacity:   0.55,
              }}
            >
              ◆
            </span>

            <p
              className="font-label uppercase text-center"
              style={{
                fontSize:      'clamp(0.5rem, 0.75vw, 0.65rem)',
                letterSpacing: '0.35em',
                color:         'rgba(198,198,199,0.45)',
                whiteSpace:    'nowrap',
                overflow:      'hidden',
                textOverflow:  'ellipsis',
                maxWidth:      '100%',
              }}
            >
              {s.cycle.name}
            </p>

            <span
              className="font-label uppercase mt-0.5"
              style={{
                fontSize:      '0.5rem',
                letterSpacing: '0.25em',
                color:         pres.color,
                opacity:       0.65,
              }}
            >
              {pres.badge}
            </span>
          </div>
        );
      })}
    </div>
  );
}
