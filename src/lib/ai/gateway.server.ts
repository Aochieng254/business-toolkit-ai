import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Server-only helper that builds a Lovable AI Gateway provider.
 * Reads LOVABLE_API_KEY at call time.
 */
export function createLovableAiGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const DEFAULT_MODEL = "google/gemini-2.5-flash";
export const FREE_DAILY_LIMIT = 20;
