import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Plus, Link2, MousePointerClick, Calendar, X } from "lucide-react";

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

  // Calculate campaign timeline progress
  const getProgress = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const now = new Date().getTime();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (now < s) return 0;
    if (now > e) return 100;
    return Math.round(((now - s) / (e - s)) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Organize and track marketing campaigns</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Cancel" : "New Campaign"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass animate-scale-in rounded-2xl p-6 space-y-5 border-violet-500/10">
          <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Create Campaign</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name *</label>
              <input
                id="campaign-name"
                className="input-field"
                placeholder="Q3 Product Launch"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
              <input
                id="campaign-desc"
                className="input-field"
                placeholder="Multi-channel product launch campaign"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                className="input-field"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button id="create-campaign-btn" onClick={handleCreate} className="btn-primary" disabled={!form.name}>
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
          <div className="col-span-full py-16 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
          </div>
        ) : (
          campaigns.map((c, i) => {
            const progress = getProgress(c.start_date, c.end_date);
            return (
              <div
                key={c.id}
                className="glass glass-hover gradient-border cursor-pointer rounded-2xl p-5 transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>{c.name}</h3>
                  <span className={`badge ${statusColor(c.status)}`}>{c.status}</span>
                </div>

                {c.description && (
                  <p className="mb-4 text-xs text-zinc-600 line-clamp-2">{c.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.025] p-3 border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Link2 className="h-3 w-3 text-zinc-600" />
                      <p className="text-[10px] text-zinc-600 uppercase font-semibold tracking-wider">Links</p>
                    </div>
                    <p className="text-lg font-bold text-zinc-200">{c.link_count || 0}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3 border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MousePointerClick className="h-3 w-3 text-zinc-600" />
                      <p className="text-[10px] text-zinc-600 uppercase font-semibold tracking-wider">Clicks</p>
                    </div>
                    <p className="text-lg font-bold text-zinc-200">
                      {(c.total_clicks || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Timeline progress */}
                {progress !== null && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <Calendar className="h-3 w-3" />
                        {c.start_date}
                      </span>
                      <span className="text-[10px] text-zinc-600">{c.end_date}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-violet-500 to-cyan-400"
                        style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)' }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-zinc-700">{progress}% elapsed</p>
                  </div>
                )}

                {(!c.start_date && !c.end_date) && null}
                {(c.start_date || c.end_date) && progress === null && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-700">
                    <Calendar className="h-3 w-3" />
                    {c.start_date && <span>{c.start_date}</span>}
                    {c.start_date && c.end_date && <span>→</span>}
                    {c.end_date && <span>{c.end_date}</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
