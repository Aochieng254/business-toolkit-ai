/** Client-safe billing constants. No secrets here. */

export const PRO_PRICE_USD = 25;
export const TRIAL_DAYS = 7;
/** Conversions a free account may run each day (resets at midnight). */
export const FREE_DAILY_CONVERSIONS = 3;

/** Public PayPal identifiers — safe to ship to the browser. */
export const PAYPAL_CLIENT_ID =
  "BAAbc-PJADJsOORiMkSjm4VPRBtUDsLtRtHEC0aqFtkgB0wT8DlK8yWUUMO1P7xS0dpnwS6IwGpXc1IRE0";
export const PAYPAL_HOSTED_BUTTON_ID = "RZCSRGZ2XHQDQ";

/** Google AdSense publisher id — public by design. */
export const ADSENSE_CLIENT = "ca-pub-6924309930283819";

export type Entitlement = {
  isPro: boolean;
  isAdmin: boolean;
  plan: "free" | "pro";
  status: "none" | "trialing" | "active" | "past_due" | "cancelled" | "expired";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  trialUsed: boolean;
  usedToday: number;
  dailyLimit: number | null;
  remaining: number | null;
};

export const PRO_FEATURES = [
  "Unlimited PDF & document conversions",
  "OCR in 20+ languages for scanned documents",
  "Batch merge, split and image export",
  "Every output saved to your file library with version history",
  "Unlimited AI assistance across all modules",
  "Ad-free workspace",
  "Priority processing and support",
] as const;
