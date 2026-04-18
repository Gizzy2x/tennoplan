import { useEffect, useState } from "react";
import { Terminal, Search, Bell, Settings, Power, ListChecks, Activity } from "lucide-react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { useHeartbeatStore } from "@/store/heartbeat";
import { SyncService } from "@/services/SyncService";
import { DataSourceBadge } from "./DataSourceBadge";
import { cn } from "@/lib/utils";

const EXPANDED_W = 260;
const RAIL_W = 72;

// ── SystemPulse ─────────────────────────────────────────────────────────────

const GOLD = '#E3C372';
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
    ? 'Somatic link syncing…'
    : inCooldown
      ? `Next sync available in ${secondsLeft}s`
      : `Last Link: ${ageLabel} · Click to sync`;

  async function handleSync() {
    if (isDisabled) return;
    setSync('syncing');
    await SyncService.performSync();
    // heartbeat updated internally by SyncService.performSync — no manual setSync needed
  }

  // Icon color: gold while syncing, dimmed otherwise
  const iconColor  = isSyncing ? GOLD : 'rgba(227,195,114,0.35)';
  const ringColor  = `${GOLD}60`;

  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      {/* The pulse button */}
      <button
        onClick={handleSync}
        disabled={isDisabled}
        title={title}
        style={{
          position:     'relative',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          width:        28,
          height:       28,
          borderRadius: '50%',
          border:       `1px solid ${isSyncing ? `${GOLD}50` : 'rgba(227,195,114,0.15)'}`,
          background:   isSyncing ? `${GOLD}0C` : 'transparent',
          cursor:       isDisabled ? 'default' : 'pointer',
          transition:   'border-color 0.2s, background 0.2s',
          flexShrink:   0,
        }}
        className={isSyncing ? 'system-pulse-ring' : ''}
        onMouseEnter={e => {
          if (!isDisabled) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = `${GOLD}45`;
            (e.currentTarget as HTMLButtonElement).style.background  = `${GOLD}10`;
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = isSyncing ? `${GOLD}50` : 'rgba(227,195,114,0.15)';
          (e.currentTarget as HTMLButtonElement).style.background  = isSyncing ? `${GOLD}0C` : 'transparent';
        }}
      >
        <Activity
          size={13}
          strokeWidth={2}
          style={{ color: iconColor, transition: 'color 0.3s' }}
        />
      </button>

      {/* Timestamp label */}
      <span
        style={{
          fontFamily:    'var(--font-label)',
          fontSize:      '0.40rem',
          fontWeight:    700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         isSyncing ? GOLD : ringColor,
          whiteSpace:    'nowrap',
          transition:    'color 0.3s',
        }}
      >
        {isSyncing ? 'Linking…' : `Last Link: ${ageLabel}`}
      </span>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

export function Header() {
  const { activeTab, setActiveTab, isCollapsed } = useNavigationStore();
  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const sidebarW = isCollapsed ? RAIL_W : EXPANDED_W;

  return (
    <header
      style={{
        marginLeft: sidebarW,
        width: `calc(100% - ${sidebarW}px)`,
        transition: "margin-left 250ms ease-in-out, width 250ms ease-in-out",
      }}
      className="fixed top-0 right-0 border-b border-primary-container/20 bg-surface-container-lowest/80 backdrop-blur-md flex justify-between items-center h-16 px-8 z-40"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-primary opacity-50">
        <Terminal className="size-4" strokeWidth={1.5} />
        <span className="font-label text-[10px] uppercase tracking-widest font-bold">
          ROOT@TENNOPLAN:~/{activeItem?.breadcrumb ?? "HOME"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        {/* Persistent Dailies & Weeklies quick-access */}
        <button
          onClick={() => setActiveTab("dailies-weeklies")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 font-label text-[9px] uppercase tracking-widest border transition-all duration-200 whitespace-nowrap",
            activeTab === "dailies-weeklies"
              ? "text-primary border-primary/40 bg-primary/[0.08] shadow-[0_0_10px_rgba(227,195,114,0.15)]"
              : "text-secondary/40 border-primary/10 hover:text-primary/70 hover:border-primary/25 hover:bg-primary/[0.04]"
          )}
        >
          <ListChecks className="size-3.5" strokeWidth={1.5} />
          Dailies &amp; Weeklies
        </button>

        {/* Global System Pulse */}
        <SystemPulse />

        {/* Upstream source indicator (WS / OFFICIAL) */}
        <DataSourceBadge />

        {/* Search */}
        <div className="relative flex items-center border-b border-primary/20 pb-1">
          <Search className="size-4 text-primary/40 mr-2" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="SEARCH SYSTEMS..."
            className="bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-[10px] font-label uppercase tracking-widest text-primary placeholder:text-primary/20 w-48"
          />
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-4">
          <button className="text-secondary hover:text-on-surface hover:bg-white/5 p-2 transition-colors">
            <Bell className="size-5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            title="Settings"
            className={cn(
              "p-2 transition-colors",
              activeTab === "settings"
                ? "text-primary"
                : "text-secondary hover:text-on-surface hover:bg-white/5"
            )}
          >
            <Settings className="size-5" strokeWidth={1.5} />
          </button>
          <button className="text-secondary hover:text-on-surface hover:bg-white/5 p-2 transition-colors">
            <Power className="size-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
