import { useRef, useState } from "react";
import { api } from "../api";
import { Badge, Card, CopyButton, PrimaryButton } from "../components/ui";
import type { BulkRow } from "../types";

const SAMPLE_CSV =
  "URL,Source,Medium,Campaign,Content,Term\n" +
  "https://example.com/product,google,cpc,summer_sale_2026,banner_1,\n" +
  "https://example.com/pricing,linkedin,paid_social,b2b_leadgen_q3,,\n";

export default function BulkTab() {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const res = await api.bulkGenerate(file);
      setRows(res.rows);
      setSummary(`${res.ok} of ${res.total} rows generated successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const download = async (fmt: "csv" | "xlsx") => {
    const blob = await api.bulkExport(rows, fmt);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `utm_urls.${fmt}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadSample = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    a.download = "utm_sample.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Bulk URL generator"
        subtitle="Upload a CSV with columns: URL, Source, Medium, Campaign, Content, Term. Extra columns become custom parameters."
        actions={
          <button type="button" onClick={downloadSample}
            className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200">
            ⬇ Sample CSV
          </button>
        }
      >
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/[0.04] px-6 py-10 text-center transition-all hover:border-amber-400/60 hover:bg-amber-500/10 hover:shadow-[0_0_28px_rgba(245,158,11,0.15)]"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) upload(file);
          }}
        >
          <p className="text-sm font-semibold text-slate-200">
            {busy ? "Processing…" : "📤 Drop a CSV here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Up to 5 MB</p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </Card>

      {rows.length > 0 && (
        <Card
          title="Results"
          subtitle={summary}
          actions={
            <div className="flex gap-2">
              <PrimaryButton onClick={() => download("csv")} className="!px-3 !py-1.5 !text-xs">
                Export CSV
              </PrimaryButton>
              <PrimaryButton onClick={() => download("xlsx")} className="!px-3 !py-1.5 !text-xs">
                Export Excel
              </PrimaryButton>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/15 text-slate-400">
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">URL</th>
                  <th className="py-2 pr-3">Source / Medium</th>
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Generated URL</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 align-top transition-colors hover:bg-white/5">
                    <td className="py-2 pr-3"><Badge level={row.status === "ok" ? "ok" : row.status} /></td>
                    <td className="max-w-[200px] truncate py-2 pr-3" title={row.url}>{row.url}</td>
                    <td className="py-2 pr-3 font-mono">{row.source} / {row.medium}</td>
                    <td className="py-2 pr-3 font-mono">{row.campaign}</td>
                    <td className="max-w-[320px] py-2 pr-3">
                      {row.final_url
                        ? <code className="break-all font-mono text-cyan-300">{row.final_url}</code>
                        : <span className="text-rose-400">{row.issues}</span>}
                    </td>
                    <td className="py-2">
                      {row.final_url && <CopyButton text={row.final_url} small />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
