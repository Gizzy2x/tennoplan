/**
 * SettingsPage — System status + data management hub (V2).
 *
 * Two data surfaces, two refresh actions:
 *   • Worldstate  — live data from Worker KV, refreshed every 60s automatically.
 *                   Manual refresh hits /v1/worldstate (fast KV read). Rate-limited
 *                   to 60s so it can't beat the poll interval.
 *   • Item Codex  — 2-3MB static blob from Worker KV, updated every 6h by cron.
 *                   Manual refresh is rate-limited to 6h client-side (persisted in
 *                   localStorage) — no point refreshing sooner, the server cron
 *                   won't have produced new data yet. Countdown shown on button.
 *
 * Spam protection: Cloudflare free plan has 100k requests/day. The codex blob is
 * the only real risk — it's 2-3MB and the Worker still counts as a request per
 * fetch. The 6h localStorage cooldown means a single user generates at most 4
 * codex requests per day, well within limits even with many concurrent users.
 */

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useLiveQuery }         from 'dexie-react-hooks';
import { PageHero }             from '@/components/ui/PageHero';
import { useWorldstate }        from '@/hooks/useWorldstate';
import { StaticDataService }    from '@/services/StaticDataService';
import { SystemPulse }          from '@/components/layout/SystemPulse';
import { db }                   from '@/adapters/storage/db';
import {
  onIconSyncProgress,
  verifyAndRepairIcons,
  clearAndRedownloadIcons,
  getIconSyncSnapshot,
  type IconSyncProgress,
} from '@/adapters/assets/startupIconSync';
import { testCdnConnection, getFetchDiagnostics } from '@/lib/http/nativeFetch';
import { getCacheDiagnostics } from '@/lib/icons/iconBlobCache';
import { EventLogPanel } from './components/EventLogPanel';
import type { DataSource, DataQuality } from '@/core/domain/tennoplanApi';
import styles from './SettingsPage.module.css';

// ── Rate-limit constants ───────────────────────────────────────────────────────

const CODEX_COOLDOWN_MS = 6 * 3_600_000; // 6h  — matches server cron
const LS_CODEX_KEY      = 'tennoplan:codex:lastManualRefresh';

// ── Helpers ───────────────────────────────────────────────────────────────────

function msToCountdown(ms: number): string {
  if (ms <= 0) return '';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ageLabel(lastSync: number): string {
  if (!lastSync) return 'Never';
  const ms = Date.now() - lastSync;
  const s  = Math.floor(ms / 1000);
  const m  = Math.floor(s / 60);
  const h  = Math.floor(m / 60);
  const d  = Math.floor(h / 24);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return `${s}s ago`;
}

function qualityLabel(q: DataQuality | string | null | undefined): string {
  if (q === 'high')   return 'HIGH';
  if (q === 'medium') return 'DEGRADED';
  if (q === 'low')    return 'ESTIMATED';
  return '—';
}

function sourceLabel(s: DataSource | string | null | undefined): string {
  if (!s) return '—';
  const map: Record<string, string> = {
    'official':     'api.warframe.com',
    'warframestat': 'warframestat.us',
    'cached':       'Cloudflare KV (cached)',
    'fallback':     'Cycle Math (offline)',
    'calamity-plus':'calamity-inc (enriched)',
    'enriched':     'calamity-inc + WFCD',
    'wfcd':         'warframe-drop-data',
  };
  return map[s] ?? s;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function QualityPip({ quality }: { quality: DataQuality | string | null | undefined }) {
  const variantClass =
    quality === 'high'   ? styles['settings-pip--high']   :
    quality === 'medium' ? styles['settings-pip--medium'] :
    quality === 'low'    ? styles['settings-pip--low']    :
                           styles['settings-pip--unknown'];
  return (
    <span className={clsx(styles['settings-pip'], variantClass)} aria-hidden="true" />
  );
}

function StatusRow({
  label,
  value,
  accent,
  pip,
  quality,
}: {
  label:    string;
  value:    string;
  accent?:  boolean;
  pip?:     boolean;
  quality?: DataQuality | string | null;
}) {
  return (
    <div className={styles['settings-status-row']}>
      <span className={clsx(styles['settings-status-label'], 'typo-label-xs')}>{label}</span>
      <span className={clsx(styles['settings-status-value'], 'typo-label-xs', accent && styles['settings-status-value--accent'])}>
        {pip && <QualityPip quality={quality} />}
        {value}
      </span>
    </div>
  );
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return <div className={styles['settings-block']}>{children}</div>;
}

function RefreshButton({
  onClick,
  disabled,
  cooldownMs,
  label,
  loadingLabel,
  isLoading,
}: {
  onClick:      () => void;
  disabled:     boolean;
  cooldownMs:   number;
  label:        string;
  loadingLabel: string;
  isLoading:    boolean;
}) {
  const [remaining, setRemaining] = useState(cooldownMs);

  useEffect(() => {
    if (cooldownMs <= 0) { setRemaining(0); return; }
    setRemaining(cooldownMs);
    const id = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1000;
        if (next <= 0) { clearInterval(id); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownMs]);

  const onCooldown = remaining > 0;
  const isDisabled = disabled || isLoading || onCooldown;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        styles['settings-btn'],
        isLoading && styles['settings-btn--loading'],
        onCooldown && styles['settings-btn--cooldown']
      )}
    >
      <span className={clsx(styles['settings-btn-icon'], isLoading && styles['settings-btn-icon--spin'])}>↻</span>
      <span className="typo-label-xs">
        {isLoading
          ? loadingLabel
          : onCooldown
            ? `Available in ${msToCountdown(remaining)}`
            : label}
      </span>
    </button>
  );
}

