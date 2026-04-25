import { useState } from "react";
import { NAV_ITEMS, useNavigationStore } from "@/store/navigation";
import { colors } from "@/tokens";
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
        backgroundColor: colors.bgPrimary,
        borderRight: `1px solid ${colors.borderDefault}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: `0 0 32px rgba(227, 195, 114, 0.06)`,
      }}
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col py-8 overflow-hidden",
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
          <h1
            className="font-headline text-2xl font-black tracking-[0.2em] whitespace-nowrap"
            style={{ color: colors.accentGold }}
          >
            TENNOPLAN
          </h1>
          <p
            className="font-headline text-[10px] uppercase tracking-[0.1em] whitespace-nowrap"
            style={{ color: colors.accentGold, opacity: 0.7 }}
          >
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
          <span
            className="font-headline text-xl font-black tracking-[0.15em] somatic-pulse"
            style={{ color: colors.accentGold }}
          >
            T
          </span>
          {/* Pulsing somatic dot */}
          <span
            className="size-1 rounded-full somatic-pulse"
            style={{ backgroundColor: colors.accentGold, opacity: 0.6 }}
          />
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
                style={{
                  color: isActive ? colors.accentGold : colors.textMuted,
                  backgroundColor: isActive ? "rgba(227, 195, 114, 0.08)" : "transparent",
                }}
                className={cn(
                  "relative flex items-center w-full py-3 text-left",
                  "transition-all duration-200",
                  showExpanded ? "px-5" : "px-0 justify-center"
                )}
              >
                {/* Left accent bar — always rendered, only visible when active */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? colors.accentGold : "transparent",
                    boxShadow: isActive ? `0 0 10px rgba(227, 195, 114, 0.55)` : "none",
                  }}
                />

                {/* Active background glow */}
                {isActive && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 20px rgba(227, 195, 114, 0.06)` }}
                  />
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
                  <div
                    className="font-label text-[10px] uppercase tracking-widest px-3 py-1.5 shadow-xl"
                    style={{
                      backgroundColor: colors.bgPrimary,
                      border: `1px solid ${colors.accentGold}40`,
                      color: colors.accentGold,
                    }}
                  >
                    {item.label}
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
          "shrink-0 mt-6 pt-4",
          showExpanded ? "px-4" : "flex justify-center"
        )}
        style={{
          borderTop: `1px solid ${colors.accentGold}15`,
        }}
      >
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? "Lock sidebar open" : "Collapse to rail"}
          style={{
            color: colors.textMuted,
          }}
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded-sm",
            "transition-colors duration-200 hover:opacity-70"
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
