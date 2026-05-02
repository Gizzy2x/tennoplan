import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useHeartbeatStore } from '@/store/heartbeat';
import { WorldstateSync } from '@/services/WorldstateSync';

export const SYNC_COOLDOWN_MS = 60_000;

export function formatSyncAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/**
 * SystemPulse — the single worldstate sync trigger.
 *
 * Reads from useHeartbeatStore so every instance shares identical state:
 * clicking one greys out all instances regardless of where they're rendered.
 *
 * compact=true  (default, used in Header): icon + inline label
 * compact=false (used in Settings panel):  standalone button row
 */
export function SystemPulse({
  compact = true,
  onLabelClick,
}: {
  compact?: boolean;
  onLabelClick?: () => void;
}) {
  const { status, lastSyncMs, setSync } = useHeartbeatStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ageMs      = now - lastSyncMs;
  const ageLabel   = formatSyncAge(ageMs);
  const isSyncing  = status === 'syncing';
  const secondsLeft = Math.max(0, Math.ceil((SYNC_COOLDOWN_MS - ageMs) / 1000));
  const inCooldown = secondsLeft > 0 && !isSyncing;
  const isDisabled = isSyncing || inCooldown;

  const btnTitle = isSyncing
    ? 'Syncing data…'
    : inCooldown
      ? `Try again in ${secondsLeft}s`
      : 'Sync now';

  async function handleSync() {
    if (isDisabled) return;
    setSync('syncing');
    await WorldstateSync.sync();
  }

  if (compact) {
    return (
      <div className="header-pulse">
        <button
          onClick={() => void handleSync()}
          disabled={isDisabled}
          title={btnTitle}
          className={`header-pulse-btn ${isSyncing ? 'system-pulse-ring is-syncing' : ''}`}
          aria-label={btnTitle}
        >
          <Activity size={13} strokeWidth={2} />
        </button>
        {onLabelClick ? (
          <button
            className="header-pulse-label header-pulse-label--link"
            data-syncing={isSyncing}
            onClick={onLabelClick}
            title="Open sync details"
          >
            {isSyncing ? 'Syncing…' : `Last sync ${ageLabel}`}
          </button>
        ) : (
          <span className="header-pulse-label" data-syncing={isSyncing}>
            {isSyncing ? 'Syncing…' : `Last sync ${ageLabel}`}
          </span>
        )}
      </div>
    );
  }

  // Settings (non-compact) — a standalone sync row
  return (
    <div className="settings-sync-row">
      <div className="settings-sync-info">
        <span className="settings-status-label typo-label-xs">Last sync</span>
        <span className="settings-status-value typo-label-xs">
          {isSyncing ? 'Syncing…' : ageLabel}
        </span>
      </div>
      <button
        onClick={() => void handleSync()}
        disabled={isDisabled}
        title={btnTitle}
        className={`settings-sync-btn${isDisabled ? ' settings-sync-btn--disabled' : ''}${isSyncing ? ' settings-sync-btn--syncing' : ''}`}
      >
        <span className={`settings-btn-icon${isSyncing ? ' settings-btn-icon--spin' : ''}`}>↻</span>
        <span className="typo-label-xs">
          {isSyncing ? 'Syncing…' : inCooldown ? `${secondsLeft}s` : 'Sync now'}
        </span>
      </button>
    </div>
  );
}
