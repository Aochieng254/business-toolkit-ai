import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createLovableAiGateway, DEFAULT_MODEL, FREE_DAILY_LIMIT } from "@/lib/ai/gateway.server";
import { buildSystemPrompt, MODULE_PROMPTS } from "@/lib/ai/prompts";

/**
 * Streaming AI chat endpoint. Requires an authenticated Supabase user.
 * Enforces daily quota (admins unlimited), logs usage.
 */
export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: { persistSession: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );
        const { data: userData } = await supabase.auth.getUser(token);
        const user = userData?.user;
        if (!user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as {
          messages: UIMessage[];
          conversationId?: string;
          pageContext?: string;
        };

        // Quota
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const isPremium = (roles ?? []).some((r) => r.role === "admin");
        if (!isPremium) {
          const since = new Date();
          since.setHours(0, 0, 0, 0);
          const { count } = await supabase
            .from("ai_usage_log")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "ok")
            .gte("created_at", since.toISOString());
          if ((count ?? 0) >= FREE_DAILY_LIMIT) {
            return new Response(
              `Daily AI limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Premium for unlimited use.`,
              { status: 429 },
            );
          }
        }

        const { data: prefs } = await supabase
          .from("ai_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        const model = prefs?.preferred_model ?? DEFAULT_MODEL;

        // Give the assistant lightweight awareness of the user's recent files
        const { data: recentFiles } = await supabase
          .from("files")
          .select("name, extension, size_bytes, updated_at")
          .eq("user_id", user.id)
          .eq("is_trashed", false)
          .order("updated_at", { ascending: false })
          .limit(15);
        const filesContext = recentFiles && recentFiles.length
          ? `\nThe user's recent files (name · type · updated):\n` +
            recentFiles.map((f) => `- ${f.name} · ${(f.extension ?? "file").toUpperCase()} · ${new Date(f.updated_at as string).toLocaleDateString()}`).join("\n") +
            `\nYou can reference these by name. Full document analysis is not enabled yet.`
          : "";

        const base =
          MODULE_PROMPTS.assistant +
          (body.pageContext ? `\nThe user is currently on: ${body.pageContext}.` : "") +
          filesContext;
        const system = buildSystemPrompt(base, {
          tone: prefs?.tone as any,
          length: prefs?.response_length as any,
          language: prefs?.language,
        });


        const gateway = createLovableAiGateway();
        const started = Date.now();

        try {
          const result = streamText({
            model: gateway(model),
            system,
            messages: await convertToModelMessages(body.messages),
            temperature: Math.max(0, Math.min(1, prefs?.creativity ?? 0.7)),
            onFinish: async ({ usage, text }) => {
              await supabase.from("ai_usage_log").insert({
                user_id: user.id,
                action: "assistant.chat",
                model,
                tokens_in: usage?.inputTokens ?? 0,
                tokens_out: usage?.outputTokens ?? 0,
                latency_ms: Date.now() - started,
                status: "ok",
              });
              // Persist last user message + assistant response if conversation supplied
              if (body.conversationId) {
                const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
                const userText =
                  lastUser?.parts
                    ?.map((p: any) => (p.type === "text" ? p.text : ""))
                    .join("") ?? "";
                if (userText) {
                  await supabase.from("ai_messages").insert({
                    conversation_id: body.conversationId,
                    user_id: user.id,
                    role: "user",
                    content: userText,
                  });
                }
                await supabase.from("ai_messages").insert({
                  conversation_id: body.conversationId,
                  user_id: user.id,
                  role: "assistant",
                  content: text,
                  tokens_in: usage?.inputTokens ?? 0,
                  tokens_out: usage?.outputTokens ?? 0,
                });
                await supabase
                  .from("ai_conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", body.conversationId);
              }
            },
          });
          return result.toUIMessageStreamResponse({
            originalMessages: body.messages,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await supabase.from("ai_usage_log").insert({
            user_id: user.id,
            action: "assistant.chat",
            model,
            latency_ms: Date.now() - started,
            status: "error",
            error: msg.slice(0, 500),
          });
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
