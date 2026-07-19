import { useState } from "react";
import { Sparkles, Wand2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { runAiAction } from "@/lib/ai/service.functions";
import type { AiAction } from "@/lib/ai/prompts";

const ACTIONS: { key: AiAction; label: string }[] = [
  { key: "improve", label: "Improve" },
  { key: "rewrite", label: "Rewrite" },
  { key: "shorten", label: "Shorten" },
  { key: "expand", label: "Expand" },
  { key: "summarize", label: "Summarize" },
  { key: "explain", label: "Explain" },
  { key: "tone-professional", label: "Professional tone" },
  { key: "tone-friendly", label: "Friendly tone" },
  { key: "tone-formal", label: "Formal tone" },
];

interface Props {
  /** Current field text. */
  value: string;
  /** Called with new text after the AI action completes. */
  onChange: (next: string) => void;
  /** Compact label next to the sparkle icon. */
  label?: string;
  /** Only enable these actions (default: all). */
  actions?: AiAction[];
}

export function AiActionsButton({ value, onChange, label = "AI", actions }: Props) {
  const [busy, setBusy] = useState<AiAction | null>(null);
  const run = useServerFn(runAiAction);
  const enabled = actions
    ? ACTIONS.filter((a) => actions.includes(a.key))
    : ACTIONS;

  const handle = async (action: AiAction) => {
    if (!value.trim()) {
      toast.info("Add some text first, then the AI can polish it.");
      return;
    }
    setBusy(action);
    try {
      const res = await run({ data: { action, text: value } });
      onChange(res.text.trim());
      toast.success("Updated with AI");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
          disabled={busy !== null}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <Wand2 className="h-3.5 w-3.5" /> AI actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {enabled.map((a) => (
          <DropdownMenuItem
            key={a.key}
            disabled={busy !== null}
            onSelect={(e) => {
              e.preventDefault();
              handle(a.key);
            }}
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
