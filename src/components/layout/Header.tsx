import { useEffect, useState } from "react";
import { Terminal, Search, Bell, Settings, Power, ListChecks } from "lucide-react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { useHeartbeatStore, type HeartbeatStatus } from "@/store/heartbeat";
import { cn } from "@/lib/utils";

const EXPANDED_W = 260;
const RAIL_W = 72;

// ── Heartbeat Indicator ─────────────────────────────────────────────────────

const STATUS_META: Record<HeartbeatStatus, { dot: string; pulse: boolean; label: (age: string) => string }> = {
  live:    { dot: '#4ade80', pulse: false, label: ()      => 'LIVE'           },
  cached:  { dot: '#f59e0b', pulse: false, label: (age)   => `CACHED ${age}`  },
  offline: { dot: '#f87171', pulse: false, label: ()      => 'OFFLINE'        },
  syncing: { dot: '#60a5fa', pulse: true,  label: ()      => 'SYNCING…'       },
};

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function HeartbeatIndicator() {
  const { status, lastSyncMs, triggerRefetch } = useHeartbeatStore();
  const [now, setNow] = useState(() => Date.now());

  // 1-second tick so the "Xm ago" label stays fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const meta     = STATUS_META[status];
  const ageMs    = now - lastSyncMs;
  const ageLabel = formatAge(ageMs);
  const label    = meta.label(ageLabel);

  return (
    <button
      onClick={triggerRefetch}
      disabled={status === 'syncing'}
      title={
        status === 'live'    ? `Data synced ${ageLabel} — click to force refresh` :
        status === 'cached'  ? `Using cached data (${ageLabel}) — click to retry` :
        status === 'offline' ? 'No connection — click to retry'                   :
        'Syncing…'
      }
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        6,
        padding:    '4px 10px',
        border:     `1px solid ${meta.dot}30`,
        background: `${meta.dot}08`,
        cursor:     status === 'syncing' ? 'default' : 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (status !== 'syncing') {
          (e.currentTarget as HTMLButtonElement).style.background     = `${meta.dot}14`;
          (e.currentTarget as HTMLButtonElement).style.borderColor    = `${meta.dot}55`;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background  = `${meta.dot}08`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${meta.dot}30`;
      }}
    >
      {/* Status dot */}
      <span
        className={meta.pulse ? 'heartbeat-dot-pulse' : ''}
        style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   meta.dot,
          boxShadow:    `0 0 6px ${meta.dot}88`,
          flexShrink:   0,
          display:      'inline-block',
        }}
      />

      {/* Label */}
      <span
        style={{
          fontFamily:    'var(--font-label)',
          fontSize:      '0.44rem',
          fontWeight:    700,
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          color:         meta.dot,
          whiteSpace:    'nowrap',
          opacity:       0.85,
        }}
      >
        {label}
      </span>
    </button>
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

        {/* Global Heartbeat Indicator */}
        <HeartbeatIndicator />

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
          <button className="text-secondary hover:text-on-surface hover:bg-white/5 p-2 transition-colors">
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
