import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGateway, DEFAULT_MODEL, FREE_DAILY_LIMIT } from "./gateway.server";
import { ACTION_PROMPTS, buildSystemPrompt, MODULE_PROMPTS } from "./prompts";
import type { AiAction, ModulePromptKey } from "./prompts";

async function assertQuota(context: {
  supabase: ReturnType<typeof Object>;
  userId: string;
}) {
  const supabase = context.supabase as any;
  // Admins get unlimited (treated as premium).
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const isPremium = (roles ?? []).some(
    (r: { role: string }) => r.role === "admin",
  );
  if (isPremium) return { isPremium: true, used: 0, limit: null as number | null };

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .eq("status", "ok")
    .gte("created_at", since.toISOString());
  const used = count ?? 0;
  if (used >= FREE_DAILY_LIMIT) {
    throw new Error(
      `Daily AI limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Premium for unlimited use.`,
    );
  }
  return { isPremium: false, used, limit: FREE_DAILY_LIMIT };
}

async function logUsage(
  supabase: any,
  userId: string,
  fields: {
    action: string;
    model: string;
    tokens_in?: number;
    tokens_out?: number;
    latency_ms?: number;
    status?: string;
    error?: string;
  },
) {
  await supabase.from("ai_usage_log").insert({
    user_id: userId,
    action: fields.action,
    model: fields.model,
    tokens_in: fields.tokens_in ?? 0,
    tokens_out: fields.tokens_out ?? 0,
    latency_ms: fields.latency_ms ?? null,
    status: fields.status ?? "ok",
    error: fields.error ?? null,
  });
}

const RunActionInput = z.object({
  action: z.string(),
  text: z.string().min(1).max(8000),
  targetLanguage: z.string().optional(),
});

/** Run a reusable AI action on a piece of text. */
export const runAiAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RunActionInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertQuota({ supabase, userId });

    const { data: prefs } = await supabase
      .from("ai_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const model = prefs?.preferred_model ?? DEFAULT_MODEL;

    const action = data.action as AiAction;
    const base = ACTION_PROMPTS[action] ?? ACTION_PROMPTS.improve;
    const system = buildSystemPrompt(base, {
      tone: prefs?.tone as any,
      length: prefs?.response_length as any,
      language: prefs?.language,
    });

    const started = Date.now();
    const gateway = createLovableAiGateway();
    try {
      const userPrompt =
        action === "translate" && data.targetLanguage
          ? `Target language: ${data.targetLanguage}\n\n${data.text}`
          : data.text;
      const result = await generateText({
        model: gateway(model),
        system,
        prompt: userPrompt,
        temperature: Math.max(0, Math.min(1, prefs?.creativity ?? 0.7)),
      });
      const usage = result.usage as { inputTokens?: number; outputTokens?: number } | undefined;
      await logUsage(supabase, userId, {
        action,
        model,
        tokens_in: usage?.inputTokens ?? 0,
        tokens_out: usage?.outputTokens ?? 0,
        latency_ms: Date.now() - started,
      });
      return { text: result.text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logUsage(supabase, userId, {
        action,
        model,
        latency_ms: Date.now() - started,
        status: "error",
        error: msg.slice(0, 500),
      });
      throw new Error(msg);
    }
  });

const GenerateInput = z.object({
  promptKey: z.string(),
  input: z.string().min(1).max(8000),
});

/** Generate content using a named template from the prompt library. */
export const generateFromTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GenerateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertQuota({ supabase, userId });

    const { data: prefs } = await supabase
      .from("ai_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const model = prefs?.preferred_model ?? DEFAULT_MODEL;

    const key = data.promptKey as ModulePromptKey;
    const base = MODULE_PROMPTS[key] ?? MODULE_PROMPTS.assistant;
    const system = buildSystemPrompt(base, {
      tone: prefs?.tone,
      length: prefs?.response_length,
      language: prefs?.language,
    });

    const started = Date.now();
    const gateway = createLovableAiGateway();
    try {
      const result = await generateText({
        model: gateway(model),
        system,
        prompt: data.input,
        temperature: Math.max(0, Math.min(1, prefs?.creativity ?? 0.7)),
      });
      const usage = result.usage as { inputTokens?: number; outputTokens?: number } | undefined;
      await logUsage(supabase, userId, {
        action: `template:${key}`,
        model,
        tokens_in: usage?.inputTokens ?? 0,
        tokens_out: usage?.outputTokens ?? 0,
        latency_ms: Date.now() - started,
      });
      return { text: result.text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logUsage(supabase, userId, {
        action: `template:${key}`,
        model,
        latency_ms: Date.now() - started,
        status: "error",
        error: msg.slice(0, 500),
      });
      throw new Error(msg);
    }
  });

/** Get current user's usage stats & premium status. */
export const getAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isPremium = (roles ?? []).some((r: any) => r.role === "admin");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count: dailyUsed } = await supabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "ok")
      .gte("created_at", today.toISOString());

    const { data: monthlyRows } = await supabase
      .from("ai_usage_log")
      .select("tokens_in, tokens_out")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());
    const monthlyTokens = (monthlyRows ?? []).reduce(
      (a: number, r: any) => a + (r.tokens_in ?? 0) + (r.tokens_out ?? 0),
      0,
    );

    return {
      isPremium,
      dailyUsed: dailyUsed ?? 0,
      dailyLimit: isPremium ? null : FREE_DAILY_LIMIT,
      monthlyRequests: monthlyRows?.length ?? 0,
      monthlyTokens,
    };
  });

/** Admin analytics — total usage across all users. */
export const getAdminAiStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden");

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: rows } = await supabase
      .from("ai_usage_log")
      .select("user_id, action, model, tokens_in, tokens_out, status, created_at")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    const list = rows ?? [];
    const totalRequests = list.length;
    const totalTokens = list.reduce(
      (a: number, r: any) => a + (r.tokens_in ?? 0) + (r.tokens_out ?? 0),
      0,
    );
    const errorCount = list.filter((r: any) => r.status !== "ok").length;
    const uniqueUsers = new Set(list.map((r: any) => r.user_id)).size;
    const actionCounts: Record<string, number> = {};
    list.forEach((r: any) => {
      actionCounts[r.action] = (actionCounts[r.action] ?? 0) + 1;
    });

    return {
      totalRequests,
      totalTokens,
      errorCount,
      uniqueUsers,
      topActions: Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([action, count]) => ({ action, count })),
      recent: list.slice(0, 20),
    };
  });
