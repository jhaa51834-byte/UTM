import { useEffect, useState } from "react";
import { api } from "../api";
import { Card, CopyButton, inputClass } from "../components/ui";
import { MEDIUMS, SOURCES } from "../constants";
import type { HistoryItem } from "../types";

export default function HistoryTab() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      api.history({ q, source, medium })
        .then(setItems)
        .catch((e) => setError(e.message));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, source, medium]);

  return (
    <Card title="History" subtitle="Every generated URL, searchable and filterable">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Search URL or campaign…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={`${inputClass} max-w-[160px]`} value={source}
          onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {SOURCES.filter((s) => s !== "custom").map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={`${inputClass} max-w-[160px]`} value={medium}
          onChange={(e) => setMedium(e.target.value)}>
          <option value="">All mediums</option>
          {MEDIUMS.filter((m) => m !== "custom").map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {items.length === 0 && !error && (
        <p className="text-sm text-slate-500">No URLs generated yet.</p>
      )}

      <ul className="divide-y divide-white/5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/5">
            <div className="min-w-0">
              <code className="break-all font-mono text-xs text-cyan-300">{item.final_url}</code>
              {item.short_url && (
                <code className="ml-2 font-mono text-xs text-emerald-300">({item.short_url})</code>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                {item.utm_source} / {item.utm_medium}
                {item.utm_campaign && <> · {item.utm_campaign}</>}
                {" · "}{item.created_by}
                {" · "}{new Date(item.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <CopyButton text={item.final_url} small />
              <button
                type="button"
                onClick={() => api.deleteHistory(item.id).then(() =>
                  setItems(items.filter((i) => i.id !== item.id)))}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
