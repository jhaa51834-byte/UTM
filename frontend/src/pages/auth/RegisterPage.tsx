import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", orgName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/3 h-96 w-96 rounded-full bg-violet-500/8 blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-2xl font-black text-white shadow-2xl shadow-violet-500/30 animate-float">
            T
          </div>
          <h1 className="gradient-text text-3xl font-black tracking-tight">Get Started</h1>
          <p className="mt-1 text-sm text-zinc-500">Create your TrackFlow account</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Jane Doe"
                value={form.fullName}
                onChange={set("fullName")}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Work Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="jane@company.com"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={set("password")}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Organization Name <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Acme Inc."
                value={form.orgName}
                onChange={set("orgName")}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
