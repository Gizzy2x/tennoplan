import { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Gem, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'market',    label: 'Market',    icon: <ShoppingCart size={20} /> },
  { id: 'relics',    label: 'Relics',    icon: <Gem size={20} /> },
  { id: 'settings',  label: 'Settings',  icon: <Settings size={20} /> },
];

type Props = {
  activeTab: string;
  onTabChange: (id: string) => void;
};

export function Sidebar({ activeTab, onTabChange }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-logo">
        {!collapsed && <span className="sidebar-logo-text">Tennoplan</span>}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${activeTab === item.id ? 'sidebar-nav-item--active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
