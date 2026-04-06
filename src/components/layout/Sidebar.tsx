import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-primary-container/20 bg-surface-dim/90 backdrop-blur-xl flex flex-col py-8 px-4 z-50 shadow-[0_0_32px_rgba(193,163,85,0.06)]">
      {/* Logo */}
      <div className="mb-10 px-4">
        <h1 className="font-headline text-2xl font-black tracking-[0.2em] text-primary">
          TENNOPLAN
        </h1>
        <p className="font-headline text-[10px] uppercase tracking-[0.1em] text-primary opacity-70">
          SOMATIC LINK ACTIVE
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center w-full px-4 py-3 transition-all duration-300 group text-left",
                isActive
                  ? "text-primary bg-primary-container/10 border-r-2 border-primary shadow-[0_0_15px_rgba(227,195,114,0.3)]"
                  : "text-secondary opacity-60 hover:opacity-100 hover:bg-primary-container/5 hover:text-on-surface border-r-2 border-transparent"
              )}
            >
              <Icon className="mr-3 size-5" strokeWidth={1.5} />
              <span className="font-label font-light tracking-tight text-xs">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Operator */}
      <div className="mt-auto px-4 flex items-center gap-4">
        <div className="size-10 rounded-sm bg-surface-container-highest border border-primary/20 flex items-center justify-center">
          <span className="font-headline text-primary text-sm">OP</span>
        </div>
        <div>
          <p className="font-label text-[10px] text-primary tracking-widest font-bold">
            OPERATOR_ID
          </p>
          <p className="font-label text-[9px] text-secondary opacity-50 uppercase">
            Synaptic Sync 98%
          </p>
        </div>
      </div>
    </aside>
  );
}
