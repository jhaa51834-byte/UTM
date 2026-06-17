import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function BuilderPage() {
  const [form, setForm] = useState({
    base_url: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    create_short_link: true,
    custom_alias: "",
    title: "",
  });
  const [result, setResult] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setIssues([]);
    try {
      const res = await api.generateUtm(form);
      setResult(res);
      setIssues(res.issues || []);
    } catch (err: any) {
      setIssues([{ level: "error", message: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.aiSuggest(aiDescription);
      setForm((p) => ({
        ...p,
        utm_source: res.utm_source || p.utm_source,
        utm_medium: res.utm_medium || p.utm_medium,
        utm_campaign: res.utm_campaign || p.utm_campaign,
        utm_content: res.utm_content || p.utm_content,
        utm_term: res.utm_term || p.utm_term,
      }));
    } catch {
    } finally {
      setAiLoading(false);
    }
  };

  const applyTemplate = (t: any) => {
    setForm((p) => ({
      ...p,
      utm_source: t.utm_source || "",
      utm_medium: t.utm_medium || "",
      utm_campaign: t.utm_campaign || "",
      utm_content: t.utm_content || "",
      utm_term: t.utm_term || "",
    }));
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">UTM Builder</h1>
        <p className="text-sm text-zinc-500">
          Generate tracked URLs with governance validation & AI suggestions
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Assistant */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px]">
                AI
              </span>
              AI Assistant
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Describe your campaign: e.g., LinkedIn ad for summer sale targeting CMOs"
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiSuggest()}
              />
              <button
                onClick={handleAiSuggest}
                disabled={aiLoading}
                className="btn-secondary whitespace-nowrap"
              >
                {aiLoading ? "Thinking..." : "Suggest"}
              </button>
            </div>
          </div>

          {/* URL + UTM Fields */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Destination URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                className="input-field"
                placeholder="https://example.com/landing-page"
                value={form.base_url}
                onChange={set("base_url")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Source *</label>
                <input
                  className="input-field"
                  placeholder="google, facebook, linkedin"
                  value={form.utm_source}
                  onChange={set("utm_source")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Medium *</label>
                <input
                  className="input-field"
                  placeholder="cpc, email, social"
                  value={form.utm_medium}
                  onChange={set("utm_medium")}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Campaign *</label>
              <input
                className="input-field"
                placeholder="summer_sale_2026"
                value={form.utm_campaign}
                onChange={set("utm_campaign")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Content</label>
                <input
                  className="input-field"
                  placeholder="header_banner"
                  value={form.utm_content}
                  onChange={set("utm_content")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Term</label>
                <input
                  className="input-field"
                  placeholder="marketing automation"
                  value={form.utm_term}
                  onChange={set("utm_term")}
                />
              </div>
            </div>

            {/* Short link options */}
            <div className="border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <input
                    type="checkbox"
                    checked={form.create_short_link}
                    onChange={(e) => setForm((p) => ({ ...p, create_short_link: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/5"
                  />
                  Create Short Link
                </label>
              </div>
              {form.create_short_link && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-500">Custom Alias</label>
                    <input
                      className="input-field"
                      placeholder="my-link (optional)"
                      value={form.custom_alias}
                      onChange={set("custom_alias")}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-500">Title</label>
                    <input
                      className="input-field"
                      placeholder="Summer Sale Banner"
                      value={form.title}
                      onChange={set("title")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !form.base_url}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {loading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "🔗 Generate URL"
            )}
          </button>

          {/* Validation Issues */}
          {issues.length > 0 && (
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-4 py-2.5 text-sm ${
                    issue.level === "error"
                      ? "bg-red-500/10 border border-red-500/20 text-red-300"
                      : issue.level === "warning"
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                      : "bg-blue-500/10 border border-blue-500/20 text-blue-300"
                  }`}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {result && !result.blocked && (
            <div className="glass rounded-xl p-5 space-y-4 animate-fade-up">
              <h3 className="text-sm font-semibold text-emerald-400">✓ Generated Successfully</h3>

              {result.final_url && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Full URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={result.final_url} className="input-field flex-1 text-xs" />
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => copy(result.final_url, "full")}
                    >
                      {copied === "full" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {result.short_url && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Short URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={result.short_url} className="input-field flex-1 text-xs font-mono" />
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => copy(result.short_url, "short")}
                    >
                      {copied === "short" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {result.short_url && (
                <div className="flex gap-2">
                  <a
                    href={api.qrGenerateUrl(result.short_url)}
                    target="_blank"
                    className="btn-secondary text-xs"
                  >
                    📱 QR Code
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Templates */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Templates</h3>
            {templates.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No templates yet. Generate a URL and save it as a template.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((t: any) => (
                  <button
                    key={t.id || t.name}
                    onClick={() => applyTemplate(t)}
                    className="w-full rounded-lg bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <p className="text-xs font-medium text-zinc-200">{t.name}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      {t.utm_source}/{t.utm_medium}/{t.utm_campaign}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Reference */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-300">Quick Reference</h3>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="font-medium text-violet-400">utm_source</span>
                <p className="text-zinc-500">Traffic origin: google, facebook, newsletter</p>
              </div>
              <div>
                <span className="font-medium text-cyan-400">utm_medium</span>
                <p className="text-zinc-500">Marketing medium: cpc, email, social, organic</p>
              </div>
              <div>
                <span className="font-medium text-pink-400">utm_campaign</span>
                <p className="text-zinc-500">Campaign identifier: spring_sale, product_launch</p>
              </div>
              <div>
                <span className="font-medium text-amber-400">utm_content</span>
                <p className="text-zinc-500">Differentiator: header_cta, sidebar_banner</p>
              </div>
              <div>
                <span className="font-medium text-emerald-400">utm_term</span>
                <p className="text-zinc-500">Paid keywords: marketing automation tools</p>
              </div>
            </div>
          </div>

          {/* Compatible With */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-300">Compatible With</h3>
            <div className="flex flex-wrap gap-2">
              {["GA4", "Adobe Analytics", "Tealium", "GTM", "Segment", "Mixpanel"].map((t) => (
                <span key={t} className="badge badge-brand">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
