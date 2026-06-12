import { useState } from "react";
import { getIdentity, setIdentity } from "./api";
import BuilderTab from "./tabs/BuilderTab";
import BulkTab from "./tabs/BulkTab";
import GovernanceTab from "./tabs/GovernanceTab";
import HistoryTab from "./tabs/HistoryTab";
import TemplatesTab from "./tabs/TemplatesTab";
import type { Template } from "./types";

const TABS = [
  { name: "Builder", icon: "🔗", active: "from-violet-500 to-fuchsia-500 shadow-fuchsia-500/40" },
  { name: "Bulk CSV", icon: "📦", active: "from-amber-500 to-orange-500 shadow-orange-500/40" },
  { name: "Templates", icon: "🎨", active: "from-pink-500 to-rose-500 shadow-rose-500/40" },
  { name: "History", icon: "🕘", active: "from-cyan-500 to-sky-500 shadow-sky-500/40" },
  { name: "Governance", icon: "🛡️", active: "from-emerald-500 to-teal-500 shadow-teal-500/40" },
] as const;
type Tab = (typeof TABS)[number]["name"];

export default function App() {
  const [tab, setTab] = useState<Tab>("Builder");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [templatesRefresh, setTemplatesRefresh] = useState(0);
  const [identity, setIdentityState] = useState(getIdentity());

  const updateIdentity = (user: string, role: string) => {
    setIdentity(user, role);
    setIdentityState({ user, role });
  };

  return (
    <div className="min-h-screen">
      <div className="shimmer-bar h-1 w-full" />
      <header className="border-b border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="animate-float flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-xl font-black text-white shadow-[0_0_24px_rgba(217,70,239,0.5)]">
              U
            </span>
            <div>
              <h1 className="gradient-text text-xl font-black tracking-tight">UTM Builder</h1>
              <p className="text-[11px] font-medium text-slate-400">
                Campaign URL governance for marketing teams
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              className="w-28 rounded-lg border border-white/15 bg-white/[0.07] px-2 py-1.5 text-white focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              value={identity.user}
              onChange={(e) => updateIdentity(e.target.value, identity.role)}
              title="Username (demo identity — replace with SSO in production)"
            />
            <select
              className="rounded-lg border border-white/15 bg-white/[0.07] px-2 py-1.5 text-white focus:border-fuchsia-400 focus:outline-none"
              value={identity.role}
              onChange={(e) => updateIdentity(identity.user, e.target.value)}
              title="Role"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
              identity.role === "admin"
                ? "bg-gradient-to-r from-violet-500/30 to-pink-500/30 text-fuchsia-200 ring-1 ring-fuchsia-400/40 shadow-[0_0_12px_rgba(217,70,239,0.3)]"
                : "bg-white/10 text-slate-400 ring-1 ring-white/15"
            }`}>
              {identity.role}
            </span>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-1.5 px-4 pb-3">
          {TABS.map(({ name, icon, active }) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
                tab === name
                  ? `scale-105 bg-gradient-to-r text-white shadow-lg ${active}`
                  : "text-slate-400 hover:scale-105 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {name}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Builder stays mounted so applied templates and results persist across tabs */}
        <div className={tab === "Builder" ? "" : "hidden"}>
          <BuilderTab
            applyTemplate={activeTemplate}
            onTemplateSaved={() => setTemplatesRefresh((n) => n + 1)}
          />
        </div>
        {tab === "Bulk CSV" && <div key="bulk" className="animate-fade-up"><BulkTab /></div>}
        {tab === "Templates" && (
          <div key="templates" className="animate-fade-up">
            <TemplatesTab
              refreshKey={templatesRefresh}
              onUse={(t) => { setActiveTemplate(t); setTab("Builder"); }}
            />
          </div>
        )}
        {tab === "History" && <div key="history" className="animate-fade-up"><HistoryTab /></div>}
        {tab === "Governance" && <div key="governance" className="animate-fade-up"><GovernanceTab /></div>}
      </main>

      <footer className="pb-6 text-center text-[11px] font-medium text-slate-500">
        Built for GA4 · Adobe Analytics · Tealium · GTM
      </footer>
    </div>
  );
}
