import { createFileRoute } from "@tanstack/react-router";
import { UserSquare2 } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/cv-builder")({
  component: () => (
    <ModulePlaceholder
      icon={UserSquare2}
      title="CV Builder"
      description="Craft a modern, AI-polished CV in minutes."
    />
  ),
});
