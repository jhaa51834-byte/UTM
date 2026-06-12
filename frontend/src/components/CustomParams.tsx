import { SUGGESTED_CUSTOM_KEYS } from "../constants";
import { inputClass } from "./ui";

export type ParamRow = { key: string; value: string };

export default function CustomParams({ rows, onChange }: {
  rows: ParamRow[];
  onChange: (rows: ParamRow[]) => void;
}) {
  const update = (i: number, patch: Partial<ParamRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={`${inputClass} max-w-[180px]`}
            placeholder="parameter"
            list="suggested-keys"
            value={row.key}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="value"
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            className="hover-wiggle rounded-lg border border-white/15 px-2.5 text-sm text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
            title="Remove parameter"
          >
            ✕
          </button>
        </div>
      ))}
      <datalist id="suggested-keys">
        {SUGGESTED_CUSTOM_KEYS.map((k) => <option key={k} value={k} />)}
      </datalist>
      <button
        type="button"
        onClick={() => onChange([...rows, { key: "", value: "" }])}
        className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
      >
        + Add custom parameter
      </button>
    </div>
  );
}
