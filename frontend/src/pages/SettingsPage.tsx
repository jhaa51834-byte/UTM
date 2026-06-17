import { useState, useEffect } from "react";
import { api } from "../lib/api";

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
    { id: "domains", label: "Custom Domains" },
    { id: "keys", label: "API Keys" },
    { id: "team", label: "Team" },
    { id: "governance", label: "Governance Rules" },
  ] as const;

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500">Manage domains, API keys, team, and governance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${
              tab === t.id ? "bg-violet-500/20 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Domains */}
      {tab === "domains" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Add Custom Domain</h3>
            <div className="flex gap-2">
              <input
                className="input-field max-w-sm"
                placeholder="go.yourbrand.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <button onClick={addDomain} className="btn-primary">Add</button>
            </div>
          </div>

          {domains.length > 0 && (
            <div className="glass overflow-hidden rounded-xl">
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
                      <td><span className="text-xs text-zinc-400">{d.health_status}</span></td>
                      <td>
                        {!d.is_verified && (
                          <button onClick={() => verifyDomain(d.id)} className="btn-secondary text-xs">Verify DNS</button>
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
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Create API Key</h3>
            <div className="flex gap-2">
              <input className="input-field max-w-sm" placeholder="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
              <button onClick={createKey} className="btn-primary">Generate</button>
            </div>
            {createdKey && (
              <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <p className="mb-1 text-xs text-emerald-300">⚠️ Copy this key — it won't be shown again:</p>
                <code className="text-xs font-mono text-emerald-200 break-all">{createdKey}</code>
              </div>
            )}
          </div>
          {apiKeys.length > 0 && (
            <div className="glass overflow-hidden rounded-xl">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last Used</th><th></th></tr></thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id}>
                      <td className="text-sm text-zinc-200">{k.name}</td>
                      <td className="font-mono text-xs text-zinc-400">{k.key_prefix}...</td>
                      <td><div className="flex gap-1">{(k.scopes || []).map((s: string) => <span key={s} className="badge badge-brand text-[10px]">{s}</span>)}</div></td>
                      <td className="text-xs text-zinc-500">{k.last_used_at || "Never"}</td>
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
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Invite Team Member</h3>
            <div className="flex gap-2">
              <input className="input-field max-w-xs" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <select className="input-field w-auto" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="analyst">Analyst</option>
                <option value="marketing_manager">Manager</option>
                <option value="org_admin">Admin</option>
              </select>
              <button className="btn-primary">Invite</button>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Role Hierarchy</h3>
            <div className="space-y-2">
              {[
                { role: "Super Admin", desc: "Full platform control", color: "text-red-400" },
                { role: "Org Admin", desc: "Organization management, billing, team", color: "text-amber-400" },
                { role: "Marketing Manager", desc: "Create/edit links, campaigns, templates", color: "text-violet-400" },
                { role: "Analyst", desc: "View analytics dashboards", color: "text-cyan-400" },
                { role: "Viewer", desc: "Read-only access to links", color: "text-zinc-400" },
              ].map((r) => (
                <div key={r.role} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5">
                  <span className={`text-xs font-semibold ${r.color}`}>{r.role}</span>
                  <span className="text-xs text-zinc-500">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Governance */}
      {tab === "governance" && (
        <div className="glass rounded-xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">UTM Governance Rules</h3>
          <p className="mb-4 text-xs text-zinc-500">
            Define rules to enforce consistent UTM parameter usage across your organization.
          </p>
          {rules.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-600">No governance rules configured.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-200">{r.name}</p>
                    <p className="text-[10px] text-zinc-500">
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
