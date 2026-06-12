import { useState, type ReactNode, type SelectHTMLAttributes } from "react";

export function Card({ title, subtitle, children, actions }: {
  title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <section className="card-lift card-topline rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-bold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-slate-300">
      {children}
      {required && <span className="ml-0.5 text-pink-400">*</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/[0.07] px-3 py-2 text-sm " +
  "text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none " +
  "focus:ring-4 focus:ring-fuchsia-500/20";

export function Select({
  options, allowCustom, value, onValueChange, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly string[];
  allowCustom?: boolean;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const isPreset = (options as readonly string[]).includes(value) && value !== "custom";
  const [customMode, setCustomMode] = useState(!isPreset && value !== "");

  if (allowCustom && customMode) {
    return (
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={value === "custom" ? "" : value}
          autoFocus
          placeholder="custom value"
          onChange={(e) => onValueChange(e.target.value)}
        />
        <button
          type="button"
          className="hover-wiggle rounded-lg border border-white/15 px-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
          onClick={() => { setCustomMode(false); onValueChange(""); }}
          title="Back to presets"
        >
          ↩
        </button>
      </div>
    );
  }

  return (
    <select
      {...rest}
      className={inputClass}
      value={isPreset ? value : value === "" ? "" : "custom"}
      onChange={(e) => {
        if (e.target.value === "custom" && allowCustom) {
          setCustomMode(true);
          onValueChange("custom");
          onValueChange("");
        } else {
          onValueChange(e.target.value);
        }
      }}
    >
      <option value="">— select —</option>
      {options.filter((o) => o !== "custom").map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
      {allowCustom && <option value="custom">custom…</option>}
    </select>
  );
}

export function CopyButton({ text, label = "Copy", small }: {
  text: string; label?: string; small?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`rounded-lg border font-medium transition-all duration-200 disabled:opacity-40 ${
        copied
          ? "animate-pop border-emerald-400/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.4)]"
          : "border-white/15 bg-white/5 text-slate-200 hover:-translate-y-0.5 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/15 hover:text-fuchsia-200 hover:shadow-[0_0_14px_rgba(217,70,239,0.3)]"
      } ${small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs"}`}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export function Badge({ level }: { level: "error" | "warning" | "info" | "ok" }) {
  const styles = {
    error: "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]",
    warning: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]",
    info: "bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40 shadow-[0_0_10px_rgba(14,165,233,0.25)]",
    ok: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]",
  } as const;
  return (
    <span className={`animate-pop rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${styles[level]}`}>
      {level}
    </span>
  );
}

export function PrimaryButton({ children, ...rest }: {
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn-gradient rounded-lg px-4 py-2 text-sm font-bold text-white
        disabled:opacity-50 ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}
