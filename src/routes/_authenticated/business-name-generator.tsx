import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/business-name-generator")({
  component: () => (
    <ModulePlaceholder
      icon={Sparkles}
      title="Business Name Generator"
      description="Brainstorm memorable brand names in seconds."
    />
  ),
});
