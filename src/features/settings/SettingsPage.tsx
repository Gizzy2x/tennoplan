import { useState, useEffect, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHero }       from '@/components/ui/PageHero';
import {
  Panel,
  PanelHeader,
  PanelLabel,
  PanelBody,
  DataRow,
  SectionDivider,
} from '@/components/ui/Panel';
import { useWorldstate }     from '@/hooks/useWorldstate';
import { StaticDataService } from '@/services/StaticDataService';
import { SystemPulse }       from '@/components/layout/SystemPulse';
import { db }                from '@/adapters/storage/db';
import {
  onIconSyncProgress,
  verifyAndRepairIcons,
  clearAndRedownloadIcons,
  getIconSyncSnapshot,
  type IconSyncProgress,
} from '@/adapters/assets/startupIconSync';
import { getFetchDiagnostics } from '@/lib/http/nativeFetch';
import { getCacheDiagnostics } from '@/lib/icons/iconBlobCache';
import { EventLogPanel } from './components/EventLogPanel';
import type { DataSource, DataQuality } from '@/core/domain/tennoplanApi';
import styles from './SettingsPage.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const CODEX_COOLDOWN_MS = 6 * 3_600_000;
const LS_CODEX_KEY      = 'tennoplan:codex:lastManualRefresh';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
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
    'official':      'api.warframe.com',
    'warframestat':  'warframestat.us',
    'cached':        'Cloudflare KV',
    'fallback':      'Cycle Math (offline)',
    'calamity-plus': 'calamity-inc',
    'enriched':      'calamity-inc + WFCD',
    'wfcd':          'warframe-drop-data',
  };
  return map[s] ?? s;
}

function pipClass(q: DataQuality | string | null | undefined): string {
  if (q === 'high')   return styles.pipHigh;
  if (q === 'medium') return styles.pipMedium;
  if (q === 'low')    return styles.pipLow;
  return styles.pipUnknown;
}

// ─── Header badge (top-right of PanelHeader) ──────────────────────────────────

function HeaderBadge({
  children, variant,
}: {
  children: React.ReactNode;
  variant?: 'accent' | 'danger';
}) {
  return (
    <span className={clsx(
      styles.headerBadge,
      variant === 'accent' && styles.headerBadgeAccent,
      variant === 'danger' && styles.headerBadgeDanger,
    )}>
      {children}
    </span>
  );
}

// ─── Inline value with optional quality pip ──────────────────────────────────

function QualityValue({
  value, quality,
}: {
  value:   string;
  quality: DataQuality | string | null | undefined;
}) {
  return (
    <span className={styles.valueInline}>
      <span className={clsx(styles.pip, pipClass(quality))} aria-hidden="true" />
      {value}
    </span>
  );
}

// ─── Primary refresh button (with cooldown countdown) ────────────────────────

function RefreshButton({
  onClick, disabled, cooldownMs, label, loadingLabel, isLoading,
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
        styles.btn,
        isLoading  && styles.btnLoading,
        onCooldown && styles.btnCooldown,
      )}
    >
      <span className={clsx(styles.btnIcon, isLoading && styles.btnIconSpin)}>↻</span>
      <span>
        {isLoading
          ? loadingLabel
          : onCooldown
            ? `Available in ${msToCountdown(remaining)}`
            : label}
      </span>
    </button>
  );
}

// ─── Worldstate panel ─────────────────────────────────────────────────────────

function WorldstatePanel() {
  const { source, quality, errorCount, isLoading, isError } =
    useWorldstate({ registerRefetch: false });
  const hasErrors = errorCount > 0;

  return (
    <Panel>
      <PanelHeader>
        <PanelLabel>Live Worldstate</PanelLabel>
        <HeaderBadge>Auto · 60s</HeaderBadge>
      </PanelHeader>
      <PanelBody>
        <DataRow
          label="Source"
          value={isLoading ? '…' : isError ? '—' : sourceLabel(source)}
        />
        <div className="data-row">
          <span className="data-row-label">Quality</span>
          <span className="data-row-value data-row-value-accent">
            <QualityValue
              value={isLoading ? '…' : isError ? '—' : qualityLabel(quality)}
              quality={quality}
            />
          </span>
        </div>
        {hasErrors && (
          <DataRow
            label="Sync errors"
            value={`${errorCount} consecutive failure${errorCount !== 1 ? 's' : ''}`}
            accent
          />
        )}

        <div className={styles.syncRow}>
          <SystemPulse compact={false} />
        </div>
      </PanelBody>
    </Panel>
  );
}

// ─── Codex panel ──────────────────────────────────────────────────────────────

