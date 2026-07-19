import { Sparkles } from "lucide-react";
import { AiActionsButton } from "@/components/ai/ai-actions-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Back-compat wrapper. If `value`/`onChange` are provided it dispatches real AI actions;
 * otherwise it prompts the user to focus a supported field.
 */
export function ImproveWithAIButton({
  label = "Improve with AI",
  value,
  onChange,
}: {
  label?: string;
  value?: string;
  onChange?: (next: string) => void;
}) {
  if (value !== undefined && onChange) {
    return <AiActionsButton value={value} onChange={onChange} label={label} />;
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
      onClick={() =>
        toast.info("Type something first, then use the AI menu on this field.")
      }
    >
      <Sparkles className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
