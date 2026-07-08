import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/cover-letter")({
  component: () => (
    <ModulePlaceholder
      icon={Mail}
      title="Cover Letter Generator"
      description="Tailored cover letters powered by AI."
    />
  ),
});
