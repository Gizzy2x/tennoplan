import { useEffect, useState } from "react";
import { Search, Settings, ListChecks, Activity } from "lucide-react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { useHeartbeatStore } from "@/store/heartbeat";
import { WorldstateSync } from "@/services/WorldstateSync";
import { DataSourceBadge } from "./DataSourceBadge";
import { SIDEBAR_W } from "./Sidebar";

const COOLDOWN_MS = 60_000;

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function SystemPulse() {
  const { status, lastSyncMs, setSync } = useHeartbeatStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ageMs       = now - lastSyncMs;
  const ageLabel    = formatAge(ageMs);
  const isSyncing   = status === 'syncing';
  const secondsLeft = Math.max(0, Math.ceil((COOLDOWN_MS - ageMs) / 1000));
  const inCooldown  = secondsLeft > 0 && !isSyncing;
  const isDisabled  = isSyncing || inCooldown;

  const title = isSyncing
    ? 'Syncing data…'
    : inCooldown
      ? `Try again in ${secondsLeft}s`
      : `Last synced: ${ageLabel} · Click to sync`;

  async function handleSync() {
    if (isDisabled) return;
    setSync('syncing');
    await WorldstateSync.sync();
  }

  return (
    <div className="header-pulse">
      <button
        onClick={handleSync}
        disabled={isDisabled}
        title={title}
        className={`header-pulse-btn ${isSyncing ? 'system-pulse-ring is-syncing' : ''}`}
        aria-label={title}
      >
        <Activity size={13} strokeWidth={2} />
      </button>
      <span className="header-pulse-label" data-syncing={isSyncing}>
        {isSyncing ? 'Syncing…' : `Last sync ${ageLabel}`}
      </span>
    </div>
  );
}

export function Header() {
  const { activeTab, setActiveTab } = useNavigationStore();
  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const isDailies  = activeTab === "dailies-weeklies";
  const isSettings = activeTab === "settings";

  return (
    <header
      className="app-header"
      style={{
        marginLeft: SIDEBAR_W,
        width: `calc(100% - ${SIDEBAR_W}px)`,
      }}
    >
      {/* ── Identity: active page (dominant left element) ───────────── */}
      <div className="header-identity">
        <span className="header-identity-prefix">TENNOPLAN</span>
        <span className="header-identity-sep" aria-hidden>/</span>
        <h1 className="header-identity-title">
          {activeItem?.label ?? "HOME"}
        </h1>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="header-actions">
        {/* Persistent Dailies & Weeklies quick-access */}
        <button
          onClick={() => setActiveTab("dailies-weeklies")}
          className="header-quickbtn"
          data-active={isDailies}
        >
          <ListChecks className="size-3.5" strokeWidth={1.5} />
          <span>Dailies &amp; Weeklies</span>
        </button>

        <SystemPulse />
        <DataSourceBadge />

        {/* Search */}
        <div className="header-search">
          <Search className="size-4" strokeWidth={1.5} />
          <input type="text" placeholder="SEARCH..." />
        </div>

        {/* Settings — the only persistent secondary action */}
        <button
          onClick={() => setActiveTab("settings")}
          title="Settings"
          aria-label="Settings"
          className="header-icon-btn"
          data-active={isSettings}
        >
          <Settings className="size-5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
