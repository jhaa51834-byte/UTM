import type {
  AiSuggestion, BulkRow, GenerateResponse, GovernanceRule, HistoryItem,
  Template, UtmParams, ValidationIssue,
} from "./types";

// Identity headers; in production these come from your SSO layer.
// The demo lets the user pick a name/role in the header bar.
let currentUser = localStorage.getItem("utm_user") || "demo_user";
let currentRole = localStorage.getItem("utm_role") || "admin";

export function setIdentity(user: string, role: string) {
  currentUser = user;
  currentRole = role;
  localStorage.setItem("utm_user", user);
  localStorage.setItem("utm_role", role);
}

export function getIdentity() {
  return { user: currentUser, role: currentRole };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "X-User": currentUser,
      "X-Role": currentRole,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  generateUtm: (payload: UtmParams & { base_url: string; force?: boolean }) =>
    request<GenerateResponse>("/generate-utm", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  validate: (payload: Partial<UtmParams> & { base_url: string }) =>
    request<{ valid: boolean; issues: ValidationIssue[] }>("/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  campaignName: (parts: string[]) =>
    request<{ campaign_name: string }>("/campaign-name", {
      method: "POST",
      body: JSON.stringify({ parts }),
    }),

  aiSuggest: (description: string) =>
    request<AiSuggestion>("/ai-suggest", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),

  bulkGenerate: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ rows: BulkRow[]; total: number; ok: number }>(
      "/bulk-generate", { method: "POST", body: form });
  },

  bulkExport: async (rows: BulkRow[], fmt: "csv" | "xlsx") => {
    const form = new FormData();
    form.append("rows_json", JSON.stringify(rows));
    form.append("fmt", fmt);
    const res = await fetch("/api/bulk-export", { method: "POST", body: form });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },

  templates: () => request<Template[]>("/templates"),
  saveTemplate: (t: Omit<Template, "id" | "created_by" | "created_at">) =>
    request<Template>("/save-template", { method: "POST", body: JSON.stringify(t) }),
  deleteTemplate: (id: number) =>
    request<{ deleted: number }>(`/templates/${id}`, { method: "DELETE" }),

  history: (params: Record<string, string>) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v)).toString();
    return request<HistoryItem[]>(`/history${qs ? `?${qs}` : ""}`);
  },
  deleteHistory: (id: number) =>
    request<{ deleted: number }>(`/history/${id}`, { method: "DELETE" }),

  governanceRules: () => request<GovernanceRule[]>("/governance-rules"),
  createRule: (rule: Omit<GovernanceRule, "id" | "created_by" | "created_at">) =>
    request<GovernanceRule>("/governance-rules", {
      method: "POST", body: JSON.stringify(rule) }),
  deleteRule: (id: number) =>
    request<{ deleted: number }>(`/governance-rules/${id}`, { method: "DELETE" }),

  shorten: (url: string, provider: "tinyurl" | "bitly", historyId?: number) =>
    request<{ short_url: string; provider: string }>("/shorten", {
      method: "POST",
      body: JSON.stringify({ url, provider, history_id: historyId ?? null }),
    }),

  qrUrl: (url: string, fmt: "png" | "svg", scale = 8) =>
    `/api/qr?url=${encodeURIComponent(url)}&fmt=${fmt}&scale=${scale}`,
};
