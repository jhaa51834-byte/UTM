import { useEffect, useState } from "react";
import { api } from "../api";
import { Card, PrimaryButton } from "../components/ui";
import type { Template } from "../types";

const STARTER_TEMPLATES = [
  { name: "LinkedIn Lead Gen", utm_source: "linkedin", utm_medium: "paid_social", utm_campaign: "lead_generation" },
  { name: "Google Search", utm_source: "google", utm_medium: "cpc", utm_campaign: "" },
  { name: "Newsletter", utm_source: "email", utm_medium: "email", utm_campaign: "newsletter" },
  { name: "Product Launch", utm_source: "", utm_medium: "", utm_campaign: "product_launch" },
];

export default function TemplatesTab({ onUse, refreshKey }: {
  onUse: (t: Template) => void;
  refreshKey: number;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState("");

  const load = () => api.templates().then(setTemplates).catch(
    (e) => setError(e.message));
  useEffect(() => { load(); }, [refreshKey]);

  const addStarters = async () => {
    for (const t of STARTER_TEMPLATES) {
      await api.saveTemplate({
        description: "Starter template", utm_content: "", utm_term: "",
        custom_params: {}, ...t,
      });
    }
    load();
  };

  return (
    <Card
      title="Campaign template library"
      subtitle="Team-shared presets — apply one and fine-tune in the builder"
      actions={templates.length === 0 ? (
        <PrimaryButton onClick={addStarters} className="!px-3 !py-1.5 !text-xs">
          Add starter templates
        </PrimaryButton>
      ) : undefined}
    >
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {templates.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          No templates yet. Save one from the builder or add the starter pack.
        </p>
      )}
      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:-translate-y-1 hover:border-pink-400/40 hover:bg-pink-500/10 hover:shadow-[0_8px_28px_rgba(236,72,153,0.2)]">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-bold text-white">{t.name}</h3>
              <button
                type="button"
                onClick={() => api.deleteTemplate(t.id).then(load)}
                className="hover-wiggle text-xs text-slate-500 hover:text-rose-400"
                title="Delete template"
              >
                ✕
              </button>
            </div>
            <dl className="mt-2 space-y-0.5 text-xs text-slate-400">
              {t.utm_source && <div>source: <code className="text-pink-300">{t.utm_source}</code></div>}
              {t.utm_medium && <div>medium: <code className="text-pink-300">{t.utm_medium}</code></div>}
              {t.utm_campaign && <div>campaign: <code className="text-pink-300">{t.utm_campaign}</code></div>}
            </dl>
            <p className="mt-1 text-[10px] text-slate-500">by {t.created_by}</p>
            <PrimaryButton onClick={() => onUse(t)} className="mt-2 w-full !py-1.5 !text-xs">
              Use template
            </PrimaryButton>
          </div>
        ))}
      </div>
    </Card>
  );
}
