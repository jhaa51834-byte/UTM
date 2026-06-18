/* ═══════════════════════════════════════════════════════════════
   TrackFlow — Typed API Client with Auth + Interceptors
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = "/api/v1";

// ── Token Management ────────────────────────────────────────────

let accessToken: string | null = localStorage.getItem("tf_access_token");
let refreshToken: string | null = localStorage.getItem("tf_refresh_token");
let currentOrgId: string | null = localStorage.getItem("tf_org_id");

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem("tf_access_token", access);
  localStorage.setItem("tf_refresh_token", refresh);
}

export function setOrgId(orgId: string) {
  currentOrgId = orgId;
  localStorage.setItem("tf_org_id", orgId);
}

export function clearAuth() {
  accessToken = null;
  refreshToken = null;
  currentOrgId = null;
  localStorage.removeItem("tf_access_token");
  localStorage.removeItem("tf_refresh_token");
  localStorage.removeItem("tf_org_id");
}

export function isAuthenticated(): boolean {
  return !!accessToken;
}

export function getOrgId(): string | null {
  return currentOrgId;
}

// ── Core Request Function ───────────────────────────────────────

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  if (currentOrgId) {
    headers["X-Org-Id"] = currentOrgId;
  }
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers as Record<string, string> },
  });

  // Handle token refresh on 401
  if (res.status === 401 && refreshToken) {
    const refreshed = await _tryRefresh();
    if (refreshed) {
      // Retry the original request
      headers["Authorization"] = `Bearer ${accessToken}`;
      const retry = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { ...headers, ...init.headers as Record<string, string> },
      });
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${retry.status})`);
      }
      return retry.json() as Promise<T>;
    }
    // Refresh failed — force logout
    clearAuth();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

async function _tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

// ── API Methods ─────────────────────────────────────────────────

export const api = {
  // Auth
  register: (payload: { email: string; password: string; full_name: string; org_name?: string }) =>
    request<{ access_token: string; refresh_token: string; expires_in: number }>("/auth/register", {
      method: "POST", body: JSON.stringify(payload),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string; expires_in: number }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),

  // Links
  createLink: (payload: any) =>
    request<any>("/links", { method: "POST", body: JSON.stringify(payload) }),

  getLinks: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }>(
      `/links${qs ? `?${qs}` : ""}`
    );
  },

  getLink: (id: string) => request<any>(`/links/${id}`),
  updateLink: (id: string, data: any) =>
    request<any>(`/links/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLink: (id: string) =>
    request<{ deleted: number }>(`/links/${id}`, { method: "DELETE" }),
  toggleLink: (id: string, is_active: boolean) =>
    request<any>(`/links/${id}/toggle`, { method: "PATCH", body: JSON.stringify({ is_active }) }),

  // UTM
  generateUtm: (payload: any) =>
    request<any>("/generate-utm", { method: "POST", body: JSON.stringify(payload) }),
  validate: (payload: any) =>
    request<any>("/validate", { method: "POST", body: JSON.stringify(payload) }),
  campaignName: (parts: string[]) =>
    request<{ campaign_name: string }>("/campaign-name", {
      method: "POST", body: JSON.stringify({ parts }),
    }),
  aiSuggest: (description: string) =>
    request<any>("/ai-suggest", {
      method: "POST", body: JSON.stringify({ description }),
    }),

  // Campaigns
  getCampaigns: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ items: any[]; total: number }>(`/campaigns${qs ? `?${qs}` : ""}`);
  },
  createCampaign: (data: any) =>
    request<any>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: any) =>
    request<any>(`/campaigns/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Analytics
  analyticsOverview: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/analytics/overview${qs ? `?${qs}` : ""}`);
  },
  analyticsClicks: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any[]>(`/analytics/clicks${qs ? `?${qs}` : ""}`);
  },
  analyticsGeo: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/analytics/geo${qs ? `?${qs}` : ""}`);
  },
  analyticsDevices: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/analytics/devices${qs ? `?${qs}` : ""}`);
  },
  analyticsCampaigns: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any[]>(`/analytics/campaigns${qs ? `?${qs}` : ""}`);
  },

  // Domains
  getDomains: () => request<any[]>("/domains"),
  addDomain: (data: any) =>
    request<any>("/domains", { method: "POST", body: JSON.stringify(data) }),
  verifyDomain: (id: string) =>
    request<any>(`/domains/${id}/verify`, { method: "POST" }),
  deleteDomain: (id: string) =>
    request<{ deleted: number }>(`/domains/${id}`, { method: "DELETE" }),

  // QR Codes
  createQR: (data: any) =>
    request<any>("/qr", { method: "POST", body: JSON.stringify(data) }),
  qrDownloadUrl: (id: string) => `${API_BASE}/qr/${id}/download`,
  qrGenerateUrl: (url: string, fmt = "png", scale = 8) =>
    `${API_BASE}/qr/generate?url=${encodeURIComponent(url)}&fmt=${fmt}&scale=${scale}`,

  // Organizations
  getOrgs: () => request<any[]>("/organizations"),
  createOrg: (data: any) =>
    request<any>("/organizations", { method: "POST", body: JSON.stringify(data) }),
  getMembers: (orgId: string) => request<any[]>(`/organizations/${orgId}/members`),
  inviteMember: (orgId: string, data: any) =>
    request<any>(`/organizations/${orgId}/invite`, { method: "POST", body: JSON.stringify(data) }),

  // Templates
  getTemplates: () => request<any[]>("/templates"),
  saveTemplate: (data: any) =>
    request<any>("/save-template", { method: "POST", body: JSON.stringify(data) }),
  deleteTemplate: (id: number) =>
    request<{ deleted: number }>(`/templates/${id}`, { method: "DELETE" }),

  // Governance
  getGovernanceRules: () => request<any[]>("/governance-rules"),
  createGovernanceRule: (data: any) =>
    request<any>("/governance-rules", { method: "POST", body: JSON.stringify(data) }),
  deleteGovernanceRule: (id: number) =>
    request<{ deleted: number }>(`/governance-rules/${id}`, { method: "DELETE" }),

  // Bulk
  bulkGenerate: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<any>("/bulk-generate", { method: "POST", body: form });
  },
  bulkExport: async (rows: any[], fmt: "csv" | "xlsx") => {
    const form = new FormData();
    form.append("rows_json", JSON.stringify(rows));
    form.append("fmt", fmt);
    const res = await fetch(`${API_BASE}/bulk-export`, {
      method: "POST",
      body: form,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },

  // Smart redirect rules
  getRules: (linkId: string) => request<any[]>(`/links/${linkId}/rules`),
  createRule: (linkId: string, data: any) =>
    request<any>(`/links/${linkId}/rules`, { method: "POST", body: JSON.stringify(data) }),
  updateRule: (ruleId: string, data: any) =>
    request<any>(`/rules/${ruleId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRule: (ruleId: string) =>
    request<{ deleted: number }>(`/rules/${ruleId}`, { method: "DELETE" }),

  // A/B testing
  getABTest: (linkId: string) => request<any>(`/links/${linkId}/ab-test`),
  createABTest: (linkId: string, data: any) =>
    request<any>(`/links/${linkId}/ab-test`, { method: "POST", body: JSON.stringify(data) }),
  updateABTest: (testId: string, data: any) =>
    request<any>(`/ab-tests/${testId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteABTest: (testId: string) =>
    request<{ deleted: number }>(`/ab-tests/${testId}`, { method: "DELETE" }),
  getABResults: (testId: string) => request<any>(`/ab-tests/${testId}/results`),
  declareWinner: (testId: string, variantId: string, applyToLink = true) =>
    request<any>(`/ab-tests/${testId}/declare-winner`, {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, apply_to_link: applyToLink }),
    }),

  // Admin
  getAuditLogs: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },
  getApiKeys: () => request<any[]>("/admin/api-keys"),
  createApiKey: (name: string, scopes: string) =>
    request<any>(`/admin/api-keys?name=${encodeURIComponent(name)}&scopes=${scopes}`, { method: "POST" }),
  revokeApiKey: (id: string) =>
    request<{ deleted: number }>(`/admin/api-keys/${id}`, { method: "DELETE" }),
};
