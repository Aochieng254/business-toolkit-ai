import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  component: () => (
    <ModulePlaceholder
      icon={Bot}
      title="AI Assistant"
      description="Your always-on business copilot."
    />
  ),
});
