import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, Play, Users, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/runs", icon: Play, label: "Runs" },
  { to: "/companies", icon: Building2, label: "Companies" },
  { to: "/poc-leads", icon: Users, label: "POC Leads" },
  { to: "/pipeline", icon: Activity, label: "Pipeline" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground text-sm shadow-lg shadow-primary/20">
            Q
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="text-base font-bold tracking-tight text-sidebar-foreground">QntmLogic</span>
              <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Dashboard</p>
            </div>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-4">
            <GlobalSearch />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3 pt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-lg p-2 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
