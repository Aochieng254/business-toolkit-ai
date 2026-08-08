import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Crown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEntitlement } from "@/hooks/use-entitlement";
import {
  FREE_DAILY_CONVERSIONS,
  PRO_FEATURES,
  PRO_PRICE_USD,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { startFreeTrial, refreshSubscription } from "@/lib/billing/service.functions";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
  head: () => ({
    meta: [
      { title: "Subscription & Billing · Business Toolkit AI" },
      {
        name: "description",
        content:
          "Manage your Business Toolkit AI plan: 5 free conversions a day, or go Pro for $25/month with unlimited AI, OCR and document tools.",
      },
      { property: "og:title", content: "Subscription & Billing · Business Toolkit AI" },
      {
        property: "og:description",
        content: "5 free conversions daily, or unlimited Pro for $25/month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SubscriptionPage() {
  const { entitlement, loading, refresh, isPro } = useEntitlement();
  const trial = useServerFn(startFreeTrial);
  const recheck = useServerFn(refreshSubscription);
  const [busy, setBusy] = useState<"trial" | "refresh" | null>(null);

  const used = entitlement?.usedToday ?? 0;
  const limit = entitlement?.dailyLimit ?? FREE_DAILY_CONVERSIONS;
  const remaining = entitlement?.remaining ?? Math.max(0, limit - used);
  const exhausted = !isPro && remaining <= 0;

  async function onStartTrial() {
    setBusy("trial");
    try {
      await trial();
      toast.success(`Your ${TRIAL_DAYS}-day Pro trial has started.`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the trial.");
    } finally {
      setBusy(null);
    }
  }

  async function onRefresh() {
    setBusy("refresh");
    try {
      await recheck();
      await refresh();
      toast.success("Billing status updated.");
    } catch {
      toast.error("Could not refresh billing status.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">
          Every account gets {FREE_DAILY_CONVERSIONS} free uses per day. After that, Pro keeps you
          working without limits.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              Current plan
              <Badge variant={isPro ? "default" : "secondary"}>
                {loading ? "…" : isPro ? "Pro" : "Free"}
              </Badge>
            </CardTitle>
            <CardDescription>
              {entitlement?.status === "trialing" && entitlement.trialEndsAt
                ? `Trial ends ${formatDate(entitlement.trialEndsAt)}`
                : entitlement?.currentPeriodEnd
                  ? `Renews ${formatDate(entitlement.currentPeriodEnd)}`
                  : `${FREE_DAILY_CONVERSIONS} free uses per day`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy !== null}>
            {busy === "refresh" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPro ? (
            <p className="text-sm text-muted-foreground">
              Unlimited conversions and AI actions are active on this account.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>Today&apos;s usage</span>
                <span className="font-medium">
                  {used} / {limit}
                </span>
              </div>
              <Progress value={limit ? Math.min(100, (used / limit) * 100) : 0} />
              <p className="text-sm text-muted-foreground">
                {exhausted
                  ? "You've used all your free uses for today. Upgrade to continue now, or wait for the daily reset."
                  : `${remaining} free ${remaining === 1 ? "use" : "uses"} left today.`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={exhausted ? "border-primary" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Pro
          </CardTitle>
          <CardDescription>
            <span className="text-3xl font-bold text-foreground">${PRO_PRICE_USD}</span>
            <span className="text-muted-foreground"> / month</span>
            {" · "}
            {TRIAL_DAYS}-day free trial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ul className="grid gap-2 sm:grid-cols-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          {!isPro && (
            <div className="space-y-4">
              <Button
                className="w-full sm:w-auto"
                onClick={onStartTrial}
                disabled={busy !== null || entitlement?.trialUsed}
              >
                {busy === "trial" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {entitlement?.trialUsed
                  ? "Free trial already used"
                  : `Start ${TRIAL_DAYS}-day free trial`}
              </Button>
              <p className="text-xs text-muted-foreground">
                Card-free trial. When it ends, subscribe below to keep Pro running.
              </p>
              <PaypalCheckout onLinked={refresh} />
            </div>
          )}
        </CardContent>
      </Card>

      {!isPro && <AdSlot className="mt-2" />}

    </div>
  );
}
