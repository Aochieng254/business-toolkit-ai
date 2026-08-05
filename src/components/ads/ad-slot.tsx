import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/billing/plans";
import { useEntitlement } from "@/hooks/use-entitlement";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptLoaded = false;
function ensureAdsenseScript() {
  if (scriptLoaded || typeof document === "undefined") return;
  if (document.querySelector('script[data-adsense="1"]')) {
    scriptLoaded = true;
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.dataset.adsense = "1";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
  scriptLoaded = true;
}

/**
 * Advertising slot shown to free accounts only.
 * Pro subscribers and admins get an ad-free workspace.
 */
export function AdSlot({
  slot,
  format = "auto",
  className,
}: {
  slot?: string;
  format?: string;
  className?: string;
}) {
  const { isPro, loading } = useEntitlement();
  const pushed = useRef(false);

  useEffect(() => {
    if (loading || isPro || pushed.current) return;
    ensureAdsenseScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* ad blocker or not ready */
    }
  }, [isPro, loading]);

  if (loading || isPro) return null;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-dashed border-border/70", className)}>
      <p className="border-b border-border/60 bg-muted/40 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        Advertisement · upgrade to Pro to remove
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot ?? ""}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
