import { useEffect, useState } from "react";
import { api } from "../lib/api";

const inputCls =
  "w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm " +
  "text-white placeholder:text-zinc-600 focus:border-fuchsia-400/60 focus:outline-none " +
  "focus:ring-4 focus:ring-fuchsia-500/15";

const EMPTY = {
  is_active: true,
  deferred: true,
  android_package_name: "",
  android_deep_link: "",
  play_store_url: "",
  ios_bundle_id: "",
  ios_deep_link: "",
  app_store_url: "",
  desktop_url: "",
};

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
      <input className={inputCls} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function DeepLinkCard({ linkId }: { linkId: string }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function load() {
    setLoading(true);
    try {
      const cfg = await api.getDeepLink(linkId);
      setForm({ ...EMPTY, ...cfg });
      setExists(true);
    } catch {
      setForm({ ...EMPTY });
      setExists(false);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [linkId]);

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.saveDeepLink(linkId, form);
      setExists(true); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || "Could not save deep-link config.");
    }
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Remove deep linking from this link?")) return;
    try {
      await api.deleteDeepLink(linkId);
      setForm({ ...EMPTY }); setExists(false);
    } catch (e: any) {
      setError(e.message || "Could not delete.");
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500/60 via-fuchsia-500/60 to-cyan-500/60" />

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-lg ring-1 ring-violet-500/20">
            📲
          </div>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-white">Smart Deep Linking</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Open the native app per device, falling back to the store. Desktop goes to the website.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exists && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              form.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-500/20 text-zinc-400"}`}>
              {form.is_active ? "active" : "off"}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-5">
          {error && (
            <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
          )}

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={form.deferred} onChange={(e) => set("deferred", e.target.checked)} />
              Deferred (resume after install)
            </label>
          </div>

          {/* Android */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold text-emerald-400">🤖 Android</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Package name" value={form.android_package_name}
                onChange={(v) => set("android_package_name", v)} placeholder="com.company.app" />
              <Field label="App deep link" value={form.android_deep_link}
                onChange={(v) => set("android_deep_link", v)} placeholder="myapp://product/123" />
              <div className="sm:col-span-2">
                <Field label="Play Store URL" value={form.play_store_url}
                  onChange={(v) => set("play_store_url", v)} placeholder="https://play.google.com/store/apps/details?id=…" />
              </div>
            </div>
          </div>

          {/* iOS */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold text-sky-400"> iOS</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Bundle ID" value={form.ios_bundle_id}
                onChange={(v) => set("ios_bundle_id", v)} placeholder="com.company.app" />
              <Field label="App deep link" value={form.ios_deep_link}
                onChange={(v) => set("ios_deep_link", v)} placeholder="myapp://product/123" />
              <div className="sm:col-span-2">
                <Field label="App Store URL" value={form.app_store_url}
                  onChange={(v) => set("app_store_url", v)} placeholder="https://apps.apple.com/app/id…" />
              </div>
            </div>
          </div>

          {/* Desktop */}
          <Field label="Desktop / website URL" value={form.desktop_url}
            onChange={(v) => set("desktop_url", v)} placeholder="https://company.com/product/123 (blank = link default)" />

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <button onClick={save} disabled={saving}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Saving…" : exists ? "Update deep linking" : "Enable deep linking"}
            </button>
            {saved && <span className="text-xs font-semibold text-emerald-400">Saved ✓</span>}
            {exists && (
              <button onClick={remove}
                className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10">
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
