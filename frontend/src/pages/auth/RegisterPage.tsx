import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { User, Mail, Lock, Eye, EyeOff, Building2, ArrowRight, Zap, Shield, BarChart3, Globe } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", orgName: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  // Password strength
  const strength = useMemo(() => {
    const p = form.password;
    if (!p) return { score: 0, label: "", color: "" };
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (s <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (s <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (s <= 3) return { score: 3, label: "Good", color: "bg-yellow-400" };
    if (s <= 4) return { score: 4, label: "Strong", color: "bg-emerald-400" };
    return { score: 5, label: "Excellent", color: "bg-cyan-400" };
  }, [form.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.email, form.password, form.fullName, form.orgName);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left: Branding Panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#1a0a2e] flex-col justify-between p-12">
        {/* Floating orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-lg font-black text-white shadow-2xl shadow-violet-500/30">
              T
            </div>
            <span className="gradient-text text-2xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              TrackFlow
            </span>
          </div>
        </div>

        {/* Center */}
        <div className="relative z-10 max-w-md space-y-8">
          <div className="animate-fade-up stagger-2">
            <h2 className="text-4xl font-extrabold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Start tracking
              <br />
              <span className="gradient-text">smarter</span> today
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              Join thousands of marketers who use TrackFlow to build, govern, and analyze their campaign URLs with AI assistance.
            </p>
          </div>

          <div className="space-y-3 animate-fade-up stagger-4">
            {[
              { icon: <Zap className="h-4 w-4 text-amber-400" />, label: "Set up in under 2 minutes" },
              { icon: <Shield className="h-4 w-4 text-emerald-400" />, label: "SOC 2 compliant infrastructure" },
              { icon: <BarChart3 className="h-4 w-4 text-cyan-400" />, label: "Unlimited tracked links" },
              { icon: <Globe className="h-4 w-4 text-violet-400" />, label: "Custom domains included" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                  {f.icon}
                </div>
                <span className="text-sm font-medium text-zinc-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 animate-fade-up stagger-6">
          <p className="text-xs text-zinc-600">
            Free to start · No credit card required · Cancel anytime
          </p>
        </div>
      </div>

      {/* ── Right: Register Form ──────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 relative">
        <div className="pointer-events-none fixed inset-0 lg:hidden">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>

        <div className="relative w-full max-w-[400px] space-y-7">
          {/* Mobile logo */}
          <div className="mb-2 text-center lg:hidden animate-fade-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-2xl font-black text-white shadow-2xl shadow-violet-500/30 animate-float">
              T
            </div>
            <h1 className="gradient-text text-3xl font-black tracking-tight">TrackFlow</h1>
          </div>

          {/* Heading */}
          <div className="animate-fade-up stagger-1">
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Create your account
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Get started with TrackFlow in seconds</p>
          </div>

          {/* Error */}
          {error && (
            <div className="animate-scale-in rounded-xl bg-red-500/8 border border-red-500/15 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fade-up stagger-2">
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="register-name"
                  type="text"
                  className="input-field pl-11"
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={set("fullName")}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="animate-fade-up stagger-3">
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="register-email"
                  type="email"
                  className="input-field pl-11"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={set("email")}
                  required
                />
              </div>
            </div>

            <div className="animate-fade-up stagger-4">
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="register-password"
                  type={showPass ? "text" : "password"}
                  className="input-field pl-11 pr-11"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={set("password")}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength bar */}
              {form.password && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength.score ? strength.color : 'bg-white/[0.06]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Password strength: <span className="font-medium text-zinc-400">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="animate-fade-up stagger-5">
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Organization <span className="text-zinc-600 normal-case">(optional)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="register-org"
                  type="text"
                  className="input-field pl-11"
                  placeholder="Acme Inc."
                  value={form.orgName}
                  onChange={set("orgName")}
                />
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-[15px] animate-fade-up stagger-6"
            >
              {loading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="animate-fade-up stagger-7">
            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-violet-400 hover:text-violet-300 transition-colors underline decoration-violet-400/30 underline-offset-4 hover:decoration-violet-300/50"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
