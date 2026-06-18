import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Globe, Key, Users, Shield, Plus, CheckCircle, AlertTriangle, UserPlus, Crown, Eye, BarChart3, Briefcase } from "lucide-react";

export default function SettingsPage() {
  const [tab, setTab] = useState<"domains" | "keys" | "team" | "governance">("domains");
  const [domains, setDomains] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  useEffect(() => {
    api.getDomains().then(setDomains).catch(() => {});
    api.getApiKeys().then(setApiKeys).catch(() => {});
    api.getGovernanceRules().then(setRules).catch(() => {});
  }, []);

  const addDomain = async () => {
    if (!newDomain) return;
    try {
      const d = await api.addDomain({ domain: newDomain });
      setDomains((p) => [...p, d]);
      setNewDomain("");
    } catch {}
  };

  const verifyDomain = async (id: string) => {
    try {
      const res = await api.verifyDomain(id);
      if (res.is_verified) {
        setDomains((p) => p.map((d) => (d.id === id ? { ...d, is_verified: true } : d)));
      }
    } catch {}
  };

  const createKey = async () => {
    if (!newKeyName) return;
    try {
      const res = await api.createApiKey(newKeyName, "read,write");
      setCreatedKey(res.key);
      setApiKeys((p) => [...p, res]);
      setNewKeyName("");
    } catch {}
  };

  const revokeKey = async (id: string) => {
    try {
      await api.revokeApiKey(id);
      setApiKeys((p) => p.filter((k) => k.id !== id));
    } catch {}
  };

  const TABS = [
    { id: "domains" as const, label: "Custom Domains", icon: Globe },
    { id: "keys" as const, label: "API Keys", icon: Key },
    { id: "team" as const, label: "Team", icon: Users },
    { id: "governance" as const, label: "Governance Rules", icon: Shield },
  ];

  const ROLES = [
    { role: "Super Admin", desc: "Full platform control", icon: Crown, color: "text-red-400", bg: "bg-red-500/8" },
    { role: "Org Admin", desc: "Organization management, billing, team", icon: Briefcase, color: "text-amber-400", bg: "bg-amber-500/8" },
    { role: "Marketing Manager", desc: "Create/edit links, campaigns, templates", icon: Users, color: "text-violet-400", bg: "bg-violet-500/8" },
    { role: "Analyst", desc: "View analytics dashboards", icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/8" },
    { role: "Viewer", desc: "Read-only access to links", icon: Eye, color: "text-zinc-400", bg: "bg-zinc-500/8" },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage domains, API keys, team, and governance</p>
      </div>

      {/* Tabs */}
      <div className="animate-fade-up flex gap-1 rounded-xl bg-white/[0.025] p-1 border border-white/[0.04]" style={{ animationDelay: '0.1s' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ${
              tab === t.id
                ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5 text-white shadow-sm border border-violet-500/15"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <t.icon className={`h-3.5 w-3.5 ${tab === t.id ? "text-violet-400" : ""}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Domains */}
      {tab === "domains" && (
        <div className="space-y-4 animate-fade-up">
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
                <Globe className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Add Custom Domain</h3>
                <p className="text-[11px] text-zinc-600">Point your branded domain to TrackFlow</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                id="new-domain"
                className="input-field max-w-sm"
                placeholder="go.yourbrand.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <button onClick={addDomain} className="btn-primary">
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {domains.length > 0 && (
            <div className="glass overflow-hidden rounded-2xl">
              <table className="data-table">
                <thead>
                  <tr><th>Domain</th><th>Status</th><th>SSL</th><th>Health</th><th></th></tr>
                </thead>
                <tbody>
                  {domains.map((d) => (
                    <tr key={d.id}>
                      <td className="font-mono text-sm text-zinc-200">{d.domain}</td>
                      <td>
                        <span className={`badge ${d.is_verified ? "badge-success" : "badge-warning"}`}>
                          {d.is_verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td><span className={`badge ${d.ssl_status === "active" ? "badge-success" : "badge-warning"}`}>{d.ssl_status}</span></td>
                      <td><span className="text-xs text-zinc-500">{d.health_status}</span></td>
                      <td>
                        {!d.is_verified && (
                          <button onClick={() => verifyDomain(d.id)} className="btn-secondary text-xs">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Verify DNS
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* API Keys */}
      {tab === "keys" && (
        <div className="space-y-4 animate-fade-up">
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                <Key className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Create API Key</h3>
                <p className="text-[11px] text-zinc-600">Generate keys for programmatic access</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input id="api-key-name" className="input-field max-w-sm" placeholder="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
              <button onClick={createKey} className="btn-primary">
                <Key className="h-4 w-4" />
                Generate
              </button>
            </div>
            {createdKey && (
              <div className="mt-4 rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-4 animate-scale-in">
                <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Copy this key — it won't be shown again
                </p>
                <code className="block text-xs font-mono text-emerald-200 break-all bg-emerald-500/5 rounded-lg p-3">{createdKey}</code>
              </div>
            )}
          </div>
          {apiKeys.length > 0 && (
            <div className="glass overflow-hidden rounded-2xl">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last Used</th><th></th></tr></thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id}>
                      <td className="text-sm font-medium text-zinc-200">{k.name}</td>
                      <td className="font-mono text-xs text-zinc-500">{k.key_prefix}...</td>
                      <td><div className="flex gap-1">{(k.scopes || []).map((s: string) => <span key={s} className="badge badge-brand text-[10px]">{s}</span>)}</div></td>
                      <td className="text-xs text-zinc-600">{k.last_used_at || "Never"}</td>
                      <td><button onClick={() => revokeKey(k.id)} className="btn-danger text-xs">Revoke</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Team */}
      {tab === "team" && (
        <div className="space-y-4 animate-fade-up">
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                <UserPlus className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Invite Team Member</h3>
                <p className="text-[11px] text-zinc-600">Collaborate with your marketing team</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input id="invite-email" className="input-field max-w-xs" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <select className="input-field w-auto" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="analyst">Analyst</option>
                <option value="marketing_manager">Manager</option>
                <option value="org_admin">Admin</option>
              </select>
              <button className="btn-primary">
                <UserPlus className="h-4 w-4" />
                Invite
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10">
                <Shield className="h-4 w-4 text-pink-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Role Hierarchy</h3>
                <p className="text-[11px] text-zinc-600">Permission levels in your organization</p>
              </div>
            </div>
            <div className="space-y-2">
              {ROLES.map((r, i) => (
                <div key={r.role} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 border border-white/[0.03] transition-colors hover:bg-white/[0.04] animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${r.bg}`}>
                      <r.icon className={`h-4 w-4 ${r.color}`} />
                    </div>
                    <span className={`text-xs font-semibold ${r.color}`}>{r.role}</span>
                  </div>
                  <span className="text-xs text-zinc-600">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Governance */}
      {tab === "governance" && (
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>UTM Governance Rules</h3>
              <p className="text-[11px] text-zinc-600">Define rules to enforce consistent UTM parameter usage</p>
            </div>
          </div>
          {rules.length === 0 ? (
            <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.06] p-12 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-zinc-800" />
              <p className="text-sm font-medium text-zinc-600">No governance rules configured</p>
              <p className="mt-1 text-xs text-zinc-700">Set up rules to enforce naming conventions across your org</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 border border-white/[0.03] transition-colors hover:bg-white/[0.04] animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div>
                    <p className="text-xs font-medium text-zinc-200">{r.name}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      When {r.match_field} = "{r.match_value}" → {r.required_field} must be: {r.allowed_values}
                    </p>
                  </div>
                  <span className={`badge ${r.severity === "error" ? "badge-danger" : "badge-warning"}`}>{r.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
