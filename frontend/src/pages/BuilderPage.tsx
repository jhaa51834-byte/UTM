import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Sparkles, Globe, Hash, Target, FileText, Tag, Link2, Copy, Check, QrCode, Wand2, Layers, BookOpen } from "lucide-react";

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

  // Count filled fields for progress
  const filledCount = [form.base_url, form.utm_source, form.utm_medium, form.utm_campaign].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="page-title">UTM Builder</h1>
        <p className="page-subtitle">
          Generate tracked URLs with governance validation & AI suggestions
        </p>
      </div>

      {/* Progress indicator */}
      <div className="animate-fade-up flex items-center gap-3" style={{ animationDelay: '0.1s' }}>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                step <= filledCount
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-sm shadow-violet-500/30'
                  : 'bg-white/[0.06]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-zinc-600">{filledCount}/4 required fields</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* AI Assistant */}
          <div className="glass rounded-2xl p-5 animate-fade-up animate-border-glow border-violet-500/10" style={{ animationDelay: '0.15s' }}>
            <h3 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-sm shadow-violet-500/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              AI Assistant
              <span className="badge badge-brand text-[9px] ml-1">BETA</span>
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Wand2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  id="ai-description"
                  type="text"
                  className="input-field pl-11"
                  placeholder="Describe your campaign: e.g., LinkedIn ad for summer sale targeting CMOs"
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiSuggest()}
                />
              </div>
              <button
                onClick={handleAiSuggest}
                disabled={aiLoading}
                className="btn-secondary whitespace-nowrap"
              >
                {aiLoading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggest
                  </>
                )}
              </button>
            </div>
          </div>

          {/* URL + UTM Fields */}
          <div className="glass rounded-2xl p-6 space-y-5 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {/* Destination URL */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <Globe className="h-3.5 w-3.5 text-violet-400" />
                Destination URL <span className="text-red-400">*</span>
              </label>
              <input
                id="base-url"
                type="url"
                className="input-field"
                placeholder="https://example.com/landing-page"
                value={form.base_url}
                onChange={set("base_url")}
              />
            </div>

            {/* UTM section label */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">UTM Parameters</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Hash className="h-3.5 w-3.5 text-cyan-400" />
                  Source <span className="text-red-400">*</span>
                </label>
                <input
                  id="utm-source"
                  className="input-field"
                  placeholder="google, facebook, linkedin"
                  value={form.utm_source}
                  onChange={set("utm_source")}
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Target className="h-3.5 w-3.5 text-pink-400" />
                  Medium <span className="text-red-400">*</span>
                </label>
                <input
                  id="utm-medium"
                  className="input-field"
                  placeholder="cpc, email, social"
                  value={form.utm_medium}
                  onChange={set("utm_medium")}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                Campaign <span className="text-red-400">*</span>
              </label>
              <input
                id="utm-campaign"
                className="input-field"
                placeholder="summer_sale_2026"
                value={form.utm_campaign}
                onChange={set("utm_campaign")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  Content
                </label>
                <input
                  id="utm-content"
                  className="input-field"
                  placeholder="header_banner"
                  value={form.utm_content}
                  onChange={set("utm_content")}
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Tag className="h-3.5 w-3.5 text-indigo-400" />
                  Term
                </label>
                <input
                  id="utm-term"
                  className="input-field"
                  placeholder="marketing automation"
                  value={form.utm_term}
                  onChange={set("utm_term")}
                />
              </div>
            </div>

            {/* Short link options */}
            <div className="border-t border-white/[0.05] pt-5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-zinc-400">
                  <input
                    type="checkbox"
                    checked={form.create_short_link}
                    onChange={(e) => setForm((p) => ({ ...p, create_short_link: e.target.checked }))}
                  />
                  <Link2 className="h-3.5 w-3.5 text-violet-400" />
                  Create Short Link
                </label>
              </div>
              {form.create_short_link && (
                <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-up">
                  <div>
                    <label className="mb-1.5 block text-[11px] text-zinc-600">Custom Alias</label>
                    <input
                      id="custom-alias"
                      className="input-field"
                      placeholder="my-link (optional)"
                      value={form.custom_alias}
                      onChange={set("custom_alias")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] text-zinc-600">Title</label>
                    <input
                      id="link-title"
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
            id="generate-btn"
            onClick={handleGenerate}
            disabled={loading || !form.base_url}
            className="btn-primary w-full py-3.5 text-[15px] rounded-xl animate-fade-up"
            style={{ animationDelay: '0.25s' }}
          >
            {loading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Link2 className="h-4.5 w-4.5" />
                Generate URL
              </>
            )}
          </button>

          {/* Validation Issues */}
          {issues.length > 0 && (
            <div className="space-y-2 animate-fade-up">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                    issue.level === "error"
                      ? "bg-red-500/8 border border-red-500/15 text-red-300"
                      : issue.level === "warning"
                      ? "bg-amber-500/8 border border-amber-500/15 text-amber-300"
                      : "bg-blue-500/8 border border-blue-500/15 text-blue-300"
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    issue.level === "error" ? "bg-red-400" : issue.level === "warning" ? "bg-amber-400" : "bg-blue-400"
                  }`} />
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {result && !result.blocked && (
            <div className="glass rounded-2xl p-6 space-y-4 animate-scale-in border-emerald-500/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>Generated Successfully</h3>
              </div>

              {result.final_url && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Full URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={result.final_url} className="input-field flex-1 text-xs font-mono" />
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => copy(result.final_url, "full")}
                    >
                      {copied === "full" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === "full" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {result.short_url && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Short URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={result.short_url} className="input-field flex-1 text-xs font-mono" />
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => copy(result.short_url, "short")}
                    >
                      {copied === "short" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === "short" ? "Copied" : "Copy"}
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
                    <QrCode className="h-3.5 w-3.5" />
                    QR Code
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-5">
          {/* Templates */}
          <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>
              <Layers className="h-4 w-4 text-violet-400" />
              Templates
            </h3>
            {templates.length === 0 ? (
              <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.06] p-6 text-center">
                <Layers className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
                <p className="text-xs text-zinc-600">
                  No templates yet. Generate a URL and save it as a template.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((t: any) => (
                  <button
                    key={t.id || t.name}
                    onClick={() => applyTemplate(t)}
                    className="w-full rounded-xl bg-white/[0.02] p-3 text-left transition-all duration-200 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08]"
                  >
                    <p className="text-xs font-medium text-zinc-200">{t.name}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {t.utm_source}/{t.utm_medium}/{t.utm_campaign}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Reference */}
          <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '0.35s' }}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>
              <BookOpen className="h-4 w-4 text-cyan-400" />
              Quick Reference
            </h3>
            <div className="space-y-3.5 text-xs">
              {[
                { param: "utm_source", desc: "Traffic origin: google, facebook, newsletter", color: "text-violet-400" },
                { param: "utm_medium", desc: "Marketing medium: cpc, email, social, organic", color: "text-cyan-400" },
                { param: "utm_campaign", desc: "Campaign identifier: spring_sale, product_launch", color: "text-pink-400" },
                { param: "utm_content", desc: "Differentiator: header_cta, sidebar_banner", color: "text-amber-400" },
                { param: "utm_term", desc: "Paid keywords: marketing automation tools", color: "text-emerald-400" },
              ].map((r) => (
                <div key={r.param} className="rounded-lg bg-white/[0.02] px-3 py-2.5 border border-white/[0.03]">
                  <span className={`font-mono font-semibold ${r.color}`}>{r.param}</span>
                  <p className="mt-0.5 text-zinc-600">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Compatible With */}
          <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>
              <Sparkles className="h-4 w-4 text-amber-400" />
              Compatible With
            </h3>
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
