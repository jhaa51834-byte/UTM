import { useState } from "react";
import { api } from "../api";
import type { UtmParams } from "../types";
import { Card, CopyButton, PrimaryButton } from "./ui";

function paramsOnly(url: string): string {
  const idx = url.indexOf("?");
  return idx === -1 ? "" : url.slice(idx + 1).split("#")[0];
}

function csvRow(baseUrl: string, p: UtmParams, finalUrl: string): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [baseUrl, p.utm_source, p.utm_medium, p.utm_campaign, p.utm_content,
    p.utm_term, finalUrl].map(esc).join(",");
}

/** Mirror of the backend sanitizer — GA4 sees the cleaned value, not the raw input. */
const sanitize = (v: string) => v.trim().toLowerCase().split(/\s+/).join("_");

const GA4_LABELS: Record<string, string> = {
  utm_source: "Session source",
  utm_medium: "Session medium",
  utm_campaign: "Session campaign",
  utm_content: "Manual ad content",
  utm_term: "Manual term",
};

export default function ResultPanel({ finalUrl, baseUrl, params, historyId }: {
  finalUrl: string;
  baseUrl: string;
  params: UtmParams;
  historyId: number | null;
}) {
  const [shortUrl, setShortUrl] = useState("");
  const [provider, setProvider] = useState<"tinyurl" | "bitly">("tinyurl");
  const [shortening, setShortening] = useState(false);
  const [shortenError, setShortenError] = useState("");

  if (!finalUrl) return null;

  const shorten = async () => {
    setShortening(true);
    setShortenError("");
    try {
      const res = await api.shorten(finalUrl, provider, historyId ?? undefined);
      setShortUrl(res.short_url);
    } catch (e) {
      setShortenError(e instanceof Error ? e.message : "Shortening failed");
    } finally {
      setShortening(false);
    }
  };

  const downloadQr = async (fmt: "png" | "svg") => {
    const res = await fetch(api.qrUrl(finalUrl, fmt));
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `utm_qr.${fmt}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyQrPng = async () => {
    const res = await fetch(api.qrUrl(finalUrl, "png"));
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  };

  const ghostBtn =
    "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium " +
    "text-slate-200 transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 " +
    "hover:bg-cyan-500/15 hover:text-cyan-200";

  return (
    <div className="animate-pop">
    <Card title="Generated URL 🎉">
      <div key={finalUrl} className="url-glow animate-pop rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/60 px-4 py-3">
        <code className="break-all font-mono text-sm text-emerald-300">{finalUrl}</code>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={finalUrl} label="Copy URL" />
        <CopyButton text={paramsOnly(finalUrl)} label="Copy parameters only" />
        <CopyButton text={csvRow(baseUrl, params, finalUrl)} label="Copy CSV row" />
        <button type="button" onClick={copyQrPng} className={ghostBtn}>
          Copy QR code
        </button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {/* QR code */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fuchsia-300">QR code</h3>
          <img
            src={api.qrUrl(finalUrl, "png", 5)}
            alt="QR code for generated URL"
            className="h-36 w-36 rounded-xl border border-white/20 bg-white p-1.5 shadow-[0_0_20px_rgba(217,70,239,0.2)]"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => downloadQr("png")} className={ghostBtn}>
              ⬇ PNG
            </button>
            <button type="button" onClick={() => downloadQr("svg")} className={ghostBtn}>
              ⬇ SVG
            </button>
          </div>
        </div>

        {/* Shortener */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-300">Short link</h3>
          <div className="flex gap-2">
            <select
              className="rounded-lg border border-white/15 bg-white/[0.07] px-2 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "tinyurl" | "bitly")}
            >
              <option value="tinyurl">TinyURL</option>
              <option value="bitly">Bitly</option>
            </select>
            <PrimaryButton onClick={shorten} disabled={shortening} className="!px-3 !py-1.5 !text-xs">
              {shortening ? "…" : "Shorten"}
            </PrimaryButton>
          </div>
          {shortUrl && (
            <div className="mt-2 flex items-center gap-2">
              <code className="break-all font-mono text-xs text-cyan-300">{shortUrl}</code>
              <CopyButton text={shortUrl} small />
            </div>
          )}
          {shortenError && <p className="mt-2 text-xs text-rose-400">{shortenError}</p>}
        </div>

        {/* GA4 preview */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-300">
            How this appears in GA4
          </h3>
          <dl className="space-y-1">
            {Object.entries(GA4_LABELS).map(([field, label]) => {
              const value = sanitize(params[field as keyof UtmParams] as string);
              if (!value) return null;
              return (
                <div key={field} className="flex justify-between gap-2 text-xs">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="font-mono text-emerald-300">{value}</dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            GA4 groups source/medium into channels: cpc → Paid Search,
            paid_social → Paid Social, email → Email. Values are
            case-sensitive in reports.
          </p>
        </div>
      </div>
    </Card>
    </div>
  );
}
