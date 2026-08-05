/**
 * Server-only PayPal REST helpers.
 * Never import this from a component or a *.functions.ts module scope.
 */

const LIVE = "https://api-m.paypal.com";
const SANDBOX = "https://api-m.sandbox.paypal.com";

function base(): string {
  return process.env["PAYPAL_ENV"] === "sandbox" ? SANDBOX : LIVE;
}

function credentials() {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  if (!clientId || !secret) {
    throw new Error("PayPal is not configured yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }
  return { clientId, secret };
}

export function paypalConfigured(): boolean {
  return Boolean(process.env["PAYPAL_CLIENT_ID"] && process.env["PAYPAL_CLIENT_SECRET"]);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function paypalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const { clientId, secret } = credentials();
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function paypalGet<T>(path: string): Promise<T> {
  const token = await paypalAccessToken();
  const res = await fetch(`${base()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`PayPal request failed (${res.status})`);
  return (await res.json()) as T;
}

export type PaypalSubscription = {
  id: string;
  status: string;
  plan_id?: string;
  subscriber?: { email_address?: string };
  billing_info?: { next_billing_time?: string };
  start_time?: string;
};

export function getPaypalSubscription(id: string) {
  return paypalGet<PaypalSubscription>(`/v1/billing/subscriptions/${encodeURIComponent(id)}`);
}

export type PaypalOrder = {
  id: string;
  status: string;
  payer?: { email_address?: string };
  purchase_units?: Array<{ amount?: { value?: string; currency_code?: string } }>;
};

export function getPaypalOrder(id: string) {
  return paypalGet<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(id)}`);
}

/**
 * Ask PayPal to verify a webhook signature. Returns false when anything is
 * missing or the signature does not match — never trust the payload otherwise.
 */
export async function verifyPaypalWebhook(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env["PAYPAL_WEBHOOK_ID"];
  if (!webhookId) return false;

  const required = {
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_time: headers.get("paypal-transmission-time"),
    cert_url: headers.get("paypal-cert-url"),
    auth_algo: headers.get("paypal-auth-algo"),
    transmission_sig: headers.get("paypal-transmission-sig"),
  };
  if (Object.values(required).some((v) => !v)) return false;

  // Only accept certificates served by PayPal itself.
  try {
    const host = new URL(required.cert_url!).hostname;
    if (!/(^|\.)paypal\.com$/i.test(host)) return false;
  } catch {
    return false;
  }

  const token = await paypalAccessToken();
  const res = await fetch(`${base()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...required, webhook_id: webhookId, webhook_event: JSON.parse(rawBody) }),
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS";
}
