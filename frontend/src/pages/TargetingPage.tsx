import { useEffect, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../lib/api";
import DeepLinkCard from "../components/DeepLinkCard";

/* ── Constants ───────────────────────────────────────────── */
const FIELDS = [
  "country_code", "country", "region", "city",
  "device_type", "browser", "os", "language",
  "hour", "weekday", "date",
] as const;

const OPERATORS = [
  "equals", "not_equals", "in", "not_in", "contains", "gte", "lte", "between",
] as const;

const LIST_OPS = new Set(["in", "not_in", "between"]);

type Cond = { field: string; operator: string; value: string };

const VALUE_HINT: Record<string, string> = {
  in: "comma-separated, e.g. IN, US, GB",
  not_in: "comma-separated, e.g. bot",
  between: "two values, e.g. 9, 17",
  default: "e.g. mobile",
};

const FIELD_ICONS: Record<string, string> = {
  country_code: "🌍", country: "🌍", region: "📍", city: "🏙️",
  device_type: "📱", browser: "🌐", os: "💻", language: "🗣️",
  hour: "🕐", weekday: "📅", date: "📆",
};

const OP_LABELS: Record<string, string> = {
  equals: "=", not_equals: "≠", in: "∈", not_in: "∉",
  contains: "⊃", gte: "≥", lte: "≤", between: "↔",
};

/* ── Helpers ─────────────────────────────────────────────── */
function condToPayload(c: Cond) {
  if (LIST_OPS.has(c.operator)) {
    return {
      field: c.field,
      operator: c.operator,
      value: c.value.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }
  return { field: c.field, operator: c.operator, value: c.value.trim() };
}

const emptyVariant = (weight: number, control = false) => ({
  name: "", destination_url: "", weight, is_control: control,
});

/* ── SVG Icons ───────────────────────────────────────────── */
const Icons = {
  back: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  target: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  route: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" />
    </svg>
  ),
  flask: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M12 3v7.4a2 2 0 0 1-.47 1.29L4 21h16l-7.53-9.31A2 2 0 0 1 12 10.4V3" />
    </svg>
  ),
  plus: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  ),
  pause: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  play: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  trophy: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-0.85-3.25-2.03-3.79A1.07 1.07 0 0 1 14 17v-2.34" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  sparkles: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
    </svg>
  ),
  arrow: (
    <svg className="h-3.5 w-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  link: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
};

/* ── Reusable sub-components ─────────────────────────────── */
function SectionCard({ children, icon, title, subtitle, badge, delay = 0 }: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-2xl shadow-black/30 backdrop-blur-2xl transition-all duration-500 hover:border-white/[0.12] hover:shadow-violet-500/5"
      style={{ animation: `fade-up 0.5s ease-out ${delay}ms both` }}
    >
      {/* Gradient top-line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500/60 via-fuchsia-500/60 to-cyan-500/60 opacity-70 transition-opacity group-hover:opacity-100" />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 right-10 h-40 w-40 rounded-full bg-violet-500/[0.04] blur-3xl transition-all duration-700 group-hover:bg-violet-500/[0.08]" />

      <div className="relative p-6">
        {/* Header row */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-400 ring-1 ring-violet-500/20">
              {icon}
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-white">{title}</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{subtitle}</p>
            </div>
          </div>
          {badge}
        </div>

        {children}
      </div>
    </section>
  );
}

function ConditionPill({ field, operator, value }: { field: string; operator: string; value: any }) {
  const v = Array.isArray(value) ? value.join(", ") : value;
  const icon = FIELD_ICONS[field] || "🔧";
  const op = OP_LABELS[operator] || operator;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition-all hover:border-violet-500/30 hover:bg-violet-500/10">
      <span className="text-[10px]">{icon}</span>
      <span className="text-zinc-400">{field}</span>
      <span className="font-bold text-violet-400">{op}</span>
      <span className="text-white">{v}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
    running: { bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-emerald-500/30", dot: "bg-emerald-400" },
    paused: { bg: "bg-amber-500/15", text: "text-amber-300", ring: "ring-amber-500/30", dot: "bg-amber-400" },
    completed: { bg: "bg-violet-500/15", text: "text-violet-300", ring: "ring-violet-500/30", dot: "bg-violet-400" },
  };
  const s = cfg[status] || cfg.running;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === "running" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

function GlassInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`input-field ${className}`}
    />
  );
}

function GlassSelect({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`input-field ${className}`}
    >
      {children}
    </select>
  );
}

