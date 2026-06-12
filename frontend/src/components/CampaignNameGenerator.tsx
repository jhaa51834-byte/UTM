import { useMemo, useState } from "react";
import { QUARTERS, YEARS } from "../constants";
import { Card, CopyButton, Label, Select, inputClass } from "./ui";

/** Mirrors backend slugify so the preview is instant and offline. */
export function slugify(part: string): string {
  return part
    .trim()
    .replace(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, " ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function CampaignNameGenerator({ onApply }: {
  onApply: (name: string) => void;
}) {
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("");
  const [quarter, setQuarter] = useState("");
  const [year, setYear] = useState(String(YEARS[0]));

  const name = useMemo(
    () => [product, region, quarter, year].map(slugify).filter(Boolean).join("_"),
    [product, region, quarter, year],
  );

  return (
    <Card
      title="Smart campaign name generator"
      subtitle="lowercase · underscores · no special characters"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label>Product</Label>
          <input className={inputClass} placeholder="AnalyticsTool"
            value={product} onChange={(e) => setProduct(e.target.value)} />
        </div>
        <div>
          <Label>Region</Label>
          <input className={inputClass} placeholder="India"
            value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div>
          <Label>Quarter</Label>
          <Select options={QUARTERS} value={quarter} onValueChange={setQuarter} />
        </div>
        <div>
          <Label>Year</Label>
          <Select options={YEARS.map(String)} value={year} onValueChange={setYear} />
        </div>
      </div>
      {name && (
        <div className="animate-pop mt-3 flex items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2">
          <code className="flex-1 break-all font-mono text-sm text-violet-300">{name}</code>
          <CopyButton text={name} small />
          <button
            type="button"
            onClick={() => onApply(name)}
            className="btn-gradient rounded-lg px-2.5 py-1 text-xs font-bold text-white"
          >
            Use as campaign
          </button>
        </div>
      )}
    </Card>
  );
}
