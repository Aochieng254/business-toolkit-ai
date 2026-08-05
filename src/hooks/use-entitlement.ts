import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getEntitlement } from "@/lib/billing/service.functions";
import type { Entitlement } from "@/lib/billing/plans";

/** Reads the server-authoritative plan state. Never trust this for enforcement. */
export function useEntitlement() {
  const fetchEntitlement = useServerFn(getEntitlement);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    return fetchEntitlement()
      .then((e) => setEntitlement(e as Entitlement))
      .catch(() => setEntitlement(null))
      .finally(() => setLoading(false));
  }, [fetchEntitlement]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entitlement, loading, refresh, isPro: entitlement?.isPro ?? false };
}