function GradientButton({ children, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger text-sm font-semibold",
    ghost: "btn-secondary bg-transparent hover:bg-white/[0.06] border-transparent hover:border-transparent text-zinc-400 hover:text-white hover:translate-y-0",
  };
  return (
    <button
      type="button"
      {...props}
      className={`${styles[variant]} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

function SmallButton({ children, variant = "ghost", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "danger" }) {
  const styles = {
    ghost: "btn-secondary text-xs px-2.5 py-1.5 bg-transparent border-transparent hover:bg-white/[0.06] hover:border-transparent hover:translate-y-0",
    danger: "btn-danger text-xs px-2.5 py-1.5",
  };
  return (
    <button
      type="button"
      {...props}
      className={`${styles[variant]} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
      {required && <span className="ml-0.5 text-fuchsia-400">*</span>}
    </label>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function TargetingPage() {
  const { id = "" } = useParams();
  const [link, setLink] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [abTest, setABTest] = useState<any>(null);
  const [abResults, setABResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // New-rule form
  const [ruleName, setRuleName] = useState("");
  const [rulePriority, setRulePriority] = useState(100);
  const [ruleDest, setRuleDest] = useState("");
  const [conditions, setConditions] = useState<Cond[]>([
    { field: "country_code", operator: "equals", value: "" },
  ]);
  const [showNewRule, setShowNewRule] = useState(false);

  // New A/B test form
  const [showABForm, setShowABForm] = useState(false);
  const [abName, setABName] = useState("");
  const [abSticky, setABSticky] = useState(true);
  const [variants, setVariants] = useState<any[]>([
    emptyVariant(50, true), emptyVariant(50),
  ]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [l, r] = await Promise.all([api.getLink(id), api.getRules(id)]);
      setLink(l);
      setRules(r);
    } catch (e: any) {
      setError(e.message || "Failed to load link.");
    }
    try {
      const t = await api.getABTest(id);
      setABTest(t);
      const res = await api.getABResults(t.id);
      setABResults(res);
    } catch {
      setABTest(null);
      setABResults(null);
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);

  // ── Rule actions ────────────────────────────────────────────
  async function submitRule() {
    setError("");
    try {
      await api.createRule(id, {
        name: ruleName,
        priority: rulePriority,
        is_active: true,
        conditions: conditions.map(condToPayload),
        destination_url: ruleDest,
      });
      setRuleName(""); setRuleDest(""); setRulePriority(100);
      setConditions([{ field: "country_code", operator: "equals", value: "" }]);
      setShowNewRule(false);
      await loadAll();
    } catch (e: any) {
      setError(e.message || "Could not create rule.");
    }
  }

  async function toggleRule(rule: any) {
    await api.updateRule(rule.id, { is_active: !rule.is_active });
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
  }

  async function deleteRule(ruleId: string) {
    if (!confirm("Delete this rule?")) return;
    await api.deleteRule(ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }

  // ── A/B actions ─────────────────────────────────────────────
  async function createABTest() {
    setError("");
    const total = variants.reduce((s, v) => s + Number(v.weight || 0), 0);
    if (total !== 100) {
      setError(`Variant weights must sum to 100 (currently ${total}).`);
      return;
    }
    try {
      await api.createABTest(id, {
        name: abName, sticky: abSticky, status: "running",
        variants: variants.map((v) => ({
          name: v.name, destination_url: v.destination_url.trim(),
          weight: Number(v.weight), is_control: v.is_control,
        })),
      });
      setShowABForm(false); setABName("");
      setVariants([emptyVariant(50, true), emptyVariant(50)]);
      await loadAll();
    } catch (e: any) {
      setError(e.message || "Could not create A/B test.");
    }
  }

  async function setStatus(status: string) {
    await api.updateABTest(abTest.id, { status });
    await loadAll();
  }

  async function declareWinner(variantId: string) {
    if (!confirm("Promote this variant to the link's primary destination and end the test?")) return;
    await api.declareWinner(abTest.id, variantId, true);
    await loadAll();
  }

  async function deleteABTest() {
    if (!confirm("Delete this A/B test and all its variants?")) return;
    await api.deleteABTest(abTest.id);
    await loadAll();
  }

  /* ── Loading State ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-white/[0.08]" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500" />
          </div>
          <p className="text-sm text-zinc-500">Loading targeting rules…</p>
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Hero Header ──────────────────────────────────── */}
      <div className="animate-fade-up">
        <RouterLink
          to="/links"
          className="group mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-violet-400"
        >
          {Icons.back}
          <span className="group-hover:underline">Back to links</span>
        </RouterLink>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.08] via-transparent to-fuchsia-500/[0.05] p-6 backdrop-blur-xl">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/[0.1] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-fuchsia-500/[0.08] blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 text-violet-400 ring-1 ring-violet-500/25 animate-pulse-glow">
                {Icons.target}
              </div>
              <div>
                <h1 className="page-title">
                  Targeting & A/B Testing
                </h1>
                {link && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1 font-mono text-xs text-violet-300 ring-1 ring-violet-500/20">
                      {Icons.link}
                      {link.short_url || link.short_code}
                    </span>
                    {Icons.arrow}
                    <span className="max-w-[300px] truncate text-xs text-zinc-400">
                      {link.final_url || link.destination_url}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline info */}
          <div className="relative mt-5 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <span className="text-violet-400">{Icons.info}</span>
            <p className="text-[12px] leading-relaxed text-zinc-500">
              On every click, TrackFlow evaluates <b className="text-zinc-300">routing rules</b> first (by priority),
              then the <b className="text-zinc-300">A/B test</b>, and finally falls back to the link's default destination.
              Campaign UTMs are carried onto every resolved destination.
            </p>
          </div>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────── */}
      {error && (
        <div className="animate-fade-up flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-3 backdrop-blur-sm">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs text-rose-300">!</span>
          <p className="text-sm text-rose-300">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-rose-400/60 hover:text-rose-300 transition-colors">✕</button>
        </div>
      )}

      {/* ── Smart Redirect Rules ─────────────────────────── */}
      <SectionCard
        icon={Icons.route}
        title="Smart Redirect Rules"
        subtitle="Route visitors to different destinations based on geo, device, language, or time."
        badge={
          rules.length > 0 ? (
            <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-bold text-violet-300 ring-1 ring-violet-500/25">
              {rules.length} rule{rules.length !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
        delay={100}
      >
        {/* Rules list */}
        {rules.length === 0 && !showNewRule ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-600">
              {Icons.route}
            </div>
            <p className="mb-1 text-sm font-medium text-zinc-400">No routing rules yet</p>
            <p className="mb-4 text-xs text-zinc-600">Every visitor gets the default destination.</p>
            <GradientButton onClick={() => setShowNewRule(true)}>
              {Icons.plus}
              Create first rule
            </GradientButton>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((r, idx) => (
              <div
                key={r.id}
                className={`group/rule relative rounded-xl border transition-all duration-200 ${
                  r.is_active
                    ? "border-white/[0.08] bg-white/[0.03] hover:border-violet-500/20 hover:bg-white/[0.05]"
                    : "border-white/[0.05] bg-white/[0.015] opacity-60 hover:opacity-80"
                }`}
                style={{ animation: `fade-up 0.3s ease-out ${idx * 60}ms both` }}
              >
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    {/* Rule header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/15 font-mono text-[10px] font-bold text-violet-300">
                        {r.priority}
                      </span>
                      <span className="text-sm font-semibold text-zinc-200">{r.name || "Unnamed Rule"}</span>
                      {!r.is_active && (
                        <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-zinc-500/20">
                          paused
                        </span>
                      )}
                    </div>

                    {/* Conditions as pills */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">IF</span>
                      {(r.conditions || []).map((c: any, ci: number) => (
                        <span key={ci} className="flex items-center gap-1.5">
                          {ci > 0 && <span className="text-[10px] font-bold text-fuchsia-400/60">AND</span>}
                          <ConditionPill field={c.field} operator={c.operator} value={c.value} />
                        </span>
                      ))}
                      <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        {Icons.arrow}
                        <span className="max-w-[200px] truncate font-mono text-[11px] text-cyan-400">{r.destination_url}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover/rule:opacity-100">
                    <SmallButton onClick={() => toggleRule(r)}>
                      {r.is_active ? Icons.pause : Icons.play}
                      {r.is_active ? "Pause" : "Resume"}
                    </SmallButton>
                    <SmallButton variant="danger" onClick={() => deleteRule(r.id)}>
                      {Icons.trash}
                      Delete
                    </SmallButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── New Rule Form ──────────────────────────────── */}
        {!showNewRule && rules.length > 0 && (
          <button
            onClick={() => setShowNewRule(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-3 text-xs font-medium text-zinc-500 transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-400"
          >
            {Icons.plus}
            Add new rule
          </button>
        )}

        {showNewRule && (
          <div className="mt-4 animate-fade-up space-y-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.03] p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                {Icons.sparkles}
                New Redirect Rule
              </h3>
              <button onClick={() => setShowNewRule(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>Rule Name</FieldLabel>
                <GlassInput value={ruleName} placeholder="e.g. India mobile users" onChange={(e) => setRuleName(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Priority (lower = first)</FieldLabel>
                <GlassInput type="number" value={rulePriority} onChange={(e) => setRulePriority(Number(e.target.value))} />
              </div>
              <div>
                <FieldLabel required>Destination URL</FieldLabel>
                <GlassInput value={ruleDest} placeholder="https://site.com/in" onChange={(e) => setRuleDest(e.target.value)} />
              </div>
            </div>

            {/* Conditions builder */}
            <div>
              <FieldLabel>Conditions (all must match)</FieldLabel>
              <div className="space-y-2.5">
                {conditions.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    {i > 0 && (
                      <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-fuchsia-400">AND</span>
                    )}
                    <GlassSelect className="max-w-[150px]" value={c.field}
                      onChange={(e) => setConditions((p) => p.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}>
                      {FIELDS.map((f) => <option key={f} value={f}>{FIELD_ICONS[f] || "📌"} {f}</option>)}
                    </GlassSelect>
                    <GlassSelect className="max-w-[130px]" value={c.operator}
                      onChange={(e) => setConditions((p) => p.map((x, j) => j === i ? { ...x, operator: e.target.value } : x))}>
                      {OPERATORS.map((o) => <option key={o} value={o}>{OP_LABELS[o] || o} {o}</option>)}
                    </GlassSelect>
                    <GlassInput className="max-w-[220px]" value={c.value}
                      placeholder={VALUE_HINT[c.operator] || VALUE_HINT.default}
                      onChange={(e) => setConditions((p) => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                    {conditions.length > 1 && (
                      <button className="rounded-lg p-1.5 text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                        onClick={() => setConditions((p) => p.filter((_, j) => j !== i))}>
                        {Icons.trash}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 transition-colors hover:text-violet-300"
                onClick={() => setConditions((p) => [...p, { field: "device_type", operator: "equals", value: "" }])}
              >
                {Icons.plus}
                Add condition
              </button>
            </div>

            <div className="flex gap-3 border-t border-white/[0.06] pt-4">
              <GradientButton onClick={submitRule} disabled={!ruleDest.trim()}>
                {Icons.plus}
                Add Rule
              </GradientButton>
              <GradientButton variant="secondary" onClick={() => setShowNewRule(false)}>
                Cancel
              </GradientButton>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── A/B Testing ──────────────────────────────────── */}
      <SectionCard
        icon={Icons.flask}
        title="A/B Split Test"
        subtitle="Split traffic across multiple destinations and promote the winner."
        badge={abTest ? <StatusBadge status={abTest.status} /> : undefined}
        delay={200}
      >
        {/* Empty state */}
        {!abTest && !showABForm && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-600">
              {Icons.flask}
            </div>
            <p className="mb-1 text-sm font-medium text-zinc-400">No active A/B test</p>
            <p className="mb-4 text-xs text-zinc-600">Create an experiment to split traffic across variants.</p>
            <GradientButton onClick={() => setShowABForm(true)}>
              {Icons.sparkles}
              Create A/B Test
            </GradientButton>
          </div>
        )}

        {/* ── Create A/B Form ────────────────────────────── */}
        {!abTest && showABForm && (
          <div className="animate-fade-up space-y-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.03] p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                {Icons.sparkles}
                New Experiment
              </h3>
              <button onClick={() => setShowABForm(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Test Name</FieldLabel>
                <GlassInput value={abName} placeholder="Landing page test" onChange={(e) => setABName(e.target.value)} />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={abSticky} onChange={(e) => setABSticky(e.target.checked)} className="sr-only peer" />
                    <div className="h-5 w-9 rounded-full bg-white/[0.06] border border-white/[0.08] transition-colors peer-checked:bg-violet-500/30 peer-checked:border-violet-500/40" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-zinc-500 transition-all peer-checked:left-[18px] peer-checked:bg-violet-400" />
                  </div>
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Sticky sessions
                  </span>
                </label>
              </div>
            </div>

            {/* Variants */}
            <div>
              <FieldLabel>Variants</FieldLabel>
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-xs font-bold text-violet-300">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <GlassInput className="max-w-[130px]" value={v.name} placeholder={`Variant ${String.fromCharCode(65 + i)}`}
                      onChange={(e) => setVariants((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <GlassInput className="max-w-[280px]" value={v.destination_url} placeholder="https://site.com/version-a"
                      onChange={(e) => setVariants((p) => p.map((x, j) => j === i ? { ...x, destination_url: e.target.value } : x))} />
                    <div className="flex items-center gap-1.5">
                      <GlassInput type="number" className="max-w-[70px] text-center" value={v.weight}
                        onChange={(e) => setVariants((p) => p.map((x, j) => j === i ? { ...x, weight: e.target.value } : x))} />
                      <span className="text-xs text-zinc-600">%</span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="control" checked={v.is_control}
                        className="h-3.5 w-3.5 accent-violet-500"
                        onChange={() => setVariants((p) => p.map((x, j) => ({ ...x, is_control: j === i })))} />
                      <span className="text-[11px] text-zinc-500">control</span>
                    </label>
                    {variants.length > 2 && (
                      <button className="rounded-lg p-1.5 text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                        onClick={() => setVariants((p) => p.filter((_, j) => j !== i))}>
                        {Icons.trash}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 transition-colors hover:text-violet-300"
                onClick={() => setVariants((p) => [...p, emptyVariant(0)])}
              >
                {Icons.plus}
                Add variant
              </button>
            </div>

            <div className="flex gap-3 border-t border-white/[0.06] pt-4">
              <GradientButton onClick={createABTest}>
                {Icons.sparkles}
                Start Experiment
              </GradientButton>
              <GradientButton variant="secondary" onClick={() => setShowABForm(false)}>
                Cancel
              </GradientButton>
            </div>
          </div>
        )}

        {/* ── Active A/B Test Results ─────────────────────── */}
        {abTest && (
          <div className="space-y-4">
            {/* Test meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="font-semibold text-zinc-300">{abTest.name || "Test"}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>{abTest.sticky ? "Sticky sessions" : "Non-sticky"}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span className="font-mono text-cyan-400">{abResults?.total_clicks ?? 0}</span> clicks recorded
            </div>

            {/* Variant cards with progress bars */}
            <div className="space-y-3">
              {(abResults?.variants || abTest.variants).map((v: any, idx: number) => {
                const vid = v.variant_id || v.id;
                const isWinner = abTest.winner_variant_id === vid;
                const maxClicks = Math.max(...(abResults?.variants || abTest.variants).map((x: any) => x.total_clicks ?? 0), 1);
                const barWidth = ((v.total_clicks ?? 0) / maxClicks) * 100;

                return (
                  <div
                    key={vid}
                    className={`group/variant relative rounded-xl border transition-all duration-300 ${
                      isWinner
                        ? "border-emerald-500/30 bg-emerald-500/[0.05] ring-1 ring-emerald-500/20"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                    }`}
                    style={{ animation: `fade-up 0.3s ease-out ${idx * 80}ms both` }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Variant label */}
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isWinner
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-300"
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-200">{v.name || `Variant ${String.fromCharCode(65 + idx)}`}</span>
                              {v.is_control && (
                                <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-zinc-500/20">control</span>
                              )}
                              {isWinner && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/25">
                                  {Icons.trophy}
                                  Winner
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-zinc-600">
                              {Icons.link}
                              <span className="truncate text-cyan-400/70">{v.destination_url}</span>
                            </p>

                            {/* Stats row */}
                            <div className="mt-3 flex items-center gap-5 text-xs">
                              <div>
                                <span className="text-zinc-600">Weight</span>
                                <p className="font-mono font-semibold text-zinc-300">{v.weight}%</p>
                              </div>
                              <div>
                                <span className="text-zinc-600">Clicks</span>
                                <p className="font-mono font-semibold text-zinc-200">{v.total_clicks ?? 0}</p>
                              </div>
                              <div>
                                <span className="text-zinc-600">Unique</span>
                                <p className="font-mono font-semibold text-zinc-400">{v.unique_clicks ?? 0}</p>
                              </div>
                              <div>
                                <span className="text-zinc-600">Share</span>
                                <p className="font-mono font-semibold text-violet-400">{(v.share_pct ?? 0).toFixed?.(1) ?? 0}%</p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                  isWinner ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action button */}
                        {abTest.status !== "completed" && (
                          <button
                            onClick={() => declareWinner(vid)}
                            className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-400 opacity-0 transition-all hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10 group-hover/variant:opacity-100"
                          >
                            <span className="flex items-center gap-1.5">
                              {Icons.trophy}
                              Declare Winner
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 border-t border-white/[0.06] pt-4">
              {abTest.status === "running" && (
                <GradientButton variant="secondary" onClick={() => setStatus("paused")}>
                  {Icons.pause}
                  Pause Test
                </GradientButton>
              )}
              {abTest.status === "paused" && (
                <GradientButton onClick={() => setStatus("running")}>
                  {Icons.play}
                  Resume Test
                </GradientButton>
              )}
              <GradientButton variant="danger" onClick={deleteABTest}>
                {Icons.trash}
                Delete Test
              </GradientButton>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Smart Deep Linking ───────────────────────────── */}
      <DeepLinkCard linkId={id} />
    </div>
  );
}
