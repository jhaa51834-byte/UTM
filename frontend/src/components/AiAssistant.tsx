import { useState } from "react";
import { api } from "../api";
import type { AiSuggestion } from "../types";
import { Card, PrimaryButton, inputClass } from "./ui";

export default function AiAssistant({ onApprove }: {
  onApprove: (s: AiSuggestion) => void;
}) {
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggest = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError("");
    try {
      setSuggestion(await api.aiSuggest(description));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suggestion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="AI naming assistant"
      subtitle="Describe the campaign in plain language — review before applying"
    >
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder='e.g. "LinkedIn campaign for healthcare professionals in India"'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && suggest()}
        />
        <PrimaryButton onClick={suggest} disabled={loading || !description.trim()}>
          {loading ? "Thinking…" : "Suggest"}
        </PrimaryButton>
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {suggestion && (
        <div className="animate-pop mt-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3 shadow-[0_0_24px_rgba(217,70,239,0.15)]">
          <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
            {(["utm_source", "utm_medium", "utm_campaign"] as const).map((f) => (
              <div key={f}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{f}</dt>
                <dd className="font-mono text-fuchsia-200">{suggestion[f] || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-slate-400">
            {suggestion.rationale}
            <span className="ml-1 rounded bg-white/10 px-1 py-0.5 text-[10px] uppercase text-cyan-300">
              {suggestion.engine}
            </span>
          </p>
          <div className="mt-3 flex gap-2">
            <PrimaryButton onClick={() => { onApprove(suggestion); setSuggestion(null); }}>
              Approve & apply
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setSuggestion(null)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
