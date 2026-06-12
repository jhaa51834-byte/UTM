export const SOURCES = [
  "google", "bing", "facebook", "instagram", "linkedin", "twitter",
  "youtube", "email", "whatsapp", "reddit", "affiliate", "partner",
  "display", "custom",
] as const;

export const MEDIUMS = [
  "cpc", "paid_social", "organic_social", "email", "display", "affiliate",
  "referral", "push", "sms", "organic", "custom",
] as const;

export const CAMPAIGN_TYPES = [
  "brand_awareness", "product_launch", "webinar", "lead_generation",
  "remarketing", "app_install", "seasonal_sale", "custom",
] as const;

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export const SUGGESTED_CUSTOM_KEYS = [
  "cid", "channel", "audience", "placement", "adgroup", "creative", "vendor",
] as const;

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];
