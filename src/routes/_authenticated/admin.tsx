import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShieldCheck, Activity, AlertTriangle, Users, Zap } from "lucide-react";
import { getAdminAiStats } from "@/lib/ai/service.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const fetchStats = useServerFn(getAdminAiStats);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminAiStats>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [fetchStats]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin — AI Analytics</h1>
          <p className="text-sm text-muted-foreground">Usage across all users (this month).</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Activity className="h-4 w-4" />} label="Requests" value={stats.totalRequests} />
            <Stat icon={<Zap className="h-4 w-4" />} label="Tokens" value={stats.totalTokens.toLocaleString()} />
            <Stat icon={<Users className="h-4 w-4" />} label="Active users" value={stats.uniqueUsers} />
            <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Errors" value={stats.errorCount} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-medium">Top actions</h2>
            <div className="mt-3 space-y-2">
              {stats.topActions.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {stats.topActions.map((a) => (
                <div key={a.action} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{a.action}</span>
                  <span className="font-medium">{a.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-medium">Recent calls</h2>
            <div className="mt-3 divide-y divide-border text-sm">
              {stats.recent.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${r.status === "ok" ? "bg-emerald-500" : "bg-destructive"}`} />
                    <span className="font-mono text-xs">{r.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(r.tokens_in ?? 0) + (r.tokens_out ?? 0)} tok · {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
