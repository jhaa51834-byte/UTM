import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import {
  LayoutDashboard,
  Link2,
  ListChecks,
  BarChart3,
  Megaphone,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Bell,
  Search,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/builder", label: "Builder", icon: Link2 },
  { path: "/links", label: "Links", icon: ListChecks },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/campaigns", label: "Campaigns", icon: Megaphone },
  { path: "/settings", label: "Settings", icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/builder": "UTM Builder",
  "/links": "Links",
  "/analytics": "Analytics",
  "/campaigns": "Campaigns",
  "/settings": "Settings",
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const currentPage = PAGE_TITLES[location.pathname] || "TrackFlow";
  const initials = (user?.full_name || user?.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-0)]">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-white/[0.05] bg-[#08080e] transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[68px]" : "w-[220px]"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[60px] items-center gap-2.5 border-b border-white/[0.05] px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition-transform hover:scale-105">
            T
          </div>
          {!sidebarCollapsed && (
            <span className="gradient-text text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              TrackFlow
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5 text-white"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="nav-active-indicator" />}
                  <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    isActive ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"
                  }`} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/[0.05] p-2.5 space-y-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-400 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>

          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5 border border-white/[0.04]">
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-white shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-200">
                  {user?.full_name || user?.email || "User"}
                </p>
                <p className="truncate text-[10px] text-zinc-600">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="shrink-0 rounded-md p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {sidebarCollapsed && (
            <button
              onClick={logout}
              className="flex w-full items-center justify-center rounded-lg py-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-[60px] items-center justify-between border-b border-white/[0.05] bg-[#08080e]/60 px-6 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>
              {currentPage}
            </h1>
            <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 border border-violet-500/15">
              <Sparkles className="h-3 w-3 text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-300">Enterprise</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search placeholder */}
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-white/[0.03] px-3.5 py-2 border border-white/[0.05] text-zinc-600 transition-colors hover:border-white/[0.1]">
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search...</span>
              <kbd className="ml-4 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-mono text-zinc-600">⌘K</kbd>
            </div>

            {/* Notifications */}
            <button className="relative rounded-xl p-2.5 text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-500" />
            </button>

            {/* Avatar */}
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/15 flex items-center justify-center text-[10px] font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
