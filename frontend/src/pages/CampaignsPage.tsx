import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", start_date: "", end_date: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaigns().then((res) => {
      setCampaigns(res.items || []);
    }).catch(() => {
      setCampaigns([
        { id: "1", name: "Summer Sale 2026", slug: "summer_sale_2026", status: "active", link_count: 12, total_clicks: 3421, start_date: "2026-06-01", end_date: "2026-08-31", created_at: new Date().toISOString() },
        { id: "2", name: "Q3 Webinar Launch", slug: "webinar_q3", status: "active", link_count: 8, total_clicks: 1902, start_date: "2026-07-01", end_date: "2026-09-30", created_at: new Date().toISOString() },
        { id: "3", name: "Newsletter Weekly", slug: "newsletter_weekly", status: "paused", link_count: 24, total_clicks: 1456, created_at: new Date().toISOString() },
        { id: "4", name: "LinkedIn Brand Awareness", slug: "linkedin_brand", status: "archived", link_count: 5, total_clicks: 823, created_at: new Date().toISOString() },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    try {
      const res = await api.createCampaign(form);
      setCampaigns((prev) => [res, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", start_date: "", end_date: "" });
    } catch {}
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "badge-success";
      case "paused": return "badge-warning";
      case "archived": return "badge-danger";
      default: return "badge-brand";
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-sm text-zinc-500">Organize and track marketing campaigns</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          + New Campaign
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass animate-fade-up rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">Create Campaign</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Name *</label>
              <input
                className="input-field"
                placeholder="Q3 Product Launch"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Description</label>
              <input
                className="input-field"
                placeholder="Multi-channel product launch campaign"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">End Date</label>
              <input
                type="date"
                className="input-field"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary" disabled={!form.name}>
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Campaign Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="col-span-full py-12 text-center text-zinc-500">Loading...</p>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="glass glass-hover cursor-pointer rounded-xl p-5 transition-all duration-200">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-200">{c.name}</h3>
                <span className={`badge ${statusColor(c.status)}`}>{c.status}</span>
              </div>

              {c.description && (
                <p className="mb-4 text-xs text-zinc-500 line-clamp-2">{c.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-xs text-zinc-500">Links</p>
                  <p className="text-lg font-bold text-zinc-200">{c.link_count || 0}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-xs text-zinc-500">Clicks</p>
                  <p className="text-lg font-bold text-zinc-200">
                    {(c.total_clicks || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {(c.start_date || c.end_date) && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-600">
                  {c.start_date && <span>{c.start_date}</span>}
                  {c.start_date && c.end_date && <span>→</span>}
                  {c.end_date && <span>{c.end_date}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
