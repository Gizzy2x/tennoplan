import { useState } from "react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const EXPANDED_W = 260;
const RAIL_W = 72;

export function Sidebar() {
  const { activeTab, setActiveTab, isCollapsed, toggleCollapsed } =
    useNavigationStore();
  const [isPeeking, setIsPeeking] = useState(false);

  // Visual expansion state: expanded when not collapsed, or when peeking
  const showExpanded = !isCollapsed || isPeeking;

  return (
    <aside
      style={{
        width: showExpanded ? EXPANDED_W : RAIL_W,
        transition: "width 250ms ease-in-out",
      }}
      className={cn(
        "fixed left-0 top-0 h-screen border-r border-primary-container/20",
        "bg-surface-dim/90 backdrop-blur-xl flex flex-col py-8 overflow-hidden",
        "shadow-[0_0_32px_rgba(193,163,85,0.06)]",
        // Peek overlays content; locked expansion pushes it (handled by AppShell margin)
        isPeeking && isCollapsed ? "z-[60]" : "z-50"
      )}
      onMouseEnter={() => isCollapsed && setIsPeeking(true)}
      onMouseLeave={() => setIsPeeking(false)}
    >
      {/* ── Logo ────────────────────────────────────────────────── */}
      <div className="mb-10 px-4 relative h-[52px] shrink-0">
        {/* Expanded: full wordmark */}
        <div
          className={cn(
            "absolute inset-0 px-4 flex flex-col justify-center",
            "transition-opacity duration-200",
            showExpanded ? "opacity-100 delay-75" : "opacity-0"
          )}
        >
          <h1 className="font-headline text-2xl font-black tracking-[0.2em] text-primary whitespace-nowrap">
            TENNOPLAN
          </h1>
          <p className="font-headline text-[10px] uppercase tracking-[0.1em] text-primary/70 whitespace-nowrap">
            SOMATIC LINK ACTIVE
          </p>
        </div>

        {/* Collapsed: T monogram with subtle pulse */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1",
            "transition-opacity duration-200",
            !showExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="font-headline text-xl font-black tracking-[0.15em] text-primary somatic-pulse">
            T
          </span>
          {/* Pulsing somatic dot */}
          <span className="size-1 rounded-full bg-primary/60 somatic-pulse" />
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative group/navitem">
              <button
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative flex items-center w-full py-3 text-left",
                  "transition-all duration-200",
                  showExpanded ? "px-5" : "px-0 justify-center",
                  isActive
                    ? "text-primary bg-primary-container/10"
                    : "text-secondary/55 hover:text-on-surface hover:bg-primary-container/5"
                )}
              >
                {/* Left accent bar — always rendered, only visible when active */}
                <span
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200",
                    isActive
                      ? "bg-primary shadow-[0_0_10px_rgba(227,195,114,0.55)]"
                      : "bg-transparent"
                  )}
                />

                {/* Active background glow */}
                {isActive && (
                  <span className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(227,195,114,0.06)]" />
                )}

                <Icon
                  className={cn(
                    "size-5 shrink-0 transition-[margin] duration-200",
                    showExpanded ? "mr-3.5" : "mr-0"
                  )}
                  strokeWidth={1.5}
                />

                {/* Label — fades out when rail, no layout shift (opacity + w-0) */}
                <span
                  className={cn(
                    "font-label font-light tracking-tight text-xs whitespace-nowrap",
                    "transition-opacity duration-150",
                    showExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}
                >
                  {item.label}
                </span>
              </button>

              {/* Tooltip — only renders in collapsed non-peek state */}
              {isCollapsed && !isPeeking && (
                <div
                  className={cn(
                    "pointer-events-none absolute top-1/2 -translate-y-1/2 z-[70]",
                    "opacity-0 group-hover/navitem:opacity-100 transition-opacity duration-150",
                  )}
                  style={{ left: RAIL_W + 8 }}
                >
                  <div className="bg-surface-container-lowest border border-primary/25 px-3 py-1.5 shadow-xl">
                    <span className="font-label text-[10px] uppercase tracking-widest text-primary">
                      {item.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Collapse Toggle ──────────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 mt-6 pt-4 border-t border-primary-container/10",
          showExpanded ? "px-4" : "flex justify-center"
        )}
      >
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? "Lock sidebar open" : "Collapse to rail"}
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded-sm",
            "text-secondary/35 hover:text-primary/70",
            "transition-colors duration-200"
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="font-label text-[9px] uppercase tracking-widest whitespace-nowrap">
                COLLAPSE
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
