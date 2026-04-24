import { formatMs, formatMsHuman } from '@/core/services/cycleService';
import type { VoidTraderStatus } from '@/core/domain/railFeed';

export interface VoidTraderCardProps {
  status: VoidTraderStatus;
}

export function VoidTraderCard({ status }: VoidTraderCardProps) {
  const { trader, msUntilArrival, msUntilDeparture, isActive } = status;

  if (!isActive) {
    return (
      <div
        className="glass-panel relative overflow-hidden p-6 flex items-center gap-8"
        style={{
          background:  'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.60) 60%, rgba(24,23,23,0.75) 100%)',
          borderColor: 'rgba(227,195,114,0.12)',
          borderTop:   '1px solid rgba(227,195,114,0.20)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(227,195,114,0.04), transparent 55%)' }}
        />
        <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
          style={{ borderTop: '1px solid rgba(227,195,114,0.35)', borderLeft: '1px solid rgba(227,195,114,0.35)' }}
        />

        {/* Left: labels */}
        <div className="flex-1 min-w-0">
          <p data-role="labelTiny" className="typo-label-xs mb-1" style={{ color: '#e3c372', opacity: 0.40 }}>
            Void Trader
          </p>
          <h3 data-role="hero" className="typo-hero orokin-etched" style={{ color: '#e5e2e1' }}>
            {trader.character.toUpperCase()}
          </h3>
          <p data-role="body" className="typo-body mt-1" style={{ color: '#C6C6C7', opacity: 0.45 }}>
            Next visit: {trader.location}
          </p>
        </div>

        {/* Right: arrival countdown */}
        <div className="text-right flex-shrink-0">
          <p data-role="labelTiny" className="typo-label-xs mb-1" style={{ color: '#e3c372', opacity: 0.40 }}>
            Arrives in
          </p>
          <p className="font-mono text-4xl font-bold tabular-nums leading-none text-primary">
            {formatMsHuman(msUntilArrival)}
          </p>
          <p data-role="labelTiny" className="typo-label-xs mt-1" style={{ color: '#e3c372', opacity: 0.30 }}>
            not yet on station
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-panel relative overflow-hidden p-6"
      style={{
        background:  'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.55) 50%, rgba(24,23,23,0.70) 100%)',
        borderColor: 'rgba(227,195,114,0.20)',
        borderTop:   '2px solid rgba(227,195,114,0.35)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 10% 50%, rgba(227,195,114,0.06), transparent 55%)' }}
      />
      <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: '1px solid rgba(227,195,114,0.45)', borderLeft: '1px solid rgba(227,195,114,0.45)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p data-role="labelTiny" className="typo-label-xs mb-0.5" style={{ color: '#e3c372', opacity: 0.40 }}>
            Void Trader · On Station
          </p>
          <h3 data-role="hero" className="typo-hero orokin-etched" style={{ color: '#e3c372' }}>
            {trader.character.toUpperCase()}
          </h3>
          <p data-role="labelSmall" className="typo-label-sm mt-0.5" style={{ color: '#C6C6C7', opacity: 0.45 }}>
            {trader.location}
          </p>
        </div>
        <div className="text-right">
          <p data-role="labelTiny" className="typo-label-xs mb-0.5" style={{ color: '#e3c372', opacity: 0.40 }}>
            Departs in
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums leading-none text-primary">
            {formatMs(msUntilDeparture)}
          </p>
        </div>
      </div>

      {/* Inventory grid */}
      {trader.inventory.length > 0 ? (
        <div className="grid grid-cols-12 gap-3">
          {trader.inventory.slice(0, 12).map((item, i) => (
            <div
              key={i}
              className="col-span-3 p-3 relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(197,192,190,0.04)',
                border:          '1px solid rgba(227,195,114,0.10)',
              }}
            >
              <p
                data-role="body"
                className="typo-body leading-snug mb-2 line-clamp-2"
                style={{ color: '#e5e2e1' }}
              >
                {item.item}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] tabular-nums font-bold" style={{ color: '#E3C372' }}>
                  {item.ducats}
                  <span className="font-label text-[7px] ml-0.5 opacity-60">duc</span>
                </span>
                <span className="font-mono text-[9px] tabular-nums" style={{ color: '#C6C6C7', opacity: 0.40 }}>
                  {item.credits.toLocaleString()}cr
                </span>
              </div>
            </div>
          ))}
          {trader.inventory.length > 12 && (
            <div className="col-span-12 text-center">
              <p data-role="labelTiny" className="typo-label-xs opacity-30">
                +{trader.inventory.length - 12} more items
              </p>
            </div>
          )}
        </div>
      ) : (
        <p data-role="body" className="typo-body text-secondary/30">
          No inventory data available.
        </p>
      )}
    </div>
  );
}
