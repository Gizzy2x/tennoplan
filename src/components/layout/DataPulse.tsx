/**
 * DataPulse — single header pill combining data-source health +
 * last-sync time into one visual unit.
 *
 *   • Colored dot → live state of the worldstate source upstream
 *       green  = primary (warframestat.us) healthy
 *       amber  = fallback (official api / worker projection)
 *       gray   = served from local cache (network unreachable)
 *       red    = all upstreams down
 *   • Text → relative "Last sync 23s ago" / "Syncing…"
 *   • Click → triggers a sync (respects the cooldown)
 *   • Hover → PressTip exposes the upstream name + both
 *             worldstate-sync and codex-sync ages
 *
 * Replaces the prior split of SystemPulse + DataSourceBadge in the
 * header, where two adjacent surfaces conveyed related state without
 * being legible together. One pill, one read, full detail on hover.
 *
 * SystemPulse's standalone form (full sync row) still lives in
 * Settings — this component only owns the compact header pill.
 */

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import { useHeartbeatStore } from '@/store/heartbeat';
import { WorldstateSync } from '@/services/WorldstateSync';
import { PressTip } from '@/components/common/PressTip';
import type { DataSource } from '@/core/domain/tennoplanApi';
import styles from './DataPulse.module.css';

const SYNC_COOLDOWN_MS = 60_000;

type Health = 'primary' | 'fallback' | 'cached' | 'down';

const SOURCE_LABEL: Record<DataSource, string> = {
  warframestat:    'warframestat.us (primary)',
  official:        'api.warframe.com (fallback)',
  cached:          'local cache (offline)',
  fallback:        'worker projection (degraded)',
  'calamity-plus': 'calamity+ enriched',
  wfcd:            'WFCD community data',
  enriched:        'enriched worldstate',
};

const SOURCE_HEALTH: Record<DataSource, Health> = {
  warframestat:    'primary',
  official:        'fallback',
  cached:          'cached',
  fallback:        'down',
  'calamity-plus': 'primary',
  wfcd:            'primary',
  enriched:        'primary',
};

interface DataPulseProps {
  /** Click-through to settings for the full sync detail panel. */
  onOpenDetails?: () => void;
}

export function DataPulse({ onOpenDetails }: DataPulseProps) {
  const { status, lastSyncMs, setSync } = useHeartbeatStore();
  const [now, setNow] = useState(() => Date.now());

  // 1s tick keeps the relative time accurate without re-rendering the
  // rest of the header.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const worldstateSource = useLiveQuery(
    async () => (await db.syncMetadata.get('worldstate'))?.source ?? null,
    [],
    null,
  );
  const codexSync = useLiveQuery(
    async () => (await db.syncMetadata.get('codex'))?.lastSync ?? null,
    [],
    null,
  );

  const ageMs       = now - lastSyncMs;
  const ageLabel    = formatAge(ageMs);
  const isSyncing   = status === 'syncing';
  const secondsLeft = Math.max(0, Math.ceil((SYNC_COOLDOWN_MS - ageMs) / 1000));
  const inCooldown  = secondsLeft > 0 && !isSyncing;
  const isDisabled  = isSyncing || inCooldown;

  const health = worldstateSource ? SOURCE_HEALTH[worldstateSource] : 'primary';
  const sourceLabel = worldstateSource ? SOURCE_LABEL[worldstateSource] : 'pending';
  const codexAgeLabel = codexSync ? formatAge(now - codexSync) : 'pending';

  // PressTip content — full detail on hover/long-press.
  const tip = (
    <span className={styles.tip}>
      <span className={styles.tipRow}>
        <span className={styles.tipLabel}>Worldstate</span>
        <span className={styles.tipValue}>{isSyncing ? 'syncing…' : `${ageLabel}`}</span>
      </span>
      <span className={styles.tipRow}>
        <span className={styles.tipLabel}>Codex</span>
        <span className={styles.tipValue}>{codexAgeLabel}</span>
      </span>
      <span className={styles.tipRow}>
        <span className={styles.tipLabel}>Source</span>
        <span className={styles.tipValue}>{sourceLabel}</span>
      </span>
      {inCooldown && (
        <span className={styles.tipHint}>Sync again in {secondsLeft}s</span>
      )}
      {!isDisabled && (
        <span className={styles.tipHint}>Click to sync · long-press for details</span>
      )}
    </span>
  );

  async function handleClick() {
    if (isDisabled) {
      // Already in cooldown / syncing — let the click route to the
      // details panel instead of being a dead button.
      if (onOpenDetails) onOpenDetails();
      return;
    }
    setSync('syncing');
    await WorldstateSync.sync();
  }

  return (
    <PressTip content={tip} placement="bottom">
      <button
        type="button"
        className={styles.pill}
        data-health={health}
        data-syncing={isSyncing ? 'true' : undefined}
        onClick={() => void handleClick()}
        aria-label={`Data source: ${sourceLabel}. ${isSyncing ? 'Syncing.' : `Last sync ${ageLabel}.`}`}
      >
        <span className={styles.dot} aria-hidden />
        <span className={styles.text}>
          {isSyncing ? 'Syncing…' : ageLabel}
        </span>
      </button>
    </PressTip>
  );
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
