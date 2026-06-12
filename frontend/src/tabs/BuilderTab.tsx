import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import AiAssistant from "../components/AiAssistant";
import CampaignNameGenerator from "../components/CampaignNameGenerator";
import CustomParams, { type ParamRow } from "../components/CustomParams";
import IssueList from "../components/IssueList";
import ResultPanel from "../components/ResultPanel";
import { Card, Label, PrimaryButton, Select, inputClass } from "../components/ui";
import { MEDIUMS, SOURCES } from "../constants";
import type { Template, UtmParams, ValidationIssue } from "../types";

export default function BuilderTab({ applyTemplate, onTemplateSaved }: {
  applyTemplate: Template | null;
  onTemplateSaved: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [term, setTerm] = useState("");
  const [customRows, setCustomRows] = useState<ParamRow[]>([]);

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [finalUrl, setFinalUrl] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Apply a template chosen on the Templates tab.
  useEffect(() => {
    if (!applyTemplate) return;
    setSource(applyTemplate.utm_source);
    setMedium(applyTemplate.utm_medium);
    setCampaign(applyTemplate.utm_campaign);
    setContent(applyTemplate.utm_content);
    setTerm(applyTemplate.utm_term);
    setCustomRows(Object.entries(applyTemplate.custom_params).map(
      ([key, value]) => ({ key, value })));
  }, [applyTemplate]);

  const params: UtmParams = useMemo(() => ({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
    utm_term: term,
    custom_params: Object.fromEntries(
      customRows.filter((r) => r.key.trim() && r.value.trim())
        .map((r) => [r.key.trim(), r.value.trim()])),
  }), [source, medium, campaign, content, term, customRows]);

  // Live validation (debounced) as the user types.
  const debounce = useRef<number>(undefined);
  useEffect(() => {
    if (!baseUrl && !source && !medium) { setIssues([]); return; }
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      try {
        const res = await api.validate({ base_url: baseUrl, ...params });
        setIssues(res.issues);
      } catch { /* validation preview is best-effort */ }
    }, 400);
    return () => window.clearTimeout(debounce.current);
  }, [baseUrl, params]);

  const generate = async (force = false) => {
    setBusy(true);
    setError("");
    try {
      const res = await api.generateUtm({ base_url: baseUrl, ...params, force });
      setIssues(res.issues);
      setBlocked(res.blocked);
      if (!res.blocked) {
        setFinalUrl(res.final_url);
        setHistoryId(res.history_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const saveAsTemplate = async () => {
    const name = window.prompt("Template name (e.g. LinkedIn Lead Gen):");
    if (!name) return;
    try {
      await api.saveTemplate({ name, description: "", ...params });
      onTemplateSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving template failed");
    }
  };

  return (
    <div className="stagger space-y-4">
      <Card title="Destination URL" subtitle="Query strings and #fragments are preserved">
        <input
          className={inputClass}
          placeholder="https://example.com/product-page"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </Card>

      <Card title="UTM parameters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label required>utm_source</Label>
            <Select options={SOURCES} allowCustom value={source} onValueChange={setSource} />
          </div>
          <div>
            <Label required>utm_medium</Label>
            <Select options={MEDIUMS} allowCustom value={medium} onValueChange={setMedium} />
          </div>
          <div>
            <Label>utm_campaign</Label>
            <input className={inputClass} placeholder="summer_sale_2026"
              value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </div>
          <div>
            <Label>utm_content</Label>
            <input className={inputClass} placeholder="banner_1"
              value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div>
            <Label>utm_term</Label>
            <input className={inputClass} placeholder="analytics software"
              value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <Label>Custom parameters (cid, channel, audience, placement, …)</Label>
          <CustomParams rows={customRows} onChange={setCustomRows} />
        </div>
      </Card>

      <CampaignNameGenerator onApply={setCampaign} />
      <AiAssistant onApprove={(s) => {
        if (s.utm_source) setSource(s.utm_source);
        if (s.utm_medium) setMedium(s.utm_medium);
        if (s.utm_campaign) setCampaign(s.utm_campaign);
        if (s.utm_content) setContent(s.utm_content);
        if (s.utm_term) setTerm(s.utm_term);
      }} />

      {issues.length > 0 && (
        <Card title="Validation">
          <IssueList issues={issues} />
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={() => generate(false)} disabled={busy || !baseUrl}>
          {busy ? "Generating…" : "Generate UTM URL"}
        </PrimaryButton>
        {blocked && (
          <button
            type="button"
            onClick={() => generate(true)}
            className="animate-pop rounded-lg border border-amber-400/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:-translate-y-0.5 hover:bg-amber-500/25 hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
          >
            Generate anyway (override governance)
          </button>
        )}
        <button
          type="button"
          onClick={saveAsTemplate}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:-translate-y-0.5 hover:border-pink-400/50 hover:bg-pink-500/15 hover:text-pink-200"
        >
          Save as template
        </button>
        {error && <span className="text-sm text-rose-400">{error}</span>}
      </div>

      <ResultPanel finalUrl={finalUrl} baseUrl={baseUrl} params={params} historyId={historyId} />
    </div>
  );
}
