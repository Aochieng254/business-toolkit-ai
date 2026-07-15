import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Placeholder button for the future AI content assistant.
 * Wired in Phase 3 — for now shows a toast so users know it's coming.
 */
export function ImproveWithAIButton({ label = "Improve with AI" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
      onClick={() =>
        toast.info("AI writing assistant arrives in Phase 3", {
          description: "This will polish your text with one click.",
        })
      }
    >
      <Sparkles className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
