import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function LinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getLinks({ page: String(page), search });
      setLinks(res.items);
      setTotal(res.total);
    } catch {
      // Demo data
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

  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Links</h1>
          <p className="text-sm text-zinc-500">{total} total links</p>
        </div>
        <a href="/builder" className="btn-primary">+ New Link</a>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder="Search links, URLs, campaigns..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-xl">
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
                <td colSpan={6} className="py-12 text-center text-zinc-500">Loading...</td>
              </tr>
            ) : links.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">No links found</td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} className="group">
                  <td>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{link.title || link.short_code}</p>
                      <button
                        onClick={() => copy(link.short_url)}
                        className="mt-0.5 text-xs font-mono text-violet-400 hover:text-violet-300"
                      >
                        {link.short_url}
                      </button>
                      <p className="mt-0.5 max-w-[300px] truncate text-[11px] text-zinc-600">
                        {link.destination_url}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {link.utm_source && (
                        <span className="inline-block rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300">
                          {link.utm_source}
                        </span>
                      )}
                      {link.utm_medium && (
                        <span className="inline-block rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300">
                          {link.utm_medium}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-sm font-semibold text-zinc-200">
                      {link.click_count?.toLocaleString() || 0}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleLink(link.id, !link.is_active)}
                      className={`badge text-[10px] cursor-pointer ${
                        link.is_active ? "badge-success" : "badge-danger"
                      }`}
                    >
                      {link.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <span className="text-xs text-zinc-500">
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => copy(link.short_url)}
                        className="rounded px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="rounded px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10"
                      >
                        Delete
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
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs"
          >
            ← Prev
          </button>
          <span className="text-xs text-zinc-500">Page {page}</span>
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
