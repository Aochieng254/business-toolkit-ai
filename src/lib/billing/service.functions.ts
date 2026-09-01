import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_DAILY_CONVERSIONS, TRIAL_DAYS, type Entitlement } from "./plans";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Counts today's quota-consuming conversions with the caller's RLS-scoped client. */
export async function countConversionsToday(supabase: any, userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("conversion_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("counted_against_quota", true)
    .in("status", ["queued", "running", "done"])
    .gte("created_at", startOfDay.toISOString());
  return Number(count ?? 0);
}

async function readEntitlement(supabase: any, userId: string): Promise<Entitlement> {
  const [{ data: sub }, { data: roles }, usedToday] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    countConversionsToday(supabase, userId),
  ]);


  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
  const now = Date.now();
  const trialing =
    sub?.status === "trialing" && sub?.trial_ends_at && new Date(sub.trial_ends_at).getTime() > now;
  const active =
    sub?.status === "active" &&
    (!sub?.current_period_end || new Date(sub.current_period_end).getTime() > now);
  const isPro = Boolean(isAdmin || ((trialing || active) && sub?.plan === "pro"));
  const used = Number(usedToday ?? 0);

  return {
    isPro,
    isAdmin,
    plan: isPro ? "pro" : "free",
    status: (sub?.status ?? "none") as Entitlement["status"],
    trialEndsAt: sub?.trial_ends_at ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    trialUsed: Boolean(sub?.trial_started_at),
    usedToday: used,
    dailyLimit: isPro ? null : FREE_DAILY_CONVERSIONS,
    remaining: isPro ? null : Math.max(0, FREE_DAILY_CONVERSIONS - used),
  };
}

/** Authoritative entitlement for the signed-in user. */
export const getEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readEntitlement(context.supabase, context.userId));

/** Start the one-time 7-day Pro trial. Refuses a second trial. */
export const startFreeTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("trial_started_at, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing?.trial_started_at) throw new Error("Your free trial has already been used.");
    if (existing?.status === "active") throw new Error("You already have an active Pro subscription.");

    const started = new Date();
    const ends = new Date(started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: context.userId,
        plan: "pro",
        status: "trialing",
        trial_started_at: started.toISOString(),
        trial_ends_at: ends.toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      type: "success",
      title: "Your 7-day Pro trial has started",
      body: `Enjoy unlimited conversions and all Pro features until ${ends.toLocaleDateString()}.`,
      link: "/subscription",
    });
    return readEntitlement(context.supabase, context.userId);
  });

/**
 * Bind a PayPal subscription to the signed-in account.
 * The subscription is fetched straight from PayPal — the browser can only
 * supply an id, never a status — and an id already claimed by another
 * account is rejected.
 */
export const linkPaypalSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string }) =>
    z.object({ subscriptionId: z.string().trim().min(6).max(64).regex(/^[A-Za-z0-9-]+$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getPaypalSubscription } = await import("./paypal.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: claimed } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("paypal_subscription_id", data.subscriptionId)
      .maybeSingle();
    if (claimed && claimed.user_id !== context.userId) {
      throw new Error("That PayPal subscription is already linked to another account.");
    }

    const sub = await getPaypalSubscription(data.subscriptionId);
    const ok = ["ACTIVE", "APPROVED"].includes(sub.status);
    if (!ok) throw new Error(`PayPal reports this subscription as ${sub.status}.`);

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: context.userId,
        plan: "pro",
        status: "active",
        paypal_subscription_id: sub.id,
        paypal_payer_email: sub.subscriber?.email_address ?? null,
        current_period_end: sub.billing_info?.next_billing_time ?? null,
        cancel_at_period_end: false,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("billing_events").insert({
      event_id: `link:${sub.id}:${Date.now()}`,
      event_type: "subscription.linked",
      resource_id: sub.id,
      user_id: context.userId,
      verified: true,
      payload: { status: sub.status } as never,
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      type: "success",
      title: "Welcome to Pro",
      body: "Your PayPal subscription is active. All limits have been lifted.",
      link: "/subscription",
    });

    return readEntitlement(context.supabase, context.userId);
  });

/** Re-check PayPal for the latest state of the linked subscription. */
export const refreshSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("subscriptions")
      .select("paypal_subscription_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (row?.paypal_subscription_id) {
      const { getPaypalSubscription } = await import("./paypal.server");
      try {
        const sub = await getPaypalSubscription(row.paypal_subscription_id);
        const status =
          sub.status === "ACTIVE"
            ? "active"
            : sub.status === "SUSPENDED"
              ? "past_due"
              : sub.status === "CANCELLED"
                ? "cancelled"
                : "expired";
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status,
            plan: status === "active" ? "pro" : "free",
            current_period_end: sub.billing_info?.next_billing_time ?? null,
          })
          .eq("user_id", context.userId);
      } catch {
        /* leave the stored state alone if PayPal is unreachable */
      }
    }
    return readEntitlement(context.supabase, context.userId);
  });
