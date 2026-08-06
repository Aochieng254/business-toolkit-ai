import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Verify the caller holds the admin role using their own RLS-scoped client. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}


export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [users, jobs, jobs30, proSubs, trialSubs, aiCalls, files] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("conversion_jobs").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("conversion_jobs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      supabaseAdmin
        .from("subscriptions")
        .select("id:user_id", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("subscriptions")
        .select("id:user_id", { count: "exact", head: true })
        .eq("status", "trialing"),
      supabaseAdmin.from("ai_usage_log").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("files").select("id", { count: "exact", head: true }).eq("is_trashed", false),
    ]);

    return {
      totalUsers: users.count ?? 0,
      totalJobs: jobs.count ?? 0,
      jobs30d: jobs30.count ?? 0,
      activeSubscribers: proSubs.count ?? 0,
      trialing: trialSubs.count ?? 0,
      aiCalls30d: aiCalls.count ?? 0,
      storedFiles: files.count ?? 0,
      mrrUsd: (proSubs.count ?? 0) * 25,
    };
  });

const pageSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  search: z.string().trim().max(120).optional(),
});

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof pageSchema>) => pageSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.search) q = q.ilike("email", `%${data.search}%`);
    const { data: profiles } = await q;
    const ids = (profiles ?? []).map((p: any) => p.id);
    if (ids.length === 0) return [];

    const [{ data: subs }, { data: roles }, { data: jobs }] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("*").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("conversion_jobs").select("user_id").in("user_id", ids),
    ]);

    const jobCount = new Map<string, number>();
    for (const j of jobs ?? []) jobCount.set(j.user_id, (jobCount.get(j.user_id) ?? 0) + 1);

    return (profiles ?? []).map((p: any) => ({
      ...p,
      subscription: (subs ?? []).find((s: any) => s.user_id === p.id) ?? null,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      conversions: jobCount.get(p.id) ?? 0,
    }));
  });

const logSchema = z.object({
  kind: z.enum(["conversions", "ai", "files", "billing"]),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listAdminLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof logSchema>) => logSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data.limit ?? 60;

    const table =
      data.kind === "conversions"
        ? "conversion_jobs"
        : data.kind === "ai"
          ? "ai_usage_log"
          : data.kind === "files"
            ? "file_activity"
            : "billing_events";

    const { data: rows } = await supabaseAdmin
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    const ids = [...new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, email").in("id", ids)
      : { data: [] as any[] };
    const emails = new Map((profiles ?? []).map((p: any) => [p.id, p.email]));

    return (rows ?? []).map((r: any) => ({ ...r, user_email: emails.get(r.user_id) ?? null }));
  });

const grantSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["grant_pro", "revoke_pro"]),
});

/** Manual entitlement override for support cases. Admin-only. */
export const setUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof grantSchema>) => grantSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const grant = data.action === "grant_pro";
    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: data.userId,
        plan: grant ? "pro" : "free",
        status: grant ? "active" : "cancelled",
        current_period_end: grant
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("billing_events").insert({
      provider: "manual",
      event_id: `admin:${data.action}:${data.userId}:${Date.now()}`,
      event_type: `admin.${data.action}`,
      user_id: data.userId,
      verified: true,
      payload: { by: context.userId } as never,
    });
    return { ok: true };
  });
