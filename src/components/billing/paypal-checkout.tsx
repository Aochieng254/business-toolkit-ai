import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYPAL_CLIENT_ID, PAYPAL_HOSTED_BUTTON_ID, PRO_PRICE_USD } from "@/lib/billing/plans";
import { linkPaypalSubscription } from "@/lib/billing/service.functions";

declare global {
  interface Window {
    paypal?: {
      HostedButtons: (opts: { hostedButtonId: string }) => { render: (sel: string) => Promise<void> };
    };
  }
}

const SDK_SRC = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&components=hosted-buttons&disable-funding=venmo&currency=USD`;

function loadPaypalSdk(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (window.paypal?.HostedButtons) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-paypal="1"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("PayPal SDK failed to load")));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.dataset.paypal = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal SDK failed to load"));
    document.head.appendChild(s);
  });
}

/**
 * PayPal hosted-button checkout for Pro. The browser never decides plan state:
 * after paying, the subscription id is verified server-side against PayPal
 * before the account is upgraded (the webhook does the same for renewals).
 */
export function PaypalCheckout({ onLinked }: { onLinked?: () => void | Promise<void> }) {
  const containerId = `paypal-container-${PAYPAL_HOSTED_BUTTON_ID}`;
  const rendered = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [subId, setSubId] = useState("");
  const [linking, setLinking] = useState(false);
  const link = useServerFn(linkPaypalSubscription);

  useEffect(() => {
    if (rendered.current) return;
    rendered.current = true;
    let cancelled = false;
    loadPaypalSdk()
      .then(() => {
        if (cancelled || !window.paypal?.HostedButtons) throw new Error("unavailable");
        return window.paypal
          .HostedButtons({ hostedButtonId: PAYPAL_HOSTED_BUTTON_ID })
          .render(`#${containerId}`);
      })
      .then(() => !cancelled && setStatus("ready"))
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [containerId]);

  async function onLink() {
    setLinking(true);
    try {
      await link({ data: { subscriptionId: subId.trim() } });
      toast.success("Pro is now active on your account.");
      setSubId("");
      await onLinked?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not verify that subscription.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Pay with PayPal — ${PRO_PRICE_USD}/month
      </div>

      <div id={containerId} className="min-h-[52px]" />

      {status === "loading" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading secure PayPal checkout…
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive">
          PayPal checkout could not load. Disable any ad/script blocker and refresh the page.
        </p>
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <Label htmlFor="paypal-sub-id" className="text-xs">
          Already paid? Paste your PayPal subscription ID to activate Pro
        </Label>
        <div className="flex gap-2">
          <Input
            id="paypal-sub-id"
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            placeholder="I-XXXXXXXXXXXX"
            autoComplete="off"
          />
          <Button onClick={onLink} disabled={linking || subId.trim().length < 6}>
            {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Activate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We confirm the payment directly with PayPal before unlocking Pro, so an ID that isn&apos;t
          paid — or already used on another account — is rejected.
        </p>
      </div>
    </div>
  );
}