function CodexPanel() {
  const codexStatus = useLiveQuery(() => StaticDataService.getCodexStatus(), [], null);

  const [codexCooldown,  setCodexCooldown]  = useState(0);
  const [codexSyncing,   setCodexSyncing]   = useState(false);
  const [codexProgress,  setCodexProgress]  = useState<string | null>(null);
  const [codexResultMsg, setCodexResultMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
      await StaticDataService.refreshCodex({
        onProgress: (p) => setCodexProgress(`${p.status}…`),
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
    <Panel>
      <PanelHeader>
        <PanelLabel>Item Codex</PanelLabel>
        <HeaderBadge>Auto · 6h</HeaderBadge>
      </PanelHeader>
      <PanelBody>
        <DataRow
          label="Items cached"
          value={status === null ? '…' : isPopulated ? `${itemCount.toLocaleString()} items` : 'Empty — waiting for first sync'}
          accent={!isPopulated && status !== null}
        />
        <DataRow
          label="Last synced"
          value={status === null ? '…' : status.lastSync ? ageLabel(status.lastSync) : 'Never'}
          accent={status?.isStale && isPopulated}
        />
        {isPopulated && (
          <DataRow
            label="Source"
            value={status === null ? '…' : sourceLabel(status.source)}
          />
        )}
        {isPopulated && (
          <div className="data-row">
            <span className="data-row-label">Quality</span>
            <span className="data-row-value data-row-value-accent">
              <QualityValue
                value={status === null ? '…' : qualityLabel(status.quality)}
                quality={status?.quality}
              />
            </span>
          </div>
        )}
        {hasErrors && (
          <DataRow
            label="Sync errors"
            value={`${status!.errorCount} consecutive failure${status!.errorCount !== 1 ? 's' : ''}`}
            accent
          />
        )}

        {codexProgress && codexSyncing && (
          <p className={styles.progressLine}>{codexProgress}</p>
        )}

        {codexResultMsg && !codexSyncing && (
          <p className={clsx(styles.result, codexResultMsg.ok ? styles.resultOk : styles.resultErr)}>
            {codexResultMsg.ok ? '✓' : '✗'} {codexResultMsg.text}
          </p>
        )}

        <div className={styles.actions}>
          <RefreshButton
            onClick={() => void handleCodexRefresh()}
            disabled={false}
            cooldownMs={codexCooldown}
            label="Force Refresh Codex"
            loadingLabel={codexProgress ?? 'Downloading…'}
            isLoading={codexSyncing}
          />
        </div>

        <span className={styles.hint}>~3 MB download · locked 6h after each sync</span>
      </PanelBody>
    </Panel>
  );
}

// ─── Icon Cache panel ─────────────────────────────────────────────────────────

function IconCachePanel() {
  const [progress, setProgress] = useState<IconSyncProgress>(getIconSyncSnapshot);
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    setProgress(getIconSyncSnapshot());
    return onIconSyncProgress(setProgress);
  }, []);

  const isActive  = progress.phase === 'preflight'
                 || progress.phase === 'checking'
                 || progress.phase === 'downloading';
  const isDone    = progress.phase === 'done';
  const isAborted = progress.phase === 'aborted';
  const pct       = progress.pct;
  const missing   = Math.max(0, progress.total - progress.cached - progress.failed);
  const allGood   = isDone && missing === 0 && progress.failed === 0;

  const handleVerify = useCallback(() => {
    if (busy || isActive) return;
    setBusy(true);
    verifyAndRepairIcons();
  }, [busy, isActive]);

  const handleClearRedownload = useCallback(async () => {
    if (busy || isActive) return;
    setBusy(true);
    await clearAndRedownloadIcons();
  }, [busy, isActive]);

  useEffect(() => {
    if (progress.phase === 'done' || progress.phase === 'aborted') setBusy(false);
  }, [progress.phase]);

  let statusLabel = '—';
  if      (progress.phase === 'preflight')                    statusLabel = 'Testing connection…';
  else if (progress.phase === 'checking')                     statusLabel = 'Scanning cache…';
  else if (progress.phase === 'downloading')                  statusLabel = 'Downloading…';
  else if (isDone && allGood)                                 statusLabel = 'All icons cached';
  else if (isDone && progress.failed > 0)                     statusLabel = `${progress.failed.toLocaleString()} failed to download`;
  else if (isDone && missing > 0)                             statusLabel = `${missing.toLocaleString()} icons missing`;
  else if (isAborted)                                         statusLabel = 'Sync stopped — details below';
  else if (progress.phase === 'idle' && progress.total === 0) statusLabel = 'Waiting for startup sync…';

  // Diagnostic snapshots only need to recompute when the sync phase
  // changes — they're plain object reads but recomputing on every
  // progress tick (potentially 100s/sec) is wasteful.
  const fetchDiag = useMemo(() => getFetchDiagnostics(), [progress.phase, progress.backend]);
  const cacheDiag = useMemo(() => getCacheDiagnostics(), [progress.phase, progress.cached, progress.failed]);

  const backendBadge =
    progress.backend === 'tauri-http' ? 'Tauri HTTP · Native' :
    progress.backend === 'browser'    ? 'Browser · CORS'      :
                                        'Cache API · Local';

  return (
    <Panel>
      <PanelHeader>
        <PanelLabel>Icon Cache</PanelLabel>
        <HeaderBadge>{backendBadge}</HeaderBadge>
      </PanelHeader>
      <PanelBody>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={clsx(
              styles.progressFill,
              isActive  && styles.progressFillActive,
              allGood   && styles.progressFillComplete,
              isAborted && styles.progressFillError,
            )}
            style={{ transform: `scaleX(${(isAborted ? 100 : pct) / 100})` }}
          />
        </div>
        <div className={styles.progressMeta}>
          <span className={styles.progressMain}>
            {progress.total === 0
              ? 'Calculating…'
              : `${progress.cached.toLocaleString()} / ${progress.total.toLocaleString()} icons`}
          </span>
          <span className={clsx(
            styles.progressPct,
            allGood   && styles.progressPctOk,
            isAborted && styles.progressPctErr,
          )}>
            {isAborted ? 'ERROR' : `${pct}%`}
          </span>
        </div>

        <DataRow label="Status" value={statusLabel} accent={!allGood && (isDone || isAborted)} />
        {isDone && progress.failed > 0 && (
          <DataRow label="Failed" value={progress.failed.toLocaleString()} accent />
        )}
        {cacheDiag.lastError && (
          <DataRow label="Last error" value={cacheDiag.lastError.slice(0, 80)} accent />
        )}

        {isAborted && progress.error && (
          <p className={clsx(styles.result, styles.resultErr)}>✗ {progress.error}</p>
        )}

        {fetchDiag.isTauri && !fetchDiag.pluginLoaded && fetchDiag.pluginLoadError && (
          <p className={styles.notice}>
            The native HTTP plugin didn't load: <code>{fetchDiag.pluginLoadError}</code>.
            Close and reopen the app to let it rebuild. If you're running from
            source, restart <code>npm run tauri dev</code>.
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={clsx(styles.btn, (isActive || busy) && styles.btnLoading)}
            onClick={handleVerify}
            disabled={isActive || busy}
          >
            <span className={clsx(styles.btnIcon, isActive && styles.btnIconSpin)}>↻</span>
            <span>
              {isActive
                ? (progress.phase === 'preflight' ? 'Testing connection…'
                  : progress.phase === 'checking' ? 'Scanning cache…'
                  : `Downloading ${progress.cached.toLocaleString()} / ${progress.total.toLocaleString()}`)
                : 'Verify & repair icons'}
            </span>
          </button>

          <button
            type="button"
            className={clsx(styles.btn, styles.btnGhost)}
            onClick={() => void handleClearRedownload()}
            disabled={isActive || busy}
          >
            <span className={styles.btnIcon}>⟳</span>
            <span>Clear & Redownload</span>
          </button>
        </div>

        <span className={styles.hint}>
          Icons download once, then load instantly from your machine. No
          internet needed after the first sync.
        </span>
      </PanelBody>
    </Panel>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

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
      setResult('Local data cleared. Reloading the app…');
      setStep('idle');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <Panel className={styles.dangerPanel}>
      <PanelHeader>
        <PanelLabel>Danger Zone</PanelLabel>
        <HeaderBadge variant="danger">Irreversible</HeaderBadge>
      </PanelHeader>
      <PanelBody>
        <p className={styles.dangerDesc}>
          Wipes every local cache — worldstate, item codex, sync history, and
          refresh cooldowns. The app will re-download everything on next launch.
          Use this if data looks wrong and a refresh hasn't helped.
        </p>

        {result && (
          <p className={clsx(styles.result, styles.resultOk)}>✓ {result}</p>
        )}

        <div className={styles.actions}>
          {step === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={() => void handleClear()}
                className={clsx(styles.btn, styles.btnDangerConfirm)}
              >
                <span>Yes, clear everything</span>
              </button>
              <button
                type="button"
                onClick={() => setStep('idle')}
                className={clsx(styles.btn, styles.btnGhost)}
              >
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={step === 'clearing'}
              className={clsx(styles.btn, styles.btnDanger)}
            >
              <span>{step === 'clearing' ? 'Clearing…' : 'Clear All Local Data'}</span>
            </button>
          )}
        </div>
      </PanelBody>
    </Panel>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <PageHero prefix="SYSTEM" title="CONFIGURATION" subtitle="Data sync status & diagnostics" />

      <SectionDivider label="Data Systems" />
      <div className={styles.grid2}>
        <WorldstatePanel />
        <CodexPanel />
      </div>

      <SectionDivider label="Icon Cache" />
      <IconCachePanel />

      <SectionDivider label="Event Log" />
      <EventLogPanel />

      <SectionDivider label="Danger Zone" />
      <DangerPanel />
    </div>
  );
}
