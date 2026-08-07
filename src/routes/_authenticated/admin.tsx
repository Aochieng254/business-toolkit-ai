import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Users,
  Zap,
  CreditCard,
  FileStack,
  Search,
  Loader2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminAiStats } from "@/lib/ai/service.functions";
import {
  getAdminOverview,
  listAllUsers,
  listAdminLogs,
  setUserPlan,
} from "@/lib/admin/service.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Console · Business Toolkit AI" },
      {
        name: "description",
        content:
          "Owner console for Business Toolkit AI: platform metrics, subscriber management, conversion, AI, file and billing activity logs.",
      },
      { property: "og:title", content: "Admin Console · Business Toolkit AI" },
      { property: "og:description", content: "Platform metrics, subscribers and full activity logs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type LogKind = "conversions" | "ai" | "files" | "billing";

function AdminPage() {
  const fetchOverview = useServerFn(getAdminOverview);
  const fetchAi = useServerFn(getAdminAiStats);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getAdminOverview>> | null>(null);
  const [ai, setAi] = useState<Awaited<ReturnType<typeof getAdminAiStats>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    fetchAi().then(setAi).catch(() => undefined);
  }, [fetchOverview, fetchAi]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin console</h1>
          <p className="text-sm text-muted-foreground">
            Platform health, subscribers and every activity log.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Users" value={overview.totalUsers} />
          <Stat
            icon={<CreditCard className="h-4 w-4" />}
            label="Active subscribers"
            value={overview.activeSubscribers}
            hint={`${overview.trialing} on trial`}
          />
          <Stat
            icon={<DollarSign className="h-4 w-4" />}
            label="MRR"
            value={`$${overview.mrrUsd.toLocaleString()}`}
          />
          <Stat
            icon={<Activity className="h-4 w-4" />}
            label="Conversions"
            value={overview.totalJobs.toLocaleString()}
            hint={`${overview.jobs30d} in last 30 days`}
          />
          <Stat
            icon={<Zap className="h-4 w-4" />}
            label="AI calls (30d)"
            value={overview.aiCalls30d.toLocaleString()}
          />
          <Stat
            icon={<FileStack className="h-4 w-4" />}
            label="Stored files"
            value={overview.storedFiles.toLocaleString()}
          />
          <Stat
            icon={<Activity className="h-4 w-4" />}
            label="AI tokens (month)"
            value={(ai?.totalTokens ?? 0).toLocaleString()}
          />
          <Stat
            icon={<AlertTriangle className="h-4 w-4" />}
            label="AI errors"
            value={ai?.errorCount ?? 0}
          />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UsersPanel />
        </TabsContent>
        {(["conversions", "ai", "files", "billing"] as LogKind[]).map((kind) => (
          <TabsContent key={kind} value={kind} className="mt-4">
            <LogPanel kind={kind} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function UsersPanel() {
  const fetchUsers = useServerFn(listAllUsers);
  const changePlan = useServerFn(setUserPlan);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(
    (term: string) => {
      setLoading(true);
      fetchUsers({ data: { limit: 100, search: term || undefined } })
        .then((r) => setRows(r as any[]))
        .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load users"))
        .finally(() => setLoading(false));
    },
    [fetchUsers],
  );

  useEffect(() => {
    load("");
  }, [load]);

  async function togglePlan(userId: string, isPro: boolean) {
    setPending(userId);
    try {
      await changePlan({ data: { userId, action: isPro ? "revoke_pro" : "grant_pro" } });
      toast.success(isPro ? "Pro revoked" : "Pro granted");
      load(search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Users &amp; subscriptions</CardTitle>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(search);
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email"
            className="h-9 w-48"
          />
          <Button type="submit" size="sm" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Plan</th>
                  <th className="py-2 pr-3 font-medium">Conversions</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((u) => {
                  const status = u.subscription?.status ?? "none";
                  const isPro =
                    u.subscription?.plan === "pro" && ["active", "trialing"].includes(status);
                  return (
                    <tr key={u.id}>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{u.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={isPro ? "default" : "secondary"}>
                            {isPro ? "Pro" : "Free"}
                          </Badge>
                          {status !== "none" && (
                            <Badge variant="outline" className="text-xs">
                              {status}
                            </Badge>
                          )}
                          {u.roles?.includes("admin") && <Badge variant="outline">admin</Badge>}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{u.conversions}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant={isPro ? "outline" : "default"}
                          disabled={pending === u.id}
                          onClick={() => togglePlan(u.id, isPro)}
                        >
                          {pending === u.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          {isPro ? "Revoke Pro" : "Grant Pro"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LOG_TITLES: Record<LogKind, string> = {
  conversions: "Conversion jobs",
  ai: "AI requests",
  files: "File activity",
  billing: "Billing events",
};

function LogPanel({ kind }: { kind: LogKind }) {
  const fetchLogs = useServerFn(listAdminLogs);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLogs({ data: { kind, limit: 80 } })
      .then((r) => setRows(r as any[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load logs"))
      .finally(() => setLoading(false));
  }, [fetchLogs, kind]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{LOG_TITLES[kind]}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <div className="divide-y divide-border text-sm">
            {rows.map((r, i) => (
              <div key={r.id ?? i} className="flex items-start justify-between gap-4 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        r.status === "failed" || r.status === "error" || r.verified === false
                          ? "bg-destructive"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span className="truncate font-medium">{logLabel(kind, r)}</span>
                  </div>
                  <div className="truncate pl-4 text-xs text-muted-foreground">
                    {r.user_email ?? "system"}
                    {logDetail(kind, r) ? ` · ${logDetail(kind, r)}` : ""}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function logLabel(kind: LogKind, r: any) {
  if (kind === "conversions") return r.tool ?? r.job_type ?? "conversion";
  if (kind === "ai") return r.action ?? "ai";
  if (kind === "files") return r.action ?? "file";
  return r.event_type ?? "billing";
}

function logDetail(kind: LogKind, r: any) {
  if (kind === "conversions")
    return [r.status, r.source_name].filter(Boolean).join(" · ");
  if (kind === "ai") return `${(r.tokens_in ?? 0) + (r.tokens_out ?? 0)} tokens · ${r.status ?? ""}`;
  if (kind === "files") return r.detail ?? r.file_id ?? "";
  return [r.provider, r.verified ? "verified" : "unverified"].filter(Boolean).join(" · ");
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
