import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Plus, Search, Copy, Check, Target, Trash2, Link2, MousePointerClick } from "lucide-react";

export default function LinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getLinks({ page: String(page), search });
      setLinks(res.items);
      setTotal(res.total);
    } catch {
      setLinks([
        { id: "1", short_code: "abc123", short_url: "https://go.tf/abc123", destination_url: "https://example.com/landing", title: "Summer Sale LP", click_count: 1245, is_active: true, utm_source: "google", utm_medium: "cpc", utm_campaign: "summer_sale", created_at: new Date().toISOString() },
        { id: "2", short_code: "xyz789", short_url: "https://go.tf/xyz789", destination_url: "https://example.com/webinar", title: "Q3 Webinar", click_count: 856, is_active: true, utm_source: "linkedin", utm_medium: "social", utm_campaign: "webinar_q3", created_at: new Date().toISOString() },
        { id: "3", short_code: "lmn456", short_url: "https://go.tf/lmn456", destination_url: "https://example.com/ebook", title: "Marketing Guide", click_count: 432, is_active: false, utm_source: "newsletter", utm_medium: "email", utm_campaign: "ebook_launch", created_at: new Date().toISOString() },
      ]);
      setTotal(3);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search]);

  const toggleLink = async (id: string, active: boolean) => {
    try {
      await api.toggleLink(id, active);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: active } : l)));
    } catch {}
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    try {
      await api.deleteLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  };

  const copyUrl = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h1 className="page-title">Links</h1>
          <p className="page-subtitle">{total} total links</p>
        </div>
        <Link to="/builder" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Link
        </Link>
      </div>

      {/* Search */}
      <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            id="links-search"
            type="text"
            className="input-field pl-11"
            placeholder="Search links, URLs, campaigns..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-2xl animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Link</th>
              <th>UTM</th>
              <th>Clicks</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
                </td>
              </tr>
            ) : links.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-dashed border-white/[0.08]">
                    <Link2 className="h-6 w-6 text-zinc-700" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">No links found</p>
                  <p className="mt-1 text-xs text-zinc-700">Create your first link to get started</p>
                </td>
              </tr>
            ) : (
              links.map((link, i) => (
                <tr key={link.id} className="group animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <td>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{link.title || link.short_code}</p>
                      <button
                        onClick={() => copyUrl(link.short_url, link.id)}
                        className="mt-0.5 flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {copiedId === link.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {link.short_url}
                      </button>
                      <p className="mt-0.5 max-w-[300px] truncate text-[11px] text-zinc-700">
                        {link.destination_url}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {link.utm_source && (
                        <span className="inline-flex items-center rounded-md bg-violet-500/8 px-2 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-500/10">
                          {link.utm_source}
                        </span>
                      )}
                      {link.utm_medium && (
                        <span className="inline-flex items-center rounded-md bg-cyan-500/8 px-2 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/10">
                          {link.utm_medium}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <MousePointerClick className="h-3.5 w-3.5 text-zinc-600" />
                      <span className="font-mono text-sm font-bold text-zinc-200">
                        {link.click_count?.toLocaleString() || 0}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleLink(link.id, !link.is_active)}
                      className={`badge cursor-pointer transition-all duration-200 ${
                        link.is_active ? "badge-success" : "badge-danger"
                      }`}
                    >
                      {link.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <span className="text-xs text-zinc-600">
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
                      <button
                        onClick={() => copyUrl(link.short_url, `copy-${link.id}`)}
                        className="rounded-lg p-2 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        to={`/links/${link.id}/targeting`}
                        className="rounded-lg p-2 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 transition-colors"
                        title="Targeting Rules"
                      >
                        <Target className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3 animate-fade-up">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs"
          >
            ← Prev
          </button>
          <span className="rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-500 font-medium">
            Page {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={links.length < 20}
            className="btn-secondary text-xs"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
