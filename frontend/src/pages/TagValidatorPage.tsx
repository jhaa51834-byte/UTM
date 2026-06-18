import { useState } from "react";
import { api } from "../lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  analytics: "Analytics",
  tag_manager: "Tag Manager",
  advertising: "Advertising",
  data_layer: "Data Layer",
};

const LEVEL_STYLES: Record<string, string> = {
  error: "bg-red-500/8 border border-red-500/15 text-red-300",
  warning: "bg-amber-500/8 border border-amber-500/15 text-amber-300",
  info: "bg-blue-500/8 border border-blue-500/15 text-blue-300",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

export default function TagValidatorPage() {
  const [mode, setMode] = useState<"url" | "html">("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true); setError(""); setReport(null);
    try {
      const payload = mode === "url" ? { url } : { html, url };
      setReport(await api.validateTags(payload));
    } catch (e: any) {
      setError(e.message || "Validation failed.");
    }
    setLoading(false);
  }

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">Tag Validator</h1>
        <p className="page-subtitle">
          Check a destination for GA4, Universal Analytics, Google Tag Manager, Adobe, Tealium and Meta Pixel.
        </p>
      </div>

      {/* Input card */}
      <section className="glass rounded-2xl p-5">
        <div className="mb-3 flex gap-2">
          {(["url", "html"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`btn-secondary text-xs ${
                mode === m ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-violet-500/10 hover:translate-y-0" : ""
              }`}>
              {m === "url" ? "Fetch URL" : "Paste HTML"}
            </button>
          ))}
        </div>

        {mode === "url" ? (
          <input className="input-field" value={url} placeholder="https://company.com/landing?utm_source=google"
            onChange={(e) => setUrl(e.target.value)} />
        ) : (
          <>
            <input className="input-field mb-2" value={url}
              placeholder="Optional destination URL (for UTM check)"
              onChange={(e) => setUrl(e.target.value)} />
            <textarea className="input-field h-40 font-mono text-xs" value={html}
              placeholder="Paste page HTML here…" onChange={(e) => setHtml(e.target.value)} />
          </>
        )}

        <button onClick={run} disabled={loading} className="mt-3 btn-primary">
          {loading ? "Validating…" : "Validate tags"}
        </button>
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </section>

      {/* Report */}
      {report && (
        <section className="space-y-5">
          {/* Score */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className={`text-4xl font-black ${scoreColor(report.score)}`} style={{ fontFamily: 'var(--font-display)' }}>{report.score}</div>
            <div>
              <p className="text-sm font-semibold text-white">Tag coverage score</p>
              <p className="text-xs text-zinc-500">
                {report.fetched ? "Fetched live" : "From pasted HTML"}
                {report.utm_present ? " · UTMs present" : " · no UTMs"}
              </p>
            </div>
          </div>

          {/* Tags grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {report.tags.map((t: any) => (
              <div key={t.key}
                className={`rounded-xl border p-3 transition-all duration-200 hover:border-white/[0.1] ${t.found
                  ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-white/[0.015]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200">{t.label}</span>
                  <span className={`badge ${t.found ? "badge-success" : "badge-danger opacity-60"}`}>
                    {t.found ? "found" : "missing"}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                  {CATEGORY_LABELS[t.category] || t.category}
                </p>
                {t.ids?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.ids.map((id: string) => (
                      <code key={id} className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] text-violet-300">{id}</code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Data layers */}
          {report.data_layers?.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-xs font-semibold text-zinc-400">Data layers</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {report.data_layers.map((d: string) => (
                  <span key={d} className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[11px] text-cyan-300">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Recommendations</p>
              {report.recommendations.map((r: any, i: number) => (
                <div key={i} className={`rounded-xl border px-3 py-2 text-sm ${LEVEL_STYLES[r.level] || LEVEL_STYLES.info}`}>
                  {r.message}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
