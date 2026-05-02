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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery }         from 'dexie-react-hooks';
import { PageHero }             from '@/components/ui/PageHero';
import { useWorldstate }        from '@/hooks/useWorldstate';
import { WorldstateSync }       from '@/services/WorldstateSync';
import { StaticDataService }    from '@/services/StaticDataService';
import { db }                   from '@/adapters/storage/db';
import type { DataSource, DataQuality } from '@/core/domain/tennoplanApi';
import './SettingsPage.css';

// ── Rate-limit constants ───────────────────────────────────────────────────────

const WS_COOLDOWN_MS    = 60_000;         // 60s — matches poll interval
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
  const cls =
    quality === 'high'   ? 'settings-pip settings-pip--high'   :
    quality === 'medium' ? 'settings-pip settings-pip--medium' :
    quality === 'low'    ? 'settings-pip settings-pip--low'    :
                           'settings-pip settings-pip--unknown';
  return (
    <span className={cls} aria-hidden="true" />
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
    <div className="settings-status-row">
      <span className="settings-status-label typo-label-xs">{label}</span>
      <span className={`settings-status-value typo-label-xs${accent ? ' settings-status-value--accent' : ''}`}>
        {pip && <QualityPip quality={quality} />}
        {value}
      </span>
    </div>
  );
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return <div className="settings-block">{children}</div>;
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
      className={`settings-btn${isLoading ? ' settings-btn--loading' : ''}${onCooldown ? ' settings-btn--cooldown' : ''}`}
    >
      <span className={`settings-btn-icon${isLoading ? ' settings-btn-icon--spin' : ''}`}>↻</span>
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
  const { lastSync, source, quality, errorCount, isLoading, isError } =
    useWorldstate({ registerRefetch: false });

  const [wsCooldown,   setWsCooldown]   = useState(0);
  const [wsSyncing,    setWsSyncing]    = useState(false);
  const [wsResultMsg,  setWsResultMsg]  = useState<{ ok: boolean; text: string } | null>(null);

  const handleWsRefresh = useCallback(async () => {
    if (wsSyncing || wsCooldown > 0) return;
    setWsSyncing(true);
    setWsResultMsg(null);
    try {
      await WorldstateSync.sync();
      setWsResultMsg({ ok: true, text: 'Worldstate refreshed.' });
      setWsCooldown(WS_COOLDOWN_MS);
    } catch (e) {
      setWsResultMsg({ ok: false, text: e instanceof Error ? e.message : 'Refresh failed' });
    } finally {
      setWsSyncing(false);
    }
  }, [wsSyncing, wsCooldown]);

  const hasErrors = errorCount > 0;

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <span className="settings-panel-title typo-label-xs">LIVE WORLDSTATE</span>
        <span className="settings-panel-badge typo-label-xs">AUTO · 60s</span>
      </div>

      <SectionBlock>
        <StatusRow label="Last sync"   value={isLoading ? '…' : isError ? 'Never' : ageLabel(lastSync)} accent={isError} />
        <StatusRow label="Source"      value={isLoading ? '…' : sourceLabel(source)} />
        <StatusRow label="Quality"     value={isLoading ? '…' : qualityLabel(quality)} pip quality={quality} />
        {hasErrors && (
          <StatusRow label="Sync errors" value={`${errorCount} consecutive failure${errorCount !== 1 ? 's' : ''}`} accent />
        )}
      </SectionBlock>

      {wsResultMsg && (
        <p className={`settings-result typo-label-xs${wsResultMsg.ok ? ' settings-result--ok' : ' settings-result--err'}`}>
          {wsResultMsg.ok ? '✓' : '✗'} {wsResultMsg.text}
        </p>
      )}

      <RefreshButton
        onClick={() => void handleWsRefresh()}
        disabled={false}
        cooldownMs={wsCooldown}
        label="Force Refresh"
        loadingLabel="Syncing…"
        isLoading={wsSyncing}
      />

      <p className="settings-hint typo-label-xs">
        Reads from Cloudflare KV — no upstream API calls. Safe to use.
      </p>
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
    <div className="settings-panel">
      <div className="settings-panel-header">
        <span className="settings-panel-title typo-label-xs">ITEM CODEX</span>
        <span className="settings-panel-badge typo-label-xs">AUTO · 6h</span>
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
        <p className="settings-notice typo-label-xs">
          Worker codex cron runs every 6h. First population happens at the next 0/6/12/18 UTC tick.
          You can force it now — it will download ~3MB from Cloudflare KV.
        </p>
      )}

      {codexProgress && codexSyncing && (
        <p className="settings-progress typo-label-xs">{codexProgress}</p>
      )}

      {codexResultMsg && !codexSyncing && (
        <p className={`settings-result typo-label-xs${codexResultMsg.ok ? ' settings-result--ok' : ' settings-result--err'}`}>
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

      <p className="settings-hint typo-label-xs">
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
      setResult('All local data cleared. Both services will re-sync on next access.');
      setStep('idle');
    }
  };

  return (
    <div className="settings-panel settings-panel--danger">
      <div className="settings-panel-header">
        <span className="settings-panel-title settings-panel-title--danger typo-label-xs">DANGER ZONE</span>
      </div>

      <p className="settings-danger-desc typo-label-xs">
        Clears all locally cached data — worldstate snapshot, item codex, sync metadata,
        and rate-limit state. Both services will re-fetch on next load.
      </p>

      {result && (
        <p className="settings-result settings-result--ok typo-label-xs">✓ {result}</p>
      )}

      <div className="settings-danger-actions">
        {step === 'confirm' ? (
          <>
            <button
              onClick={() => void handleClear()}
              className="settings-btn settings-btn--danger-confirm"
            >
              <span className="typo-label-xs">Confirm — clear everything</span>
            </button>
            <button
              onClick={() => setStep('idle')}
              className="settings-btn settings-btn--ghost"
            >
              <span className="typo-label-xs">Cancel</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => void handleClear()}
            disabled={step === 'clearing'}
            className="settings-btn settings-btn--danger"
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div className="settings-page">
      <PageHero prefix="SYSTEM" title="SETTINGS" subtitle="Data sync status & configuration" />

      <div className="settings-grid">
        <WorldstatePanel />
        <CodexPanel />
      </div>

      <DangerPanel />
    </div>
  );
}
