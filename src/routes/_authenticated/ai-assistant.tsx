import { createFileRoute } from "@tanstack/react-router";
import { Bot, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  component: AiAssistantPage,
});

function AiAssistantPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Your business copilot — powered by Lovable AI.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" /> How to use it
        </div>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Tap the floating assistant button in the bottom-right anywhere in the app.</li>
          <li>• Ask it to draft invoice notes, quotation intros, receipt lines, or business advice.</li>
          <li>• Use the AI menu on any Notes / Description field to Improve, Rewrite, Shorten, Expand, or change tone.</li>
          <li>• Configure tone, creativity, response length and language in Settings.</li>
        </ul>
      </div>
    </div>
  );
}
