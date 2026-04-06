import { Terminal, Search, Bell, Settings, Power, ListChecks } from "lucide-react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const { activeTab, setActiveTab } = useNavigationStore();
  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-280px)] border-b border-primary-container/20 bg-surface-container-lowest/80 backdrop-blur-md flex justify-between items-center h-16 px-8 ml-[280px] z-40">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-primary opacity-50">
        <Terminal className="size-4" strokeWidth={1.5} />
        <span className="font-label text-[10px] uppercase tracking-widest font-bold">
          ROOT@TENNOPLAN:~/{activeItem?.breadcrumb ?? "HOME"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-8">
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
