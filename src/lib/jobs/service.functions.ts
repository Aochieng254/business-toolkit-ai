import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_DAILY_CONVERSIONS } from "@/lib/billing/plans";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const TOOL_IDS = [
  "pdf-to-word",
  "word-to-pdf",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "pdf-to-image",
  "pdf-split",
  "pdf-merge",
  "pdf-to-publisher",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

/** Tools that are Pro-only once the daily free allowance is spent. */
const startSchema = z.object({
  tool: z.enum(TOOL_IDS),
  sourceName: z.string().trim().min(1).max(300),
  sourceSize: z.number().int().min(0).max(2_000_000_000).optional(),
  pageCount: z.number().int().min(0).max(10_000).optional(),
  ocrLanguage: z.string().trim().max(40).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Opens a conversion job after checking entitlement server-side.
 * Rows are only writable by service_role, so the free-tier counter cannot be
 * altered from the browser.
 */
export const startConversionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof startSchema>) => startSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const [{ data: roles }, { data: sub }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", context.userId),
      supabase.from("subscriptions").select("plan, status, trial_ends_at, current_period_end").eq("user_id", context.userId).maybeSingle(),
    ]);
    const now = Date.now();
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    const trialing = sub?.status === "trialing" && sub?.trial_ends_at && new Date(sub.trial_ends_at).getTime() > now;
    const active = sub?.status === "active" && (!sub?.current_period_end || new Date(sub.current_period_end).getTime() > now);
    const isPro = Boolean(isAdmin || ((trialing || active) && sub?.plan === "pro"));
    const used = await countConversionsToday(supabase, context.userId);


    if (!isPro && used >= FREE_DAILY_CONVERSIONS) {
      throw new Error(
        `You have used all ${FREE_DAILY_CONVERSIONS} free conversions for today. Upgrade to Pro for unlimited conversions, or try again tomorrow.`,
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("conversion_jobs")
      .insert({
        user_id: context.userId,
        tool: data.tool,
        source_name: data.sourceName,
        source_size_bytes: data.sourceSize ?? 0,
        page_count: data.pageCount ?? null,
        ocr_language: data.ocrLanguage ?? null,
        options: (data.options ?? {}) as never,
        status: "running",
        counted_against_quota: !isPro,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return {
      jobId: job.id as string,
      isPro: Boolean(isPro),
      remaining: isPro ? null : Math.max(0, FREE_DAILY_CONVERSIONS - used - 1),
    };
  });

const progressSchema = z.object({
  jobId: z.string().uuid(),
  progress: z.number().int().min(0).max(100),
  stage: z.string().trim().max(120).optional(),
});

export const updateJobProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof progressSchema>) => progressSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("conversion_jobs")
      .update({ progress: data.progress, stage: data.stage ?? null })
      .eq("id", data.jobId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

const finishSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["done", "error", "cancelled"]),
  outputFileId: z.string().uuid().nullable().optional(),
  outputName: z.string().trim().max(300).nullable().optional(),
  outputSize: z.number().int().min(0).nullable().optional(),
  error: z.string().trim().max(500).nullable().optional(),
});

export const finishConversionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof finishSchema>) => finishSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("conversion_jobs")
      .update({
        status: data.status,
        progress: data.status === "done" ? 100 : undefined,
        output_file_id: data.outputFileId ?? null,
        output_name: data.outputName ?? null,
        output_size_bytes: data.outputSize ?? null,
        error: data.error ?? null,
        finished_at: new Date().toISOString(),
        // A failed conversion must not burn a free credit.
        counted_against_quota: data.status === "done" ? undefined : false,
      })
      .eq("id", data.jobId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("conversion_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    return (data ?? []) as any[];
  });
