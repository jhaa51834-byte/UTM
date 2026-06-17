import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/builder", label: "Builder", icon: "🔗" },
  { path: "/links", label: "Links", icon: "🔗" },
  { path: "/analytics", label: "Analytics", icon: "📈" },
  { path: "/campaigns", label: "Campaigns", icon: "🎯" },
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-white/[0.06] bg-[#0c0c11] transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white shadow-lg shadow-violet-500/30">
            T
          </div>
          {!sidebarCollapsed && (
            <span className="gradient-text text-base font-bold tracking-tight">
              TrackFlow
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-white shadow-sm shadow-violet-500/10"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`
              }
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm">
                {icon}
              </span>
              {!sidebarCollapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/[0.06] p-2.5">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mb-2 flex w-full items-center justify-center rounded-md py-1.5 text-xs text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
          >
            {sidebarCollapsed ? "→" : "← Collapse"}
          </button>
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-zinc-200">
                  {user?.full_name || user?.email || "User"}
                </p>
                <p className="truncate text-[10px] text-zinc-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="ml-2 shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0c0c11]/80 px-6 backdrop-blur-xl">
          <div />
          <div className="flex items-center gap-3">
            <span className="badge badge-brand text-[10px]">Enterprise</span>
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/20" />
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
