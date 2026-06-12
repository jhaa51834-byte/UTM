import { useEffect, useState } from "react";
import { api, getIdentity } from "../api";
import { Badge, Card, Label, PrimaryButton, inputClass } from "../components/ui";
import type { GovernanceRule } from "../types";

const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export default function GovernanceTab() {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [error, setError] = useState("");
  const isAdmin = getIdentity().role === "admin";

  const [name, setName] = useState("");
  const [matchField, setMatchField] = useState("utm_source");
  const [matchValue, setMatchValue] = useState("");
  const [requiredField, setRequiredField] = useState("utm_medium");
  const [allowedValues, setAllowedValues] = useState("");
  const [severity, setSeverity] = useState<"error" | "warning">("error");

  const load = () => api.governanceRules().then(setRules).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setError("");
    try {
      await api.createRule({
        name, match_field: matchField, match_value: matchValue,
        required_field: requiredField,
        allowed_values: allowedValues.split(",").map((v) => v.trim()).filter(Boolean),
        severity, active: true,
      });
      setName(""); setMatchValue(""); setAllowedValues("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create rule");
    }
  };

  return (
    <div className="space-y-4">
      <Card
        title="Governance rules"
        subtitle='When the match field equals the match value, the required field must be one of the allowed values. "error" rules block generation.'
      >
        <ul className="stagger divide-y divide-white/5">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-emerald-500/5">
              <div className="text-sm">
                <span className="font-semibold text-white">{rule.name}</span>
                <p className="mt-0.5 font-mono text-xs text-emerald-300/80">
                  {rule.match_field}={rule.match_value} ⇒ {rule.required_field} ∈ [{rule.allowed_values.join(", ")}]
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge level={rule.severity} />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => api.deleteRule(rule.id).then(load)}
                    className="hover-wiggle text-xs text-slate-500 hover:text-rose-400"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {isAdmin ? (
        <Card title="Add rule (admin)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <Label required>Rule name</Label>
              <input className={inputClass} placeholder="Google Ads must use cpc"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>When field</Label>
              <select className={inputClass} value={matchField}
                onChange={(e) => setMatchField(e.target.value)}>
                {FIELDS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <Label required>Equals value</Label>
              <input className={inputClass} placeholder="google"
                value={matchValue} onChange={(e) => setMatchValue(e.target.value)} />
            </div>
            <div>
              <Label>Severity</Label>
              <select className={inputClass} value={severity}
                onChange={(e) => setSeverity(e.target.value as "error" | "warning")}>
                <option value="error">error (block)</option>
                <option value="warning">warning (allow)</option>
              </select>
            </div>
            <div>
              <Label>Then field</Label>
              <select className={inputClass} value={requiredField}
                onChange={(e) => setRequiredField(e.target.value)}>
                {FIELDS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label required>Must be one of (comma-separated)</Label>
              <input className={inputClass} placeholder="cpc, organic"
                value={allowedValues} onChange={(e) => setAllowedValues(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <PrimaryButton onClick={create}
              disabled={!name.trim() || !matchValue.trim() || !allowedValues.trim()}>
              Add rule
            </PrimaryButton>
            {error && <span className="text-sm text-rose-400">{error}</span>}
          </div>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">
          Switch role to <strong className="text-fuchsia-300">admin</strong> (top right) to manage rules.
        </p>
      )}
    </div>
  );
}
