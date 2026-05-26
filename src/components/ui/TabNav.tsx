interface TabNavItem {
  id: string;
  label: string;
  count?: number;
}

interface TabNavProps {
  tabs: TabNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * Horizontal gold-underline tab navigation strip.
 * Used for sub-page navigation within feature pages.
 */
export function TabNav({ tabs, activeId, onSelect, className = '' }: TabNavProps) {
  return (
    <div className={`tab-nav ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className="tab-nav-item"
          data-active={tab.id === activeId ? 'true' : undefined}
          onClick={() => onSelect(tab.id)}
          type="button"
        >
          {tab.label}
          {tab.count != null && (
            <span className="tab-nav-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
