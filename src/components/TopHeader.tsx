import { Wifi, WifiOff, Shield } from 'lucide-react';

type ApiStatus = 'live' | 'partial' | 'offline' | 'loading';

type Props = {
  apiStatus?: ApiStatus;
  masteryRank?: number;
};

const STATUS_CONFIG: Record<ApiStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  live:    { label: 'Live Data',     icon: <Wifi size={12} />,    cls: 'status--live' },
  partial: { label: 'Partial Live',  icon: <Wifi size={12} />,    cls: 'status--partial' },
  offline: { label: 'Offline',       icon: <WifiOff size={12} />, cls: 'status--offline' },
  loading: { label: 'Connecting…',   icon: <Wifi size={12} />,    cls: 'status--loading' },
};

export function TopHeader({ apiStatus = 'loading', masteryRank }: Props) {
  const { label, icon, cls } = STATUS_CONFIG[apiStatus];

  return (
    <header className="top-header">
      <div className="top-header-left">
        <div className="top-header-subtitle">Warframe endgame tracker</div>
      </div>

      <div className="top-header-right">
        <div className={`api-status-badge ${cls}`}>
          {icon}
          <span>{label}</span>
        </div>

        <div className="mastery-badge">
          <Shield size={14} />
          <span className="mastery-label">MR</span>
          <span className="mastery-value">
            {masteryRank != null ? masteryRank : '—'}
          </span>
        </div>
      </div>
    </header>
  );
}