// ── Worldstate panel ──────────────────────────────────────────────────────────

function WorldstatePanel() {
  const { source, quality, errorCount, isLoading, isError } =
    useWorldstate({ registerRefetch: false });

  const hasErrors = errorCount > 0;

  return (
    <div className={styles['settings-panel']}>
      <div className={styles['settings-panel-header']}>
        <span className={clsx(styles['settings-panel-title'], 'typo-label-xs')}>LIVE WORLDSTATE</span>
        <span className={clsx(styles['settings-panel-badge'], 'typo-label-xs')}>AUTO · 60s</span>
      </div>

      <SectionBlock>
        <StatusRow label="Source"  value={isLoading ? '…' : isError ? '—' : sourceLabel(source)} />
        <StatusRow label="Quality" value={isLoading ? '…' : isError ? '—' : qualityLabel(quality)} pip quality={quality} />
        {hasErrors && (
          <StatusRow label="Sync errors" value={`${errorCount} consecutive failure${errorCount !== 1 ? 's' : ''}`} accent />
        )}
      </SectionBlock>

      <SystemPulse compact={false} />
    </div>
  );
}

// ── Codex panel ───────────────────────────────────────────────────────────────

function CodexPanel() {
  const codexStatus = useLiveQuery(() => StaticDataService.getCodexStatus(), [], null);

  const [codexCooldown,  setCodexCooldown]  = useState(0);
  const [codexSyncing,   setCodexSyncing]   = useState(false);
  const [codexProgress,  setCodexProgress]  = useState<string | null>(null);
  const [codexResultMsg, setCodexResultMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Restore cooldown from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(LS_CODEX_KEY);
    if (!raw) return;
    const last = parseInt(raw, 10);
    if (isNaN(last)) return;
    const remaining = CODEX_COOLDOWN_MS - (Date.now() - last);
    if (remaining > 0) setCodexCooldown(remaining);
  }, []);

  const handleCodexRefresh = useCallback(async () => {
    if (codexSyncing || codexCooldown > 0) return;
    setCodexSyncing(true);
    setCodexProgress('Contacting Worker…');
    setCodexResultMsg(null);
    try {
      await StaticDataService.refreshCodex((p) => {
        setCodexProgress(`${p.status}…`);
      });
      const status = await StaticDataService.getCodexStatus();
      setCodexResultMsg({
        ok:   true,
        text: `${status.itemCount.toLocaleString()} items synced from ${sourceLabel(status.source ?? null)}.`,
      });
      const now = Date.now();
      localStorage.setItem(LS_CODEX_KEY, String(now));
      setCodexCooldown(CODEX_COOLDOWN_MS);
    } catch (e) {
      setCodexResultMsg({ ok: false, text: e instanceof Error ? e.message : 'Codex refresh failed' });
    } finally {
      setCodexSyncing(false);
      setCodexProgress(null);
    }
  }, [codexSyncing, codexCooldown]);

  const status      = codexStatus;
  const itemCount   = status?.itemCount ?? 0;
  const isPopulated = itemCount > 0;
  const hasErrors   = (status?.errorCount ?? 0) > 0;

  return (
    <div className={styles['settings-panel']}>
      <div className={styles['settings-panel-header']}>
        <span className={clsx(styles['settings-panel-title'], 'typo-label-xs')}>ITEM CODEX</span>
        <span className={clsx(styles['settings-panel-badge'], 'typo-label-xs')}>AUTO · 6h</span>
      </div>

      <SectionBlock>
        <StatusRow
          label="Items cached"
          value={status === null ? '…' : isPopulated ? `${itemCount.toLocaleString()} items` : 'Empty — pending first cron'}
          accent={!isPopulated && status !== null}
        />
        <StatusRow
          label="Last synced"
          value={status === null ? '…' : status.lastSync ? ageLabel(status.lastSync) : 'Never'}
          accent={status?.isStale && isPopulated}
        />
        {isPopulated && (
          <StatusRow
            label="Source"
            value={status === null ? '…' : sourceLabel(status.source)}
          />
        )}
        {isPopulated && (
          <StatusRow
            label="Quality"
            value={status === null ? '…' : qualityLabel(status.quality)}
            pip
            quality={status?.quality}
          />
        )}
        {hasErrors && (
          <StatusRow
            label="Sync errors"
            value={`${status!.errorCount} consecutive failure${status!.errorCount !== 1 ? 's' : ''}`}
            accent
          />
        )}
      </SectionBlock>

      {!isPopulated && status !== null && (
        <p className={clsx(styles['settings-notice'], 'typo-label-xs')}>
          Worker codex cron runs every 6h. First population happens at the next 0/6/12/18 UTC tick.
          You can force it now — it will download ~3MB from Cloudflare KV.
        </p>
      )}

      {codexProgress && codexSyncing && (
        <p className={clsx(styles['settings-progress'], 'typo-label-xs')}>{codexProgress}</p>
      )}

      {codexResultMsg && !codexSyncing && (
        <p className={clsx(
          styles['settings-result'],
          'typo-label-xs',
          codexResultMsg.ok ? styles['settings-result--ok'] : styles['settings-result--err']
        )}>
          {codexResultMsg.ok ? '✓' : '✗'} {codexResultMsg.text}
        </p>
      )}

      <RefreshButton
        onClick={() => void handleCodexRefresh()}
        disabled={false}
        cooldownMs={codexCooldown}
        label="Force Refresh Codex"
        loadingLabel={codexProgress ?? 'Downloading…'}
        isLoading={codexSyncing}
      />

      <p className={clsx(styles['settings-hint'], 'typo-label-xs')}>
        Downloads ~3MB from Cloudflare KV. Locked for 6h after each refresh to match server cron cadence.
      </p>
    </div>
  );
}

