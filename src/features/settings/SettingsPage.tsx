/**
 * SettingsPage — Static data management hub.
 *
 * The only place in the app that can trigger a static data sync or clear it.
 * Displays current sync status, a progress bar during refresh, and a danger
 * zone for clearing all stored data.
 *
 * Reached via the Settings (gear) icon in the Header — not in the sidebar.
 */

import { useEffect, useState, useCallback } from 'react';
import { PageHero } from '@/components/ui/PageHero';
import { DropDataService, type FetchProgress } from '@/adapters/api/DropDataService';
import type { StaleInfo } from '@/adapters/api/DropDataService';
import { db } from '@/adapters/storage/db';

// ── Status pill helpers ───────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

function statusColor(s: SyncStatus): string {
  if (s === 'success') return 'rgba(134,239,172,0.80)';
  if (s === 'error')   return 'rgba(252,165,165,0.80)';
  if (s === 'syncing') return 'rgba(227,195,114,0.70)';
  return 'rgba(198,198,199,0.35)';
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
      <span
        data-role="labelTiny"
        className="typo-label-xs"
        style={{
          fontWeight: 700,
          color:      'rgba(227,195,114,0.45)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(227,195,114,0.08)' }} />
    </div>
  );
}

function DataStatusRow({
  label,
  value,
  accent = false,
}: {
  label:   string;
  value:   string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '7px 0',
        borderBottom:   '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span
        data-role="labelTiny"
        className="typo-label-xs"
        style={{ color: 'rgba(198,198,199,0.45)' }}
      >
        {label}
      </span>
      <span
        data-role="labelTiny"
        className="typo-label-xs"
        style={{ color: accent ? 'rgba(227,195,114,0.80)' : 'rgba(198,198,199,0.70)' }}
      >
        {value}
      </span>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number | null }) {
  const pct = percent ?? 0;
  return (
    <div
      style={{
        width:        '100%',
        height:       3,
        background:   'rgba(255,255,255,0.06)',
        borderRadius: 2,
        overflow:     'hidden',
        marginTop:    10,
      }}
    >
      <div
        style={{
          height:       '100%',
          width:        percent === null ? '40%' : `${pct}%`,
          background:   'rgba(227,195,114,0.60)',
          borderRadius: 2,
          transition:   'width 0.25s ease-out',
          animation:    percent === null ? 'pulse-bar 1.2s ease-in-out infinite' : 'none',
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [staleInfo,    setStaleInfo]    = useState<StaleInfo | null>(null);
  const [dropsCount,   setDropsCount]   = useState<number | null>(null);
  const [syncStatus,   setSyncStatus]   = useState<SyncStatus>('idle');
  const [progress,     setProgress]     = useState<FetchProgress | null>(null);
  const [resultMsg,    setResultMsg]    = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadStaleInfo = useCallback(async () => {
    const info = await DropDataService.checkForStaleData();
    setStaleInfo(info);
    const count = await db.dropLocations.count();
    setDropsCount(count > 0 ? count : null);
  }, []);

  useEffect(() => {
    void loadStaleInfo();
  }, [loadStaleInfo]);

  const handleRefresh = async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    setProgress(null);
    setResultMsg('');

    try {
      const result = await DropDataService.fetchAndSync({
        onProgress: (p) => setProgress(p),
        maxRetries: 3,
      });
      setSyncStatus('success');
      setResultMsg(
        `Synced ${result.itemsCount.toLocaleString()} items + ${result.dropsCount.toLocaleString()} drop locations in ${(result.durationMs / 1000).toFixed(1)}s`,
      );
      await loadStaleInfo();
      document.dispatchEvent(new Event('static-data:synced'));
    } catch (err) {
      setSyncStatus('error');
      setResultMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setProgress(null);
    }
  };

  const handleClear = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }
    setShowClearConfirm(false);
    await DropDataService.clearAllData();
    setResultMsg('All static data cleared. Refresh to repopulate.');
    setSyncStatus('idle');
    await loadStaleInfo();
    document.dispatchEvent(new Event('static-data:synced'));
  };

  const isSyncing = syncStatus === 'syncing';

  const daysLabel = staleInfo
    ? staleInfo.daysOld === Infinity
      ? 'Never'
      : `${staleInfo.daysOld}d ago`
    : '…';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>

      <PageHero prefix="SYSTEM" title="SETTINGS" subtitle="Configuration & Preferences" />

      {/* ── Static Data status ─────────────────────────────────────────────── */}
      <SectionDivider label="Static Data" />

      <div
        style={{
          background:   'rgba(255,255,255,0.025)',
          border:       '1px solid rgba(255,255,255,0.06)',
          padding:      '14px 18px',
          marginBottom: 16,
        }}
      >
        <DataStatusRow label="Last synced"    value={daysLabel} accent={staleInfo?.isStale} />
        <DataStatusRow label="Drop locations" value={dropsCount ? `~${dropsCount.toLocaleString()} locations` : '—'} />
        <DataStatusRow label="Item catalogue" value={staleInfo ? '~17 000 entries' : '—'} />
        <DataStatusRow label="Source"         value="drops.warframestat.us" />
      </div>

      {/* Progress bar — visible during sync */}
      {isSyncing && progress && (
        <div style={{ marginBottom: 12 }}>
          <ProgressBar percent={progress.percent} />
          <p
            data-role="labelTiny"
            className="typo-label-xs"
            style={{
              color:     'rgba(227,195,114,0.55)',
              marginTop: 6,
            }}
          >
            {progress.status}
          </p>
        </div>
      )}

      {/* Result message */}
      {resultMsg && !isSyncing && (
        <p
          data-role="labelTiny"
          className="typo-label-xs"
          style={{
            color:        statusColor(syncStatus),
            marginBottom: 12,
          }}
        >
          {syncStatus === 'success' ? '✓ ' : syncStatus === 'error' ? '✗ ' : ''}{resultMsg}
        </p>
      )}

      {/* Refresh button */}
      <button
        onClick={() => void handleRefresh()}
        disabled={isSyncing}
        className="typo-label-xs"
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          padding:    '8px 20px',
          fontSize:   '0.42rem',
          fontWeight: 700,
          color:      isSyncing ? 'rgba(227,195,114,0.30)' : '#131313',
          background: isSyncing ? 'rgba(227,195,114,0.15)' : 'rgba(227,195,114,0.85)',
          border:     'none',
          cursor:     isSyncing ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isSyncing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(227,195,114,1)';
        }}
        onMouseLeave={(e) => {
          if (!isSyncing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(227,195,114,0.85)';
        }}
      >
        <span
          style={{
            display:   'inline-block',
            animation: isSyncing ? 'spin 1s linear infinite' : 'none',
          }}
        >
          ↻
        </span>
        {isSyncing ? 'Syncing…' : 'Refresh Drop Data'}
      </button>

      {/* ── Danger zone ────────────────────────────────────────────────────── */}
      <SectionDivider label="Danger Zone" />

      <div
        style={{
          background: 'rgba(255,60,60,0.03)',
          border:     '1px solid rgba(255,100,100,0.10)',
          padding:    '14px 18px',
        }}
      >
        <p
          data-role="labelTiny"
          className="typo-label-xs"
          style={{
            color:        'rgba(252,165,165,0.50)',
            marginBottom: 12,
            lineHeight:   1.6,
          }}
        >
          Removes all cached items, drop locations, and sync state.
          Icons will show placeholders until the next refresh.
        </p>

        {showClearConfirm ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => void handleClear()}
              className="typo-label-xs"
              style={{
                padding:    '6px 16px',
                fontWeight: 700,
                fontSize:   '0.38rem',
                color:      'rgba(252,165,165,0.90)',
                border:     '1px solid rgba(252,165,165,0.35)',
                background: 'transparent',
                cursor:     'pointer',
              }}
            >
              Confirm Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="typo-label-xs"
              style={{
                padding:    '6px 16px',
                fontWeight: 700,
                fontSize:   '0.38rem',
                color:      'rgba(198,198,199,0.45)',
                border:     '1px solid rgba(198,198,199,0.12)',
                background: 'transparent',
                cursor:     'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleClear}
            className="typo-label-xs"
            style={{
              padding:    '6px 16px',
              fontWeight: 700,
              fontSize:   '0.38rem',
              color:      'rgba(252,165,165,0.55)',
              border:     '1px solid rgba(252,165,165,0.18)',
              background: 'transparent',
              cursor:     'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(252,165,165,0.85)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(252,165,165,0.40)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(252,165,165,0.55)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(252,165,165,0.18)';
            }}
          >
            Clear All Static Data
          </button>
        )}
      </div>

    </div>
  );
}
