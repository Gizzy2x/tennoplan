import { useEffect, useState } from "react";
import { Terminal, Search, Bell, Settings, Power, ListChecks, Activity } from "lucide-react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { useHeartbeatStore } from "@/store/heartbeat";
import { SyncService } from "@/services/SyncService";
import { colorValues } from "@/tokens";
import { DataSourceBadge } from "./DataSourceBadge";

const EXPANDED_W = 260;
const RAIL_W = 72;

// ── SystemPulse ─────────────────────────────────────────────────────────────

const GOLD = colorValues['accent-gold'];
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
        {isSyncing ? 'Syncing…' : `Last synced: ${ageLabel}`}
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
        borderBottom: `1px solid var(--color-accent-gold)15`,
        backgroundColor: `var(--color-bg-primary)cc`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 64,
        paddingLeft: 32,
        paddingRight: 32,
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 40,
      }}
    >
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-2"
        style={{ color: GOLD, opacity: 0.5 }}
      >
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 6,
            paddingBottom: 6,
            fontFamily: "var(--font-label)",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            border: `1px solid ${activeTab === "dailies-weeklies" ? `${GOLD}66` : `${GOLD}1a`}`,
            backgroundColor: activeTab === "dailies-weeklies" ? `${GOLD}14` : "transparent",
            color: activeTab === "dailies-weeklies" ? GOLD : `var(--color-text-muted)66`,
            transition: "all 200ms",
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: activeTab === "dailies-weeklies" ? `0 0 10px ${GOLD}26` : "none",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "dailies-weeklies") {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.color = `${GOLD}b3`;
              btn.style.borderColor = `${GOLD}40`;
              btn.style.backgroundColor = `${GOLD}0a`;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "dailies-weeklies") {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.color = `var(--color-text-muted)66`;
              btn.style.borderColor = `${GOLD}1a`;
              btn.style.backgroundColor = "transparent";
            }
          }}
        >
          <ListChecks className="size-3.5" strokeWidth={1.5} />
          Dailies &amp; Weeklies
        </button>

        {/* Global System Pulse */}
        <SystemPulse />

        {/* Upstream source indicator (WS / OFFICIAL) */}
        <DataSourceBadge />

        {/* Search */}
        <div
          className="relative flex items-center pb-1"
          style={{
            borderBottom: `1px solid ${GOLD}33`,
          }}
        >
          <Search
            className="size-4 mr-2"
            strokeWidth={1.5}
            style={{ color: `${GOLD}66` }}
          />
          <input
            type="text"
            placeholder="SEARCH..."
            style={{
              backgroundColor: "transparent",
              border: "none",
              padding: 0,
              fontSize: "10px",
              fontFamily: "var(--font-label)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: GOLD,
              outline: "none",
              width: "192px",
            } as any}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.color = GOLD;
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.color = GOLD;
            }}
          />
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-4">
          <button
            style={{
              padding: 8,
              color: `var(--color-text-muted)99`,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = `var(--color-text-primary)`;
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${GOLD}0a`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = `var(--color-text-muted)99`;
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            <Bell className="size-5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            title="Settings"
            style={{
              padding: 8,
              color: activeTab === "settings" ? GOLD : `var(--color-text-muted)99`,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "settings") {
                (e.currentTarget as HTMLButtonElement).style.color = `var(--color-text-primary)`;
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${GOLD}0a`;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "settings") {
                (e.currentTarget as HTMLButtonElement).style.color = `var(--color-text-muted)99`;
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              }
            }}
          >
            <Settings className="size-5" strokeWidth={1.5} />
          </button>
          <button
            style={{
              padding: 8,
              color: `var(--color-text-muted)99`,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = `var(--color-text-primary)`;
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${GOLD}0a`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = `var(--color-text-muted)99`;
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            <Power className="size-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
