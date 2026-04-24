import { Tag } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { getTypographyStyle } from '@/tokens/utils';
import { formatMsHuman } from '@/core/services/cycleService';
import type { DarvoDealStatus } from '@/core/domain/railFeed';

export interface DarvoDealCardProps {
  status: DarvoDealStatus;
}

export function DarvoDealCard({ status }: DarvoDealCardProps) {
  const { tokens } = useThemeStore();
  const { deal, msRemaining, stockPct } = status;

  const stockFilled = Math.min(1, deal.total > 0 ? deal.sold / deal.total : 0);

  return (
    <div
      className="glass-panel relative overflow-hidden flex flex-col p-5 gap-3"
      style={{
        background:  'linear-gradient(to right, transparent 0%, rgba(22,20,20,0.46) 42%, rgba(24,23,23,0.64) 100%)',
        borderColor: 'rgba(227,195,114,0.14)',
        borderTop:   '1px solid rgba(227,195,114,0.22)',
      }}
    >
      {/* Top-left filigree corner */}
      <span className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{ borderTop: '1px solid rgba(227,195,114,0.35)', borderLeft: '1px solid rgba(227,195,114,0.35)' }}
      />

      {/* Header label */}
      <div className="flex items-center gap-2">
        <Tag size={14} strokeWidth={1.5} style={{ color: '#E3C372', opacity: 0.60 }} />
        <p
          data-role="labelTiny"
          style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: tokens.colors.primary, opacity: 0.40 }}
        >
          Darvo Deal
        </p>
      </div>

      {/* Item name */}
      <p
        data-role="hero"
        className="leading-tight orokin-etched"
        style={{ ...getTypographyStyle(tokens, 'hero'), color: '#E3C372' }}
      >
        {deal.item}
      </p>

      {/* Price row */}
      <div className="flex items-end gap-3">
        <p className="font-mono text-[11px] tabular-nums line-through" style={{ color: '#C6C6C7', opacity: 0.35 }}>
          {deal.originalPrice}p
        </p>
        <p className="font-mono text-2xl font-bold tabular-nums leading-none" style={{ color: '#E3C372' }}>
          {deal.salePrice}p
        </p>
        {deal.discount > 0 && (
          <span
            data-role="labelTiny"
            className="mb-0.5 px-2 py-0.5"
            style={{
              ...getTypographyStyle(tokens, 'labelTiny'),
              color:           '#ffb4ab',
              border:          '1px solid rgba(255,180,171,0.35)',
              backgroundColor: 'rgba(255,180,171,0.10)',
            }}
          >
            -{deal.discount}%
          </span>
        )}
      </div>

      {/* Stock bar */}
      <div>
        <div className="flex justify-between mb-1">
          <p
            data-role="labelTiny"
            style={{ ...getTypographyStyle(tokens, 'labelTiny'), color: '#C6C6C7', opacity: 0.35 }}
          >
            Stock
          </p>
          <p className="font-mono text-[9px] tabular-nums" style={{ color: '#C6C6C7', opacity: 0.45 }}>
            {deal.sold} / {deal.total}
          </p>
        </div>
        <div className="relative overflow-hidden" style={{ height: 3, backgroundColor: 'rgba(197,192,190,0.07)' }}>
          <div
            className="absolute inset-y-0 left-0 h-full transition-all duration-700"
            style={{ width: `${stockFilled * 100}%`, backgroundColor: 'rgba(227,195,114,0.60)' }}
          />
        </div>
        {stockPct > 0 && null}
      </div>

      {/* Expiry */}
      <p className="font-mono text-[10px] tabular-nums mt-auto" style={{ color: '#C6C6C7', opacity: 0.35 }}>
        {msRemaining > 0 ? `Expires in ${formatMsHuman(msRemaining)}` : 'Expired'}
      </p>
    </div>
  );
}
