import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/receipt")({
  component: () => (
    <ModulePlaceholder
      icon={Receipt}
      title="Receipt Generator"
      description="Instantly generate receipts for any transaction."
    />
  ),
});
