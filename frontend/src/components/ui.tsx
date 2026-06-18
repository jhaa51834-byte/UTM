import { useState, type ReactNode, type SelectHTMLAttributes } from "react";

export function Card({ title, subtitle, children, actions }: {
  title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <section className="glass card-topline rounded-2xl p-5 hover-lift">
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
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
    <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
      {children}
      {required && <span className="ml-0.5 text-fuchsia-400">*</span>}
    </label>
  );
}

export const inputClass = "input-field";

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
          className="btn-secondary px-3 py-2 text-xs"
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
      className={`btn-secondary ${small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs"} ${
        copied ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : ""
      }`}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export function Badge({ level }: { level: "error" | "warning" | "info" | "ok" }) {
  const styles = {
    error: "badge-danger",
    warning: "badge-warning",
    info: "badge-brand",
    ok: "badge-success",
  } as const;
  return (
    <span className={`badge ${styles[level]}`}>
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
      className={`btn-primary ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}
