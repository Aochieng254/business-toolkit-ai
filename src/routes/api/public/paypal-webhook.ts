import { createFileRoute } from "@tanstack/react-router";

/**
 * PayPal webhook. Public route (PayPal must reach it unauthenticated) but every
 * delivery is signature-verified with PayPal before anything is written, and
 * each event id is stored once so a captured payload cannot be replayed.
 */
export const Route = createFileRoute("/api/public/paypal-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 200_000) return new Response("Payload too large", { status: 413 });

        const { verifyPaypalWebhook } = await import("@/lib/billing/paypal.server");
        const verified = await verifyPaypalWebhook(request.headers, raw);
        if (!verified) return new Response("Invalid signature", { status: 401 });

        let event: {
          id?: string;
          event_type?: string;
          resource?: { id?: string; status?: string; billing_info?: { next_billing_time?: string } };
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        if (!event.id || !event.event_type) return new Response("Bad payload", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const resourceId = event.resource?.id ?? null;

        // Replay protection: unique (provider, event_id).
        const { error: dupe } = await supabaseAdmin.from("billing_events").insert({
          event_id: event.id,
          event_type: event.event_type,
          resource_id: resourceId,
          verified: true,
          payload: event as never,
        });
        if (dupe) return new Response("ok"); // already processed

        if (!resourceId) return new Response("ok");

        const map: Record<string, { status: string; plan: string } | undefined> = {
          "BILLING.SUBSCRIPTION.ACTIVATED": { status: "active", plan: "pro" },
          "BILLING.SUBSCRIPTION.RE-ACTIVATED": { status: "active", plan: "pro" },
          "BILLING.SUBSCRIPTION.UPDATED": { status: "active", plan: "pro" },
          "PAYMENT.SALE.COMPLETED": { status: "active", plan: "pro" },
          "BILLING.SUBSCRIPTION.SUSPENDED": { status: "past_due", plan: "free" },
          "BILLING.SUBSCRIPTION.PAYMENT.FAILED": { status: "past_due", plan: "free" },
          "BILLING.SUBSCRIPTION.CANCELLED": { status: "cancelled", plan: "free" },
          "BILLING.SUBSCRIPTION.EXPIRED": { status: "expired", plan: "free" },
        };
        const next = map[event.event_type];
        if (!next) return new Response("ok");

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: next.status as never,
            plan: next.plan as never,
            current_period_end: event.resource?.billing_info?.next_billing_time ?? null,
          })
          .eq("paypal_subscription_id", resourceId);

        return new Response("ok");
      },
    },
  },
});
