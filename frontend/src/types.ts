export interface UtmParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  custom_params: Record<string, string>;
}

export interface ValidationIssue {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  field: string;
}

export interface GenerateResponse {
  final_url: string;
  issues: ValidationIssue[];
  blocked: boolean;
  history_id: number | null;
}

export interface AiSuggestion {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  rationale: string;
  engine: "rules" | "claude";
  needs_approval: boolean;
}

export interface Template extends UtmParams {
  id: number;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface HistoryItem extends UtmParams {
  id: number;
  base_url: string;
  final_url: string;
  short_url: string;
  created_by: string;
  created_at: string;
}

export interface GovernanceRule {
  id: number;
  name: string;
  match_field: string;
  match_value: string;
  required_field: string;
  allowed_values: string[];
  severity: "error" | "warning";
  active: boolean;
  created_by: string;
  created_at: string;
}

export interface BulkRow {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  final_url: string;
  status: "ok" | "warning" | "error";
  issues: string;
}
