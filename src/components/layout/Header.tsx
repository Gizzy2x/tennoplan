import { Search, Settings, ListChecks } from "lucide-react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { DataSourceBadge } from "./DataSourceBadge";
import { SystemPulse } from "./SystemPulse";
import { SIDEBAR_W } from "./Sidebar";

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

        <SystemPulse onLabelClick={() => setActiveTab('settings')} />
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
