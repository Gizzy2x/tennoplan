import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";

export const SIDEBAR_W = 72;

export function Sidebar() {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <aside
      className="sidebar-rail"
      style={{ width: SIDEBAR_W }}
    >
      {/* Identity mark */}
      <div className="sidebar-rail-brand">
        <span className="sidebar-rail-brand-mark somatic-pulse">T</span>
        <span className="sidebar-rail-brand-dot somatic-pulse" />
      </div>

      {/* Navigation icons */}
      <nav className="sidebar-rail-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="sidebar-rail-item">
              <button
                onClick={() => setActiveTab(item.id)}
                className="sidebar-rail-btn"
                data-active={isActive}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-5" strokeWidth={1.5} />
                {/* Right-edge accent — visually points toward header */}
                <span className="sidebar-rail-accent" aria-hidden />
              </button>

              {/* Hover tooltip */}
              <div className="sidebar-rail-tooltip">
                <span className="typo-label-xs">{item.label}</span>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