// ── Danger zone panel ─────────────────────────────────────────────────────────

function DangerPanel() {
  const [step,   setStep]   = useState<'idle' | 'confirm' | 'clearing'>('idle');
  const [result, setResult] = useState<string | null>(null);

  const handleClear = async () => {
    if (step === 'idle')    { setStep('confirm'); return; }
    if (step === 'confirm') {
      setStep('clearing');
      await Promise.all([
        db.worldstate.clear(),
        db.tennoplanItems.clear(),
        db.syncMetadata.clear(),
        db.cache.clear(),
      ]);
      localStorage.removeItem(LS_CODEX_KEY);
      setResult('All local data cleared. Reloading…');
      setStep('idle');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div className={clsx(styles['settings-panel'], styles['settings-panel--danger'])}>
      <div className={styles['settings-panel-header']}>
        <span className={clsx(styles['settings-panel-title'], styles['settings-panel-title--danger'], 'typo-label-xs')}>DANGER ZONE</span>
      </div>

      <p className={clsx(styles['settings-danger-desc'], 'typo-label-xs')}>
        Clears all locally cached data — worldstate snapshot, item codex, sync metadata,
        and rate-limit state. Both services will re-fetch on next load.
      </p>

      {result && (
        <p className={clsx(styles['settings-result'], styles['settings-result--ok'], 'typo-label-xs')}>✓ {result}</p>
      )}

      <div className={styles['settings-danger-actions']}>
        {step === 'confirm' ? (
          <>
            <button
              onClick={() => void handleClear()}
              className={clsx(styles['settings-btn'], styles['settings-btn--danger-confirm'])}
            >
              <span className="typo-label-xs">Confirm — clear everything</span>
            </button>
            <button
              onClick={() => setStep('idle')}
              className={clsx(styles['settings-btn'], styles['settings-btn--ghost'])}
            >
              <span className="typo-label-xs">Cancel</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => void handleClear()}
            disabled={step === 'clearing'}
            className={clsx(styles['settings-btn'], styles['settings-btn--danger'])}
          >
            <span className="typo-label-xs">
              {step === 'clearing' ? 'Clearing…' : 'Clear All Local Data'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Icon Cache panel ──────────────────────────────────────────────────────────

interface ConnTestResult {
  ok:         boolean;
  message:    string;
  backend:    string;
  durationMs: number;
}

function IconCachePanel() {
  const [progress, setProgress] = useState<IconSyncProgress>(getIconSyncSnapshot);
  const [busy,     setBusy]     = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [test,     setTest]     = useState<ConnTestResult | null>(null);

  useEffect(() => {
    setProgress(getIconSyncSnapshot());
    return onIconSyncProgress(setProgress);
  }, []);

  const isActive   = progress.phase === 'preflight'
                  || progress.phase === 'checking'
                  || progress.phase === 'downloading';
  const isDone     = progress.phase === 'done';
  const isAborted  = progress.phase === 'aborted';
  const pct        = progress.pct;
  const missing    = Math.max(0, progress.total - progress.cached - progress.failed);
  const allGood    = isDone && missing === 0 && progress.failed === 0;

  const handleVerify = useCallback(() => {
    if (busy || isActive) return;
    setBusy(true);
    setTest(null);
    verifyAndRepairIcons();
  }, [busy, isActive]);

  const handleClearRedownload = useCallback(async () => {
    if (busy || isActive) return;
    setBusy(true);
    setTest(null);
    await clearAndRedownloadIcons();
  }, [busy, isActive]);

  const handleTest = useCallback(async () => {
    if (testing) return;
    setTesting(true);
    setTest(null);
    const r = await testCdnConnection();
    setTest({
      ok:         r.ok,
      message:    r.message,
      backend:    r.backend,
      durationMs: r.durationMs,
    });
    setTesting(false);
  }, [testing]);

  useEffect(() => {
    if (progress.phase === 'done' || progress.phase === 'aborted') setBusy(false);
  }, [progress.phase]);

  // Status label per phase
  let statusLabel = '—';
  if (progress.phase === 'preflight')    statusLabel = 'Testing connection…';
  else if (progress.phase === 'checking') statusLabel = 'Scanning cache…';
  else if (progress.phase === 'downloading') statusLabel = 'Downloading…';
  else if (isDone && allGood)            statusLabel = 'All icons cached ✓';
  else if (isDone && progress.failed > 0)    statusLabel = `${progress.failed.toLocaleString()} failed`;
  else if (isDone && missing > 0)        statusLabel = `${missing.toLocaleString()} missing`;
  else if (isAborted)                    statusLabel = 'Aborted — see error below';
  else if (progress.phase === 'idle' && progress.total === 0) statusLabel = 'Waiting for startup sync…';

  const fetchDiag = getFetchDiagnostics();
  const cacheDiag = getCacheDiagnostics();

  return (
    <div className={clsx(styles['settings-panel'], styles['settings-panel--full'])}>
      <div className={styles['settings-panel-header']}>
        <span className={clsx(styles['settings-panel-title'], 'typo-label-xs')}>ICON CACHE</span>
        <span className={clsx(styles['settings-panel-badge'], 'typo-label-xs')}>
          {progress.backend === 'tauri-http' ? 'TAURI HTTP · NATIVE' :
           progress.backend === 'browser'    ? 'BROWSER FETCH · CORS' :
                                                'CACHE API · LOCAL'}
        </span>
      </div>

      {/* Progress bar */}
      <div className={styles['icon-sync-bar-track']} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={clsx(
            styles['icon-sync-bar-fill'],
            isActive  && styles['icon-sync-bar-fill--active'],
            allGood   && styles['icon-sync-bar-fill--complete'],
            isAborted && styles['icon-sync-bar-fill--error']
          )}
          style={{ width: `${isAborted ? 100 : pct}%` }}
        />
      </div>

      <div className={styles['icon-sync-count-row']}>
        <span className={clsx(styles['icon-sync-count-main'], 'typo-label-xs')}>
          {progress.total === 0
            ? 'Calculating…'
            : `${progress.cached.toLocaleString()} / ${progress.total.toLocaleString()} icons`}
        </span>
        <span className={clsx(
          styles['icon-sync-pct'],
          'typo-label-xs',
          allGood && styles['icon-sync-pct--ok'],
          isAborted && styles['icon-sync-pct--err']
        )}>
          {isAborted ? 'ERROR' : `${pct}%`}
        </span>
      </div>

      <SectionBlock>
        <StatusRow label="Status"  value={statusLabel} accent={!allGood && (isDone || isAborted)} />
        <StatusRow label="Backend" value={
          fetchDiag.backend === 'tauri-http' ? 'Tauri Rust (reqwest, no CORS)' :
          fetchDiag.backend === 'browser'    ? 'Browser fetch (CORS-restricted)' :
          fetchDiag.isTauri && !fetchDiag.pluginLoaded ? 'Tauri plugin not loaded' :
                                                'unknown'
        } accent={fetchDiag.backend === 'browser' && fetchDiag.isTauri} />
        {isDone && (
          <StatusRow label="Cached"  value={progress.cached.toLocaleString()} />
        )}
        {isDone && progress.failed > 0 && (
          <StatusRow label="Failed"  value={progress.failed.toLocaleString()} accent />
        )}
        {cacheDiag.lastError && (
          <StatusRow label="Last error" value={cacheDiag.lastError.slice(0, 80)} accent />
        )}
      </SectionBlock>

      {/* Aborted preflight — actionable error */}
      {isAborted && progress.error && (
        <p className={clsx(styles['settings-result'], styles['settings-result--err'], 'typo-label-xs')} style={{ whiteSpace: 'pre-wrap' }}>
          ✗ {progress.error}
        </p>
      )}

      {/* Plugin load failure (Tauri but plugin didn't load) */}
      {fetchDiag.isTauri && !fetchDiag.pluginLoaded && fetchDiag.pluginLoadError && (
        <p className={clsx(styles['settings-notice'], 'typo-label-xs')}>
          tauri-plugin-http failed to load: <code>{fetchDiag.pluginLoadError}</code>.
          Stop and restart <code>npm run tauri dev</code> — Cargo needs to compile the new plugin.
        </p>
      )}

      {/* Connection test result */}
      {test && (
        <p className={clsx(
          styles['settings-result'],
          'typo-label-xs',
          test.ok ? styles['settings-result--ok'] : styles['settings-result--err']
        )}>
          {test.ok ? '✓' : '✗'} Connection test ({test.backend}, {test.durationMs}ms): {test.message}
        </p>
      )}

      <p className={clsx(styles['settings-hint'], 'typo-label-xs')}>
        Icons download once from the WFCD CDN via Tauri's native HTTP client (no CORS).
        After first download, every icon in the app loads instantly with no internet required.
      </p>

      <div className={styles['icon-sync-actions']}>
        <button
          className={clsx(styles['settings-btn'], styles['settings-btn--ghost'])}
          onClick={() => void handleTest()}
          disabled={testing}
        >
          <span className={clsx(styles['settings-btn-icon'], testing && styles['settings-btn-icon--spin'])}>⊙</span>
          <span className="typo-label-xs">{testing ? 'Testing…' : 'Test Connection'}</span>
        </button>

        <button
          className={clsx(
            styles['settings-btn'],
            (isActive || busy) && styles['settings-btn--loading']
          )}
          onClick={handleVerify}
          disabled={isActive || busy}
        >
          <span className={clsx(styles['settings-btn-icon'], isActive && styles['settings-btn-icon--spin'])}>↻</span>
          <span className="typo-label-xs">
            {isActive
              ? (progress.phase === 'preflight' ? 'Testing connection…'
                : progress.phase === 'checking' ? 'Scanning cache…'
                : `Downloading… ${progress.cached.toLocaleString()} / ${progress.total.toLocaleString()}`)
              : 'Verify & Repair Missing Icons'}
          </span>
        </button>

        <button
          className={clsx(styles['settings-btn'], styles['settings-btn--ghost'])}
          onClick={() => void handleClearRedownload()}
          disabled={isActive || busy}
        >
          <span className={styles['settings-btn-icon']}>⟳</span>
          <span className="typo-label-xs">Clear & Redownload All</span>
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div className={styles['settings-page']}>
      <PageHero prefix="SYSTEM" title="SETTINGS" subtitle="Data sync status & configuration" />

      <div className={styles['settings-grid']}>
        <WorldstatePanel />
        <CodexPanel />
      </div>

      <IconCachePanel />

      <EventLogPanel />

      <DangerPanel />
    </div>
  );
}
