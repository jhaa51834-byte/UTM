import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Shield, BarChart3, Globe } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
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

        {/* Center: Hero content */}
        <div className="relative z-10 max-w-md space-y-8">
          <div className="animate-fade-up stagger-2">
            <h2 className="text-4xl font-extrabold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Enterprise URL
              <br />
              <span className="gradient-text">Management</span>
              <br />
              Platform
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              AI-powered UTM tracking with governance rules, smart shortening, and real-time analytics — built for modern marketing teams.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3 animate-fade-up stagger-4">
            {[
              { icon: <Zap className="h-4 w-4 text-amber-400" />, label: "AI-Powered UTM Suggestions", color: "amber" },
              { icon: <Shield className="h-4 w-4 text-emerald-400" />, label: "Governance & Compliance", color: "emerald" },
              { icon: <BarChart3 className="h-4 w-4 text-cyan-400" />, label: "Real-time Click Analytics", color: "cyan" },
              { icon: <Globe className="h-4 w-4 text-violet-400" />, label: "Custom Domains & QR Codes", color: "violet" },
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

        {/* Bottom: Social proof */}
        <div className="relative z-10 animate-fade-up stagger-6">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b'].map((c, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-[#0a0a12]"
                  style={{ background: `linear-gradient(135deg, ${c}, ${c}88)` }}
                />
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">2,000+ marketers</p>
              <p className="text-xs text-zinc-500">trust TrackFlow for their campaigns</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Login Form ─────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 relative">
        {/* Mobile-only orbs */}
        <div className="pointer-events-none fixed inset-0 lg:hidden">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>

        <div className="relative w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="mb-2 text-center lg:hidden animate-fade-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-2xl font-black text-white shadow-2xl shadow-violet-500/30 animate-float">
              T
            </div>
            <h1 className="gradient-text text-3xl font-black tracking-tight">TrackFlow</h1>
          </div>

          {/* Welcome text */}
          <div className="animate-fade-up stagger-1">
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="animate-scale-in rounded-xl bg-red-500/8 border border-red-500/15 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="animate-fade-up stagger-2">
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="login-email"
                  type="email"
                  className="input-field pl-11"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="animate-fade-up stagger-3">
              <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  className="input-field pl-11 pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-[15px] animate-fade-up stagger-4"
            >
              {loading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="animate-fade-up stagger-5">
            <p className="text-center text-sm text-zinc-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-violet-400 hover:text-violet-300 transition-colors underline decoration-violet-400/30 underline-offset-4 hover:decoration-violet-300/50"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Platform tags */}
          <div className="animate-fade-up stagger-6 flex items-center justify-center gap-2 flex-wrap">
            {["GA4", "Adobe Analytics", "Tealium", "GTM"].map((t) => (
              <span key={t} className="rounded-full bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-zinc-600 border border-white/[0.04]">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
