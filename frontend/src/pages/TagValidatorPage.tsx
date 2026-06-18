import { useState } from "react";
import { api } from "../lib/api";

const inputCls =
  "w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm " +
  "text-white placeholder:text-zinc-600 focus:border-fuchsia-400/60 focus:outline-none " +
  "focus:ring-4 focus:ring-fuchsia-500/15";

const CATEGORY_LABELS: Record<string, string> = {
  analytics: "Analytics",
  tag_manager: "Tag Manager",
  advertising: "Advertising",
  data_layer: "Data Layer",
};

const LEVEL_STYLES: Record<string, string> = {
  error: "border-rose-400/40 bg-rose-500/10 text-rose-300",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  info: "border-sky-400/40 bg-sky-500/10 text-sky-300",
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
        <h1 className="text-2xl font-bold text-white">Tag Validator</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Check a destination for GA4, Universal Analytics, Google Tag Manager, Adobe, Tealium and Meta Pixel.
        </p>
      </div>

      {/* Input card */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="mb-3 flex gap-2">
          {(["url", "html"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                mode === m ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                : "border border-white/10 text-zinc-400 hover:text-white"}`}>
              {m === "url" ? "Fetch URL" : "Paste HTML"}
            </button>
          ))}
        </div>

        {mode === "url" ? (
          <input className={inputCls} value={url} placeholder="https://company.com/landing?utm_source=google"
            onChange={(e) => setUrl(e.target.value)} />
        ) : (
          <>
            <input className={`${inputCls} mb-2`} value={url}
              placeholder="Optional destination URL (for UTM check)"
              onChange={(e) => setUrl(e.target.value)} />
            <textarea className={`${inputCls} h-40 font-mono text-xs`} value={html}
              placeholder="Paste page HTML here…" onChange={(e) => setHtml(e.target.value)} />
          </>
        )}

        <button onClick={run} disabled={loading}
          className="mt-3 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {loading ? "Validating…" : "Validate tags"}
        </button>
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </section>

      {/* Report */}
      {report && (
        <section className="space-y-5">
          {/* Score */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className={`text-4xl font-black ${scoreColor(report.score)}`}>{report.score}</div>
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
                className={`rounded-xl border p-3 ${t.found
                  ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200">{t.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    t.found ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-500/20 text-zinc-500"}`}>
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
                <div key={i} className={`rounded-lg border px-3 py-2 text-sm ${LEVEL_STYLES[r.level] || LEVEL_STYLES.info}`}>
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
